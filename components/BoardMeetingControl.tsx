'use client'

import { ReactNode, useRef } from 'react';
import VideoPlayer, { VideoPlayerControl } from './VideoPlayer';
import SpeakerInfoControl from './SpeakerInfoControl';
import TranscriptControl from './TranscriptControl';

type BoardMeetingLayoutParams = {
  header: ReactNode,
  transcriptNode: ReactNode,
  category: string,
  videoId: string,
  initialExistingNames: object,
  initialExistingTags: Set<string>,
  speakerNums: Set<number>
};

// Client-side control for handling state/logic of the Board Meeting page.
// Server-rendered sections are passed in via the header and transcript
// properties. This allows layout and client-side logic to be handled in
// one place while having multiple parts of the page be pre-rendered on
// the server, and not just a single "children" section.
export default function BoardMeetingControl({
  header,
  transcriptNode,
  category,
  videoId,
  initialExistingNames,
  initialExistingTags,
  speakerNums
}: BoardMeetingLayoutParams): ReactNode {
  const videoPlayer = useRef<VideoPlayerControl | null>(null);

  function handleTimeStampSelected(timeStamp: string): void {
    history.pushState(null, '', `#${timeStamp}`);
    videoPlayer.current?.jumpToTime(timeStamp);
  }

  return (
    <>
        { header }
        <section className="p">
          <VideoPlayer
            videoId={videoId}
            ref={videoPlayer} />
          <SpeakerInfoControl
              className="c px-2 border border-2 border-black rounded"
              category={category}
              initialExistingNames={initialExistingNames}
              initialExistingTags={initialExistingTags}
              speakerNums={speakerNums}
              videoId={videoId} />
        </section>
        <TranscriptControl onTimeStampSelected={handleTimeStampSelected}>
          { transcriptNode }
        </TranscriptControl>
    </>
  );
}
