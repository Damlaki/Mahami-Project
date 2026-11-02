/**
 * Builds the Structured-style day timeline: timed tasks in order, the free
 * time between them, conflicts, and where "now" falls.
 */
import { timeToMinutes } from "../lib/date";
import { sortTasks } from "./selectors";
import type { Task } from "./task";

/** Tasks without a duration still get a visible block of this length. */
export const DEFAULT_BLOCK_MIN = 15;
/** Gaps shorter than this aren't worth showing as "free time". */
export const MIN_GAP_MIN = 15;

export type TimelineEntry =
  | {
      kind: "task";
      task: Task;
      start: number; // minutes since midnight
      end: number; // exclusive; may exceed 1440 if it runs past midnight
      /** Starts before the previous task has ended */
      conflict: boolean;
    }
  | { kind: "gap"; start: number; end: number }
  | { kind: "now"; at: number };

export interface DayTimeline {
  entries: TimelineEntry[];
  /** Tasks on this day without a start time */
  anytime: Task[];
}

/**
 * @param nowMinutes minutes since midnight when `day` is today, otherwise null
 */
export function buildTimeline(tasks: readonly Task[], day: string, nowMinutes: number | null): DayTimeline {
  const ofDay = sortTasks(tasks.filter((t) => t.date === day));
  const anytime = ofDay.filter((t) => t.startTime === null);

  const timed = ofDay
    .filter((t) => t.startTime !== null)
    .map((task) => {
      const start = timeToMinutes(task.startTime as string);
      return { task, start, end: start + (task.durationMin ?? 0) };
    })
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const entries: TimelineEntry[] = [];
  let latestEnd = -1;
  let nowPlaced = nowMinutes === null;

  const placeNow = (beforeMinute: number) => {
    if (!nowPlaced && nowMinutes !== null && nowMinutes < beforeMinute) {
      entries.push({ kind: "now", at: nowMinutes });
      nowPlaced = true;
    }
  };

  for (const item of timed) {
    if (latestEnd >= 0 && item.start - latestEnd >= MIN_GAP_MIN) {
      // "now" inside a free gap splits it, so the marker sits where it belongs
      if (!nowPlaced && nowMinutes !== null && nowMinutes > latestEnd && nowMinutes < item.start) {
        entries.push({ kind: "gap", start: latestEnd, end: nowMinutes });
        entries.push({ kind: "now", at: nowMinutes });
        nowPlaced = true;
        if (item.start - nowMinutes >= MIN_GAP_MIN) entries.push({ kind: "gap", start: nowMinutes, end: item.start });
      } else {
        placeNow(latestEnd);
        entries.push({ kind: "gap", start: latestEnd, end: item.start });
      }
    }
    placeNow(item.start);
    entries.push({ kind: "task", ...item, conflict: latestEnd > item.start });
    latestEnd = Math.max(latestEnd, item.end);
  }

  if (!nowPlaced && nowMinutes !== null) entries.push({ kind: "now", at: nowMinutes });
  return { entries, anytime };
}

/** "1h 30m" style label parts for durations. */
export function splitDuration(minutes: number): { h: number; m: number } {
  return { h: Math.floor(minutes / 60), m: minutes % 60 };
}

/** Status of a task block relative to now (for dimming past items). */
export function blockStatus(start: number, end: number, nowMinutes: number | null): "past" | "current" | "upcoming" {
  if (nowMinutes === null) return "upcoming";
  const effectiveEnd = Math.max(end, start + 1);
  if (nowMinutes >= effectiveEnd) return "past";
  if (nowMinutes >= start) return "current";
  return "upcoming";
}
