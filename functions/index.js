'use strict';

const _ = require('lodash');
const { parseISO, format } = require('date-fns');

const { onRequest } = require("firebase-functions/v2/https");

const admin = require("firebase-admin");
const { getStorage } = require("firebase-admin/storage");

const pathDateFormat = 'yyyy-MM-dd';

// Global intialization for process.
admin.initializeApp();

function getCategoryPublicDb(category) {
  return admin.database().ref(`/transcripts/public/${category}`);
}

function getCategoryPrivateDb(category) {
  return admin.database().ref(`/transcripts/private/${category}`);
}

function makeResponseJson(ok, message, data = {}) {
  return { ok, message, data };
}

function basename(path) {
  return path.split('/').pop();
}

async function regenerateMetadata(category, limit) {
  const bucket = getStorage().bucket('sps-by-the-numbers.appspot.com');
  const options = {
    prefix: `transcripts/public/${category}/metadata/`,
    matchGlob: "**.metadata.json",
    delimiter: "/",
  };

  const dbRoot = admin.database().ref(`/transcripts/${category}`);

  const [files] = await bucket.getFiles(options);
  console.log(`found ${files.length}`);
  let n = 0;
  let outstanding = [];
  for (const file of files) {
    if (limit && n > limit) {
      break;
    }
    n = n+1;

    outstanding.push((new Response(file.createReadStream())).json().then(async (metadata) => {
      const publishDate = parseISO(metadata.publish_date);
      const indexRef = dbRoot.child(`index/date/${format(publishDate, pathDateFormat)}/${metadata.video_id}`);
      outstanding.push(indexRef.set(metadata));
      const metadataRef = dbRoot.child(`metadata/${metadata.video_id}`);
      outstanding.push(metadataRef.set(metadata));
    }));

    // Concurrency limit.
    if (outstanding.length > 25) {
      await Promise.allSettled(outstanding);
      outstanding = [];
    }
  }
}

async function migrate(category, limit) {
  const bucket = getStorage().bucket('sps-by-the-numbers.appspot.com');
  const options = {
    prefix: `transcription/${category}`
  };

  const [files] = await bucket.getFiles(options);

  console.log("Starting for files: " + files.length);
  let n = 0;
  let outstanding = [];
  let numMetadata = 0;
  for (const file of files) {
    if (limit && n > limit) {
      break;
    }
    n = n+1;
//    console.log(`processing ${file.name}`);

    const origBasename = basename(file.name);
    const videoId = origBasename.split('.')[0];
    const makeDest = (type, videoId, suffix) => {
      return bucket.file(`transcripts/public/${category}/${type}/${videoId}.${suffix}`);
    }
    let dest = undefined;
    if (origBasename.endsWith('.metadata.json')) {
      numMetadata = numMetadata+1;
      dest = makeDest('metadata', videoId, 'metadata.json');
    } else if (origBasename.endsWith('.json')) {
      dest = makeDest('json', videoId, 'en.json');
    } else if (origBasename.endsWith('.vtt')) {
      dest = makeDest('vtt', videoId, 'en.vtt');
    } else if (origBasename.endsWith('.srt')) {
      dest = makeDest('srt', videoId, 'en.srt');
    } else if (origBasename.endsWith('.txt')) {
      dest = makeDest('txt', videoId, 'en.txt');
    } else if (origBasename.endsWith('.tsv')) {
      dest = makeDest('tsv', videoId, 'en.tsv');
    }
    if (dest) {
      let shouldSkip = false;
      outstanding.push(dest.exists()
        .then(([exists]) => shouldSkip = exists)
        .finally(async () => {
            if (!shouldSkip) {
              console.log(`copy ${file.name} to ${dest.name}`);
              await file.copy(dest, { predefinedAcl: 'publicRead' });
            }
          })
        .catch(console.error));
    }

    // Concurrency limit.
    if (outstanding.length > 25) {
      await Promise.allSettled(outstanding);
      outstanding = [];
    }
  }
  console.log('numMetadata', numMetadata);
  await Promise.allSettled(outstanding);
}

