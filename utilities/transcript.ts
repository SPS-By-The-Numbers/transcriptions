import * as Storage from "firebase/storage"
import { app } from 'utilities/firebase'
import { toSpeakerNum } from 'utilities/speaker-info'

// The WhisperX json data is very verbose and contains redundant information
// which bloats the size of the transcript compared to raw words by over 10x.
//
// It must be reduced before passing into React props otherwise there will
// be a LOT of unecessary download to the client.
export type WhisperXWordData = {
  word: string;
  start: number;
  end: number;
  score: number;
  speaker: string;
};

export type WhisperXSegmentData = {
  start: number;
  end: number;
  text: string;
  speaker: string;
  words: WhisperXWordData[];
};

export type WhisperXTranscriptData = {
  segments : WhisperXSegmentData[];
  language : string;
};

export type SegmentData = {
  speakerNum: number;  // The speaker number.

  // Parallel arrays for words and the start timestamps of each word.
  // It is possible for starts timestamps to have nulls if no start time was recorded.
  // Arrays are in timestamp order.
  words: string[];
  starts: number[];
};

export type TranscriptData = {
  segments : SegmentData[];
  language : string;
};

function makeTranscriptsPath(category: string, id: string, language:string): string {
  return `/transcripts/public/${category}/json/${id}.${language}.json`;
}

export async function getTranscript(category: string, id: string, language: string,
    mergeSpeaker: boolean, wordTimes: boolean): Promise<TranscriptData> {
  try {
    const transcriptsPath = makeTranscriptsPath(category, id, language);
    const fileRef = Storage.ref(Storage.getStorage(), transcriptsPath);
    const whisperXTranscript : WhisperXTranscriptData =
        JSON.parse(new TextDecoder().decode(await Storage.getBytes(fileRef)));

    const { segments } = whisperXTranscript.segments.reduce(
      (acc, s) => {
        const speakerNum = toSpeakerNum(s.speaker);
        const words : string[] = [];
        const starts : number[] = [];

        if (wordTimes) {
          let lastStart : number = s.words[0].start || 0;
          for (const w of s.words) {
            words.push(w.word);
            lastStart = w.start || lastStart;
            starts.push(lastStart);
          }
        } else {
          words.push(s.text);
          starts.push(s.start);
        }

        // Merge speaker
        if (mergeSpeaker && acc.lastSpeaker === speakerNum) {
          const segment : SegmentData = acc.segments.at(-1) as SegmentData;
          segment?.words.push(...words);
          segment?.starts.push(...starts);
        } else {
          acc.segments.push({speakerNum, words, starts});
          acc.lastSpeaker = speakerNum;
        }

        return acc;
      },
      {
        lastSpeaker: <number | undefined> undefined,
        segments: <SegmentData[]> [],
      }
    );

    return {segments, language};
  } catch (e) {
    console.error(e);
  }

  return { segments: [], language };
}

export function toHhmmss(seconds: number) {
  return new Date(seconds * 1000).toISOString().slice(11, 19);
}

export function fromHhmmss(hhmmss: string): number {
    const parts = hhmmss.split(':');
    return Number(parts[2]) + (Number(parts[1]) * 60) + (Number(parts[0]) * 60 * 60);
}
