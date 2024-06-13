'use client'

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { compareDesc, isValid } from 'date-fns';

import TranscriptFilter, { TranscriptFilterSelection, DateRange } from 'components/TranscriptFilter';
import { VideoData, getAllVideosForDateRange } from 'utilities/metadata-utils';
import { formatDateForPath, getVideoPath, parseDateFromPath } from 'utilities/path-utils';
import LoadingSpinner from 'components/LoadingSpinner';

type Props = {
  allCategories: string[],
  defaultFilters: TranscriptFilterSelection
};

export default function Transcripts({ allCategories, defaultFilters}: Props) {
  const { filterParams, updateFilterParams } = useFilterParams(allCategories, defaultFilters);
  const [filters, updateFilters]: [TranscriptFilterSelection, any] = useState(filterParams);
  const { videos, isLoading } = useFilteredVideos(filters);

  function handleFilterChange(filters: TranscriptFilterSelection) {
    updateFilters(filters);
    updateFilterParams(filters);
  }

  const videoLinks: React.ReactNode[] = videos
    .sort((a, b) => compareDesc(a.publishDate, b.publishDate))
    .map(video => (
      <li key={video.videoId} className="mx-3 list-disc">
        <Link href={getVideoPath(filters.category, video.videoId)}>
          {video.title}
        </Link>
      </li>
    ));

  const loadingSection =  <section className="my-4 flex flex-row">
    <LoadingSpinner />
  </section>

  const resultsSection: React.ReactNode = <section>
    <h2 className="my-4 text-lg">
      Transcripts:
    </h2>
    <ul className="flex flex-col flex-wrap h-screen">
      {videoLinks}
    </ul>
  </section>;

  return (
    <>
      <TranscriptFilter selection={filters} onFilterChange={handleFilterChange} />
      {isLoading ? loadingSection : resultsSection}
    </>
  );
}

function useFilterParams(allCategories: string[], defaultFilter: TranscriptFilterSelection): {
   filterParams: TranscriptFilterSelection,
   updateFilterParams: (newFilters: TranscriptFilterSelection) => void
} {
  const searchParams: URLSearchParams = useSearchParams();
  const pathName: string = usePathname();
  const { push } = useRouter();

  const filterParams: TranscriptFilterSelection = {
    category: getCategoryFromParams(searchParams, allCategories, defaultFilter.category),
    dateRange: getDateRangeFromParams(searchParams, defaultFilter.dateRange),
  };

  const updateFilterParams = (newFilters: TranscriptFilterSelection) => {
    push(buildUrl(pathName, newFilters), { scroll: false });
  }

  return {
    filterParams,
    updateFilterParams
  };
}

function useFilteredVideos(filters: TranscriptFilterSelection): {
  videos: VideoData[], isLoading: boolean
} {
  const [isLoading, setLoading] = useState(true);
  const [videos, setVideos]: [VideoData[], any] = useState([]);

  useEffect(() => {
    if (filters.dateRange.start === null && filters.dateRange.end === null) {
      setVideos([]);
      return () => {};
    }

    const startDateString = filters.dateRange.start !== null ? formatDateForPath(filters.dateRange.start) : null;
    const endDateString = filters.dateRange.end !== null ? formatDateForPath(filters.dateRange.end) : null;

    let ignore = false;

    async function fetchVideos() {
      const videoData = await getAllVideosForDateRange(filters.category, startDateString, endDateString);

      if (ignore) {
        return;
      }

      setLoading(false);
      setVideos(videoData);
    }

    fetchVideos();

    return () => {
      ignore = true;
    }
  }, [filters])

  return { videos, isLoading };
}

function getCategoryFromParams(params: URLSearchParams, allCategories: string[], defaultCategory: string): string {
  const categoryParam: string | null = params.get('category');

  if (categoryParam !== null && allCategories.includes(categoryParam)) {
    return categoryParam;
  }

  return defaultCategory;
}

function getDateRangeFromParams(params: URLSearchParams, defaultRange: DateRange): DateRange {
  const start: Date | null = getDateFromParams(params, 'start');
  const end: Date | null = getDateFromParams(params, 'end');

  if (start === null && end === null) {
    return defaultRange;
  }

  return { start, end };
}

function getDateFromParams(params: URLSearchParams, key: string): Date | null {
  const param: string | null = params.get(key);
  if (param === null) {
    return null;
  }

  const date: Date = parseDateFromPath(param);

  if (!isValid(date)) {
    return null;
  }

  return date;
}

function buildUrl(basePath: string, filterParams: TranscriptFilterSelection): string {
  const parameters: string[] = [
    filterParams.category && `category=${filterParams.category}`,
    filterParams.dateRange.start && `start=${formatDateForPath(filterParams.dateRange.start)}`,
    filterParams.dateRange.end && `end=${formatDateForPath(filterParams.dateRange.end)}`
  ].filter(param => param !== null) as string[];

  let urlString = basePath;

  const paramString = parameters.join('&');
  if (paramString !== null && paramString !== '') {
    urlString += `?${paramString}`;
  }

  return urlString;
}