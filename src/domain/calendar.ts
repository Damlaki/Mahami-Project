/**
 * Google Calendar-style views: the month grid, the days of a week, tasks
 * grouped per day, and where each timed task sits in the week's hour grid
 * (including placing overlapping tasks side by side).
 */
import { addDays, startOfMonth, startOfWeek, timeToMinutes } from "../lib/date";
import { PRIORITY_RANK } from "./task";
import type { Task } from "./task";

/** Weeks start on Monday, same as the timeline's week strip. */
export const WEEK_START = 1;

/** Short or zero-length tasks are still drawn this tall (in minutes) so they can be tapped. */
export const MIN_BLOCK_MIN = 30;

const MINUTES_PER_DAY = 1440;

/**
 * The weeks to show for the month containing `key`: each week is 7 date keys,
 * starting on `weekStart`, including the leading/trailing days of the
 * neighbouring months. Returns 4 to 6 weeks.
 */
export function monthGrid(key: string, weekStart = WEEK_START): string[][] {
  const first = startOfMonth(key);
  const month = first.slice(0, 7);
  const weeks: string[][] = [];
  let cursor = startOfWeek(first, weekStart);
  do {
    weeks.push(weekDays(cursor, weekStart));
    cursor = addDays(cursor, 7);
  } while (cursor.slice(0, 7) === month);
  return weeks;
}

/** The 7 date keys of the week containing `key`. */
export function weekDays(key: string, weekStart = WEEK_START): string[] {
  const start = startOfWeek(key, weekStart);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/**
 * Calendar order inside one day: tasks without a time first (like Google's
 * all-day events), then by start time, then priority, then creation time.
 * Done tasks keep their place so the calendar doesn't jump when ticking.
 */
export function compareForCalendar(a: Task, b: Task): number {
  if ((a.startTime === null) !== (b.startTime === null)) return a.startTime === null ? -1 : 1;
  if (a.startTime !== null && b.startTime !== null && a.startTime !== b.startTime) {
    return a.startTime < b.startTime ? -1 : 1; // "HH:mm" sorts correctly as text
  }
  const p = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  if (p !== 0) return p;
  return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
}

/** Scheduled tasks grouped by date key, each day in calendar order. */
export function tasksByDay(tasks: readonly Task[]): Map<string, Task[]> {
  const map = new Map<string, Task[]>();
  for (const task of tasks) {
    if (task.date === null) continue;
    const list = map.get(task.date);
    if (list) list.push(task);
    else map.set(task.date, [task]);
  }
  for (const list of map.values()) list.sort(compareForCalendar);
  return map;
}

export interface DayBlock {
  task: Task;
  /** Minutes since midnight */
  start: number;
  /** Drawn end: at least MIN_BLOCK_MIN after start, never past midnight */
  end: number;
  /** Column inside its group of overlapping tasks (0-based) */
  lane: number;
  /** How many columns that group needs; the block's width is 1 / lanes */
  lanes: number;
}

/**
 * Positions the timed tasks of one day for the week grid.
 *
 * Tasks that overlap (directly or through a chain) form a group. Inside a
 * group each task takes the first column that is free at its start time, and
 * every task in the group shares the group's column count, so they sit side
 * by side at equal widths, like Google Calendar.
 */
export function layoutDay(tasks: readonly Task[], day: string): DayBlock[] {
  const items = tasks
    .filter((t) => t.date === day && t.startTime !== null)
    .map((task) => {
      const start = timeToMinutes(task.startTime as string);
      const length = Math.max(task.durationMin ?? 0, MIN_BLOCK_MIN);
      return { task, start, end: Math.min(MINUTES_PER_DAY, start + length) };
    })
    // Earlier first; for equal starts the longer task goes on the left.
    .sort((a, b) => a.start - b.start || b.end - a.end);

  const result: DayBlock[] = [];
  let group: DayBlock[] = [];
  let laneEnds: number[] = []; // when each column of the current group frees up
  let groupEnd = -1;

  const closeGroup = () => {
    for (const block of group) block.lanes = laneEnds.length;
    result.push(...group);
    group = [];
    laneEnds = [];
  };

  for (const item of items) {
    if (group.length > 0 && item.start >= groupEnd) closeGroup();

    let lane = laneEnds.findIndex((end) => end <= item.start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(item.end);
    } else {
      laneEnds[lane] = item.end;
    }

    group.push({ ...item, lane, lanes: 1 });
    groupEnd = group.length === 1 ? item.end : Math.max(groupEnd, item.end);
  }
  closeGroup();

  return result;
}
