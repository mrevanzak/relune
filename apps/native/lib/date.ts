import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import isToday from "dayjs/plugin/isToday";
import isYesterday from "dayjs/plugin/isYesterday";

dayjs.extend(duration);
dayjs.extend(isToday);
dayjs.extend(isYesterday);

type DateInput = Date | string;

/**
 * Format duration in seconds to "MM:SS" (zero-padded)
 */
export function formatDuration(
  seconds: number | null | undefined
): string | null {
  if (seconds == null) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/**
 * Format duration in milliseconds to "MM:SS" (zero-padded)
 */
export function formatDurationMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/**
 * Format date for list display: "Today, 2:30 PM" / "Yesterday, 2:30 PM" / "Dec 27"
 */
export function formatRelativeDate(date: DateInput): string {
  const d = dayjs(date);
  const time = d.format("h:mm A");

  if (d.isToday()) return `Today, ${time}`;
  if (d.isYesterday()) return `Yesterday, ${time}`;
  return d.format("MMM D");
}

/**
 * Format full datetime: "Dec 27, 2:30 PM"
 */
export function formatDateTime(date: DateInput): string {
  return dayjs(date).format("MMM D, h:mm A");
}

/**
 * Generate default title for a recording
 */
export function generateRecordingTitle(recordedAt: DateInput): string {
  return `Recording — ${dayjs(recordedAt).format("MMM D")}`;
}

/**
 * Check if date is today
 */
export function isDateToday(date: DateInput): boolean {
  return dayjs(date).isToday();
}

/**
 * Check if date is within the last 7 days
 */
export function isDateThisWeek(date: DateInput): boolean {
  const d = dayjs(date);
  const weekAgo = dayjs().subtract(7, "day").startOf("day");
  const endOfToday = dayjs().endOf("day");
  return d.isAfter(weekAgo) && d.isBefore(endOfToday);
}
