import { addDays, timeToMinutes } from "../lib/date";
import { PRIORITY_RANK, taskEndTime } from "./task";
import type { Task } from "./task";

export type TaskView = "all" | "today" | "upcoming" | "overdue" | "completed";
export const TASK_VIEWS: readonly TaskView[] = ["all", "today", "upcoming", "overdue", "completed"];

export function isOverdue(task: Task, today: string): boolean {
  return !task.isDone && task.date !== null && task.date < today;
}

export function filterTasks(tasks: readonly Task[], view: TaskView, today: string): Task[] {
  switch (view) {
    case "all":
      return [...tasks];
    case "today":
      return tasks.filter((t) => t.date === today);
    case "upcoming":
      return tasks.filter((t) => !t.isDone && t.date !== null && t.date > today);
    case "overdue":
      return tasks.filter((t) => isOverdue(t, today));
    case "completed":
      return tasks.filter((t) => t.isDone);
  }
}

/**
 * Open tasks first, then by date (unscheduled last), start time (untimed last),
 * priority, and finally creation time so the order is stable.
 */
export function compareTasks(a: Task, b: Task): number {
  if (a.isDone !== b.isDone) return a.isDone ? 1 : -1;
  if (a.date !== b.date) {
    if (a.date === null) return 1;
    if (b.date === null) return -1;
    return a.date < b.date ? -1 : 1;
  }
  if (a.startTime !== b.startTime) {
    if (a.startTime === null) return 1;
    if (b.startTime === null) return -1;
    return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
  }
  const p = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  if (p !== 0) return p;
  return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
}

export function sortTasks(tasks: readonly Task[]): Task[] {
  return [...tasks].sort(compareTasks);
}

export interface TaskSection {
  /** "overdue" | "none" | a date key */
  key: string;
  data: Task[];
}

/** Groups tasks for the list: overdue first, then by day, then unscheduled. */
export function groupByDay(tasks: readonly Task[], today: string): TaskSection[] {
  const overdue: Task[] = [];
  const unscheduled: Task[] = [];
  const byDate = new Map<string, Task[]>();

  for (const task of sortTasks(tasks)) {
    if (isOverdue(task, today)) overdue.push(task);
    else if (task.date === null) unscheduled.push(task);
    else {
      const list = byDate.get(task.date) ?? [];
      list.push(task);
      byDate.set(task.date, list);
    }
  }

  const sections: TaskSection[] = [];
  if (overdue.length) sections.push({ key: "overdue", data: overdue });
  [...byDate.keys()].sort().forEach((key) => sections.push({ key, data: byDate.get(key)! }));
  if (unscheduled.length) sections.push({ key: "none", data: unscheduled });
  return sections;
}

export interface DaySummary {
  total: number;
  done: number;
  remaining: number;
  /** 0–100, rounded */
  percent: number;
}

export function daySummary(tasks: readonly Task[], day: string): DaySummary {
  const list = tasks.filter((t) => t.date === day);
  const done = list.filter((t) => t.isDone).length;
  const total = list.length;
  return {
    total,
    done,
    remaining: total - done,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
  };
}

export type NextUp =
  | { kind: "now"; task: Task } // happening right now
  | { kind: "later"; task: Task } // starts later today
  | { kind: "anytime"; task: Task } // open task today without a time
  | null;

/** What should the user do next today? */
export function nextUp(tasks: readonly Task[], today: string, nowMinutes: number): NextUp {
  const open = sortTasks(tasks.filter((t) => t.date === today && !t.isDone));

  for (const task of open) {
    if (task.startTime === null) continue;
    const start = timeToMinutes(task.startTime);
    const end = taskEndTime(task);
    const endMinutes = end === null ? start : timeToMinutes(end);
    // An end time "before" the start means it runs past midnight.
    const effectiveEnd = endMinutes < start ? 1440 : endMinutes;
    if (start <= nowMinutes && nowMinutes < effectiveEnd) return { kind: "now", task };
    if (start > nowMinutes) return { kind: "later", task };
  }

  const untimed = open.find((t) => t.startTime === null);
  return untimed ? { kind: "anytime", task: untimed } : null;
}

export function countByView(tasks: readonly Task[], today: string): Record<TaskView, number> {
  return {
    all: tasks.length,
    today: filterTasks(tasks, "today", today).length,
    upcoming: filterTasks(tasks, "upcoming", today).length,
    overdue: filterTasks(tasks, "overdue", today).length,
    completed: filterTasks(tasks, "completed", today).length,
  };
}

/** Convenience used by quick-date chips. */
export function quickDates(today: string) {
  return { today, tomorrow: addDays(today, 1), nextWeek: addDays(today, 7) };
}
