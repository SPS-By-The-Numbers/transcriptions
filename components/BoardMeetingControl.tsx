'use client'

import Box from '@mui/material/Box';
import SpeakerInfoControl from './SpeakerInfoControl';
import TranscriptControl from './TranscriptControl';
import VideoPlayer, { VideoPlayerControl } from './VideoPlayer';
import { ReactNode, useRef } from 'react';

type BoardMeetingLayoutParams = {
  header: ReactNode,
  transcriptNode: ReactNode,
  errors: string[],
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
  errors,
  category,
  videoId,
  initialExistingNames,
  initialExistingTags,
  speakerNums
}: BoardMeetingLayoutParams): ReactNode {
  const { onTimeStampSelected } = useTranscriptContext();

  function handleTimeStampSelected(timeStamp: string): void {
    history.pushState(null, '', `#${timeStamp}`);
    if (onTimeStampSelected) {
      onTimeStampSelected(timeStamp);
    }
  }

  const errorPanel = errors.length === 0 ? undefined : (<div key="errors">{errors.map((e,i) => (<div key={i}>{e}</div>))}</div>)

  return (
    <>
        <Box>
          { header }
          <section className="p">
            <VideoPlayer videoId={videoId} />
            <SpeakerInfoControl
                className="c px-2 border border-2 border-black rounded"
                category={category}
                initialExistingNames={initialExistingNames}
                initialExistingTags={initialExistingTags}
                speakerNums={speakerNums}
                videoId={videoId} />
          </section>
          {errorPanel}
        </Box>
        <TranscriptControl onTimeStampSelected={handleTimeStampSelected}>
          { transcriptNode }
        </TranscriptControl>
    </>
  );
}
