'use client'

import { ChangeEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { VideoData, getAllCategories, getAllVideosForDateRange } from '../utilities/metadata-utils';
import { formatDateForPath, getVideoPath, parseDateFromPath } from 'utilities/path-utils';
import { formatISO, isAfter, isBefore } from 'date-fns';
import DateRangePicker from 'components/DateRangePicker';
import TranscriptFilter, { TranscriptFilterSelection } from 'components/TranscriptFilter';

type DateSelection = {
  start: Date | null,
  end: Date | null
}

export default function Index() {
  const [category, updateCategory]: [string | null, any] =
    useState('sps-board');

  const [filters, updateFilters]: [TranscriptFilterSelection, any] = useState(
    {
      category: 'sps-board',
      dateRange: { start: parseDateFromPath('2024-03-01'), end: null }
    });

  function handleFilterChange(filters: TranscriptFilterSelection) {
    updateFilters(filters);
  }

  const [isLoading, setLoading] = useState(true);
  const [videos, setVideos]: [VideoData[], any] = useState([]);

  useEffect(() => {
    if (filters.category === null || (filters.dateRange.start === null && filters.dateRange.end === null)) {
      setVideos([]);
      return () => {};
    }

    let ignore = false;

    const startDateString = filters.dateRange.start !== null ? formatDateForPath(filters.dateRange.start) : null;
    const endDateString = filters.dateRange.end !== null ? formatDateForPath(filters.dateRange.end) : null;

    getAllVideosForDateRange(category, startDateString, endDateString)
      .then(videoData => {
        if (!ignore) {
          setLoading(false);
          setVideos(videoData);
        }
      });

      return () => {
        ignore = true;
      }
  }, [filters])

  const videoLinks: React.ReactNode[] = videos.map(
    video => (
      <li key={video.videoId} className="mx-3 list-disc">
        <Link href={getVideoPath(category, video.videoId)}>
          {video.title}
        </Link>
      </li>
    ));

  const resultsSection: React.ReactNode = isLoading ?
    <h2>Loading</h2> :
    <>
      <h2 className="my-4 text-lg">
        Transcripts:
      </h2>
      <ul className="flex flex-col flex-wrap h-screen">
        {videoLinks}
      </ul>
    </>

  return (
    <main className="mx-5 my-5">
      <TranscriptFilter selection={filters} onFilterChange={handleFilterChange} />
      <section>
        {resultsSection}
      </section>
    </main>
  );
}
