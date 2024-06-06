import { isAfter, isBefore } from "date-fns";
import { DatePicker } from "@mui/x-date-pickers";

export type DateRange = {
  start: Date | null,
  end: Date | null
};

export type DateRangePickerProps = {
  range: DateRange,
  onDateRangeChange: (range: DateRange) => void
};

export default function DateRangePicker({ range, onDateRangeChange }) {
  function handleStartChange(start: Date | null): void {
    let newRange: DateRange;

    if (start === null) {
      newRange = { ...range, start: null };
    }
    else if (range.end !== null && isAfter(start, range.end)) {
      newRange = { start, end: null };
    }
    else {
      newRange = { ...range, start };
    }

    onDateRangeChange(newRange);
  }

  function handleEndChange(end: Date | null): void {
    let newRange: DateRange;

    if (end === null) {
      newRange = { ...range, end: null };
    }
    else if (range.start !== null && isBefore(end, range.start)) {
      newRange = { start: null, end };
    }
    else {
      newRange = { ...range, end };
    }

    onDateRangeChange(newRange);
  }

  return <div className="flex flex-row space-x-5">
    <DatePicker label="Start Date" value={range.start} onChange={handleStartChange} />
    <DatePicker label="End Date" value={range.end} onChange={handleEndChange} />
  </div>;
}