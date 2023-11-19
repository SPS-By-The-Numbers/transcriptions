import path from 'path';
import { getDatabase, get, ref, child, onValue } from "firebase/database"
import { initializeApp } from "firebase/app";
import { readdir, readFile } from 'fs/promises';
import { Dirent, existsSync } from 'fs';
import { compareAsc, isEqual, parseISO, startOfDay } from 'date-fns';

const pathDateFormat = 'yyyy-MM-dd';

const firebaseConfig = {
  databaseURL: "https://sps-by-the-numbers-default-rtdb.firebaseio.com",
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const dbRoot = ref(database, '/transcripts');

export type VideoData = {
    metadata: any, // TODO: replace these with schema objects
    props: any,
    date: Date,
    transcriptionPath: string
}

function buildTranscriptFolderPath(category: string, id: string): string {
    return path.join(process.cwd(), 'data', 'transcripts', category, id[0]);
}

export async function getAllCategories(): Promise<string[]> {
    const result = (await get(dbRoot)).val();

    return Object.keys(result);
}

export async function getAllVideosForCategory(category: string): Promise<VideoData[]> {
    const prefixDirectoryEntries: Dirent[] = await readdir(
        path.join(process.cwd(), 'data', 'transcripts', category),
        {
            withFileTypes: true
        }
    );

    const prefixPaths: string[] = prefixDirectoryEntries
        .filter(entry => entry.isDirectory())
        .map(entry => path.join(entry.path, entry.name));

    const allVideos: VideoData[] = [];

    // Inspect directories sequentially to limit the number of concurrently open files
    for (const prefixPath of prefixPaths) {
        const metadataEntries: Dirent[] = await readdir(
            prefixPath,
            {
                withFileTypes: true
            }
        );

        // Files are usually videoId.mp4, videoId.json, videoId.metadata.json,
        // and optionally videoId.props.json.
        //
        // Look for videoId.json as that determines if the transcription is available.
        const videoIds: string[] = metadataEntries
            .filter(entry => entry.isFile())
            .filter(entry => entry.name.endsWith('.json'))
            .filter(entry => ! entry.name.endsWith('.metadata.json'))
            .map((entry: Dirent): string => entry.name.split('.')[0]);

        for (const videoId of videoIds) {
            const metadata: any = JSON.parse(
                await readFile(path.join(prefixPath, `${videoId}.metadata.json`), { encoding: 'utf8' }));

            let props: any;

            const propFilePath: string = path.join(prefixPath, `${videoId}.props.json`);
            if (existsSync(propFilePath)) {
                props = JSON.parse(
                    await readFile(path.join(prefixPath, `${videoId}.props.json`), { encoding: 'utf8' }));
            } else {
                props = {};
            }

            const date: Date = parseISO(props.date || metadata.publish_date);
            const transcriptionPath: string = path.join(prefixPath, `${videoId}.json`);

            const videoData: VideoData = {
                metadata,
                props,
                date,
                transcriptionPath
            };

            allVideos.push(videoData);
        }
    }

    return allVideos;
}

export async function getDatesForCategory(category: string): Promise<Date[]> {
    const result = (await get(dbRoot)).child(`${category}/index/date`).val();
    return Object.keys(result);
}

export async function getAllVideosForPublishDate(category: string, datePath: string): Promise<VideoData[]> {
    const result = (await get(dbRoot)).child(`${category}/index/date/${datePath}`).val();

    return Object.entries(result).map(([videoId, metadata]) => ({
      metadata,
      props: {},
      date: datePath,
      transcriptionPath: "hi"
    }));
}

export async function getVideoForDateAndId(category: string, date: Date, videoId: string): Promise<VideoData> {
    const allVideosForDate: VideoData[] = await getAllVideosForPublishDate(category, date);

    const video = allVideosForDate.find(video => video.metadata.video_id === videoId);
    if (!video) {
        throw `Missing video ${videoId}`;
    }

    return video;
}

export async function getTranscript(category: string, id: string): Promise<any> {
    const transcriptPath = path.join(buildTranscriptFolderPath(category, id), `${id}.json`);
    return await readFile(transcriptPath, { encoding: 'utf8' }).then(
        JSON.parse
    ).catch((err) => {
        if (err.code === 'ENOENT') {
            return { segments: [] };
        }
        else {
            return Promise.reject(err);
        }
    });
}

export async function getMetadata(category: string, id: string): Promise<any> {
    return (await get(dbRoot)).child(`${category}/metadata/${id}`).val();
}

export async function getSpeakerMapping(category: string, id: string): Promise<any> {
    const speakerPath: string = path.join(buildTranscriptFolderPath(category, id), `${id}.speakers.json`);

    // Not all transcripts are expected to be mapped, so handle missing files by returning an empty object
    if (!existsSync(speakerPath)) {
        return {};
    }

    return JSON.parse(await readFile(speakerPath, { encoding: 'utf8' }));
}