// POST to speaker info with JSON body of type:
// {
//    "videoId": "abcd",
//    "speakerInfo": { "SPEAKER_00": { "name": "some name", "tags": [ "parent", "ptsa" ] }
// }
exports.speakerinfo = onRequest(
  { cors: true, region: ["us-west1"] },
  async (req, res) => {
    if (req.method !== 'POST') {
       return res.status(400).send(makeResponseJson(false, "Expects POST"));
    }

    // Check request to ensure it looks like valid JSON request.
    if (req.headers['content-type'] !== 'application/json') {
       return res.status(400).send(makeResponseJson(false, "Expects JSON"));
    }

    let decodedIdToken = null;
    try {
      decodedIdToken = await admin.auth().verifyIdToken(req.body?.auth);
    } catch (error) {
      return res.status(400).send(makeResponseJson(false, "Did you forget to login?"));
    }

    const category = req.body?.category;
    if (!category || category.length > 20) {
      return res.status(400).send(makeResponseJson(false, "Invalid Category"));
    }

    const videoId = req.body?.videoId;
    if (!videoId || videoId.length > 12) {
       if (Buffer.from(videoId, 'base64').toString('base64') !== videoId) {
         return res.status(400).send(makeResponseJson(false, "Invalid VideoID"));
       }
    }

    const speakerInfo = req.body?.speakerInfo;
    if (!speakerInfo) {
      return res.status(400).send(makeResponseJson(false, "Expect speakerInfo"));
    }

    // Validate request structure.
    const allTags = new Set();
    const allNames = new Set();
    const recentTagsForName = {};
    for (const info of Object.values(speakerInfo)) {
      const name = info.name;
      if (name) {
        allNames.add(name);
      }

      const tags = info.tags;
      if (tags) {
        if (!Array.isArray(tags)) {
          return res.status(400).send(makeResponseJson(false, "Expect tags to be an array"));
        }
        if (name) {
          recentTagsForName[name] = [...(new Set(tags))];
        }
        for (const tag of tags) {
          if (typeof(tag) !== 'string') {
            return res.status(400).send(makeResponseJson(false, "Expect tags to be strings"));
          }
          allTags.add(tag);
        }
      }
    }

    // Write audit log.
    try {
      const dbRoot = admin.database().ref(`/transcripts/${category}`);
      if ((await dbRoot.child('<enabled>').once('value')).val() !== 1) {
        return res.status(400).send(makeResponseJson(false, "Invalid Category"));
      }

      // Timestamp to close enough for txn id. Do not use PII as it is
      // by public.
      const txnId = `${(new Date).toISOString().split('.')[0]}Z`;
      const auditRef = dbRoot.child(`audit/${txnId}`);
      auditRef.set({
        name: 'speakerinfo POST',
        headers: req.headers,
        body: req.body,
        email: decodedIdToken.email,
        emailVerified: decodedIdToken.email_verified,
        uid: decodedIdToken.uid
        });

      const videoRef = dbRoot.child(`v/${videoId}/speakerInfo`);
      videoRef.set(speakerInfo);

      // Update the database stuff.
      const existingRef = dbRoot.child('existing');
      const existingOptions = (await existingRef.once('value')).val();

      // Add new tags.
      let existingOptionsUpdated = false;
      for (const name of allNames) {
        const recentTags = recentTagsForName[name];
        if (!Object.prototype.hasOwnProperty.call(existingOptions.names, name) ||
            (recentTags && !_.isEqual(existingOptions.names[name].recentTags, recentTags))) {
          existingOptions.names[name] = {txnId, recentTags: recentTags || []};
          existingOptionsUpdated = true;
        }
      }
      for (const tag of allTags) {
        if (!Object.prototype.hasOwnProperty.call(existingOptions.tags, tag)) {
          existingOptions.tags[tag] = txnId;
          existingOptionsUpdated = true;
        }
      }
      if (existingOptionsUpdated) {
        existingRef.set(existingOptions);
      }

      res.status(200).send(makeResponseJson(true, "success",
            { speakerInfo,
              existingTags: Object.keys(existingOptions.tags),
              existingNames: Object.keys(existingOptions.names)}));

    } catch(e) {
      console.error("Updating DB failed with: ", e);
      return res.status(500).send(makeResponseJson(false, "Internal error"));
    }
  }
);

exports.metadata = onRequest(
  { cors: true, region: ["us-west1"] },
  async (req, res) => {
    if (req.method !== 'POST') {
       return res.status(400).send(makeResponseJson(false, "Expects POST"));
    }

    // Check request to ensure it looks like valid JSON request.
    if (req.headers['content-type'] !== 'application/json') {
       return res.status(400).send(makeResponseJson(false, "Expects JSON"));
    }

    if (!req.body.category) {
      return res.status(400).send(makeResponseJson(false, "Expects category"));
    }

    if (req.body?.cmd === "regenerateMetadata") {
      try {
        await regenerateMetadata(req.body.category, req.body.limit);
      } catch (e) {
        console.error(e);
        return res.status(500).send(makeResponseJson(false, "Exception"));
      }
      return res.status(200).send(makeResponseJson(true, "done"));
    } else if (req.body?.cmd === "migrate") {
      try {
        await migrate(req.body.category, req.body.limit);
      } catch (e) {
        console.error(e);
        return res.status(500).send(makeResponseJson(false, "Exception"));
      }
      return res.status(200).send(makeResponseJson(true, "done"));
    } else if (req.body?.cmd === "set") {
      const category_public = getCategoryPublicDb(req.body.category);
      if (!req.body?.metadata || !Object.keys(req.body.metadata).length) {
        return res.status(400).send(makeResponseJson(false, "missing metadata"));
      }
      category_public.child('metadata').update(req.body.metadata);

      // Add to the index.
      for (const [vid, info] of Object.entries(req.body.metadata)) {
         const published = new Date(info.publish_date).toISOString().split('T')[0];
         category_public.child('index').child('date').child(published)
             .child(vid).set(info);
      }
      return res.status(200).send(
          makeResponseJson(
              true,
              `Added metadata for ${Object.keys(req.body.metadata)}`));
    }

    return res.status(400).send("Unknown command");
  }
);

exports.process_vids = onRequest(
  { cors: true, region: ["us-west1"] },
  async (req, res) => {
    if (req.method !== 'GET') {
       return res.status(400).send(makeResponseJson(false, "Expects GET"));
    }

    const category = req.query.category;
    if (!category || category.length > 20) {
      return res.status(400).send(makeResponseJson(false, "Invalid Category"));
    }

    if (!req.query.vids) {
       return res.status(400).send(makeResponseJson(false, "Expects vids"));
    }

    const public_category_ref = getCategoryPublicDb(category);
    const metadata_snapshot = await public_category_ref.child('metadata').once("value");

    const add_ts = new Date();
    const new_video_ids = {};
    for (const vid of req.query.vids) {
      if (!metadata_snapshot.child(vid).exists()) {
        console.log(metadata_snapshot.val());
        new_video_ids[vid] =  { add: add_ts, start: null, instance: null };
      }
    }
    getCategoryPrivateDb(category).child('new_vids').update(new_video_ids);

    return res.status(200).send(makeResponseJson(true, "vids enqueued", new_video_ids));
  }
);
