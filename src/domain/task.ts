import { isValidDateKey, isValidTime, timeToMinutes, minutesToTime } from "../lib/date";
import { createId } from "../lib/id";

export type Priority = "low" | "medium" | "high" | "urgent";
export const PRIORITIES: readonly Priority[] = ["low", "medium", "high", "urgent"];
export const PRIORITY_RANK: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

export type CategoryId = "personal" | "work" | "study" | "health" | "home";
export const CATEGORIES: readonly CategoryId[] = ["personal", "work", "study", "health", "home"];

export const DURATION_PRESETS: readonly number[] = [15, 30, 45, 60, 90, 120];

export const TITLE_MAX = 120;
export const NOTES_MAX = 1000;

export interface Task {
  id: string;
  title: string;
  notes: string;
  /** Local date "YYYY-MM-DD", or null for an unscheduled (inbox) task. */
  date: string | null;
  /** Local start time "HH:mm"; only meaningful when date is set. */
  startTime: string | null;
  /** Estimated duration in minutes. */
  durationMin: number | null;
  priority: Priority;
  category: CategoryId;
  /** Eisenhower matrix axes */
  important: boolean;
  urgent: boolean;
  isDone: boolean;
  completedAt: string | null; // ISO timestamp
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

/** What the editor submits. */
export interface TaskInput {
  title: string;
  notes: string;
  date: string | null;
  startTime: string | null;
  durationMin: number | null;
  priority: Priority;
  category: CategoryId;
  important: boolean;
  urgent: boolean;
}

export type TaskField = keyof TaskInput;
export type TaskErrors = Partial<Record<TaskField, string>>;

/** Error codes (translated in the UI). */
export const TASK_ERRORS = {
  titleRequired: "titleRequired",
  titleTooLong: "titleTooLong",
  notesTooLong: "notesTooLong",
  invalidDate: "invalidDate",
  invalidTime: "invalidTime",
  timeWithoutDate: "timeWithoutDate",
  invalidDuration: "invalidDuration",
  invalidPriority: "invalidPriority",
  invalidCategory: "invalidCategory",
} as const;

export function emptyTaskInput(defaults: Partial<TaskInput> = {}): TaskInput {
  return {
    title: "",
    notes: "",
    date: null,
    startTime: null,
    durationMin: null,
    priority: "medium",
    category: "personal",
    important: false,
    urgent: false,
    ...defaults,
  };
}

export function validateTaskInput(input: TaskInput): TaskErrors {
  const errors: TaskErrors = {};
  const title = input.title.trim();

  if (title === "") errors.title = TASK_ERRORS.titleRequired;
  else if (title.length > TITLE_MAX) errors.title = TASK_ERRORS.titleTooLong;

  if (input.notes.length > NOTES_MAX) errors.notes = TASK_ERRORS.notesTooLong;

  if (input.date !== null && !isValidDateKey(input.date)) errors.date = TASK_ERRORS.invalidDate;

  if (input.startTime !== null) {
    if (!isValidTime(input.startTime)) errors.startTime = TASK_ERRORS.invalidTime;
    else if (input.date === null) errors.startTime = TASK_ERRORS.timeWithoutDate;
  }

  if (
    input.durationMin !== null &&
    (!Number.isInteger(input.durationMin) || input.durationMin < 1 || input.durationMin > 1440)
  ) {
    errors.durationMin = TASK_ERRORS.invalidDuration;
  }

  if (!PRIORITIES.includes(input.priority)) errors.priority = TASK_ERRORS.invalidPriority;
  if (!CATEGORIES.includes(input.category)) errors.category = TASK_ERRORS.invalidCategory;

  return errors;
}

export function hasErrors(errors: TaskErrors): boolean {
  return Object.keys(errors).length > 0;
}

function normalize(input: TaskInput): TaskInput {
  return {
    ...input,
    title: input.title.trim(),
    notes: input.notes.trim(),
    // A start time without a date makes no sense; drop it rather than store junk.
    startTime: input.date === null ? null : input.startTime,
  };
}

export function createTask(input: TaskInput, now: Date = new Date()): Task {
  const iso = now.toISOString();
  return {
    id: createId(),
    ...normalize(input),
    isDone: false,
    completedAt: null,
    createdAt: iso,
    updatedAt: iso,
  };
}

export function applyTaskInput(task: Task, input: TaskInput, now: Date = new Date()): Task {
  return { ...task, ...normalize(input), updatedAt: now.toISOString() };
}

export function toggleTaskDone(task: Task, now: Date = new Date()): Task {
  const iso = now.toISOString();
  return {
    ...task,
    isDone: !task.isDone,
    completedAt: task.isDone ? null : iso,
    updatedAt: iso,
  };
}

export function taskToInput(task: Task): TaskInput {
  const { title, notes, date, startTime, durationMin, priority, category, important, urgent } = task;
  return { title, notes, date, startTime, durationMin, priority, category, important, urgent };
}

/** End time "HH:mm" when both a start time and a duration are set. */
export function taskEndTime(task: Pick<Task, "startTime" | "durationMin">): string | null {
  if (task.startTime === null || task.durationMin === null) return null;
  return minutesToTime(timeToMinutes(task.startTime) + task.durationMin);
}

/**
 * Defensive check for data read from storage or imported files: anything that
 * doesn't look like a Task is dropped instead of crashing the app.
 */
export function isTask(value: unknown): value is Task {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.title === "string" &&
    typeof v.notes === "string" &&
    (v.date === null || (typeof v.date === "string" && isValidDateKey(v.date))) &&
    (v.startTime === null || (typeof v.startTime === "string" && isValidTime(v.startTime))) &&
    (v.durationMin === null || typeof v.durationMin === "number") &&
    PRIORITIES.includes(v.priority as Priority) &&
    CATEGORIES.includes(v.category as CategoryId) &&
    typeof v.important === "boolean" &&
    typeof v.urgent === "boolean" &&
    typeof v.isDone === "boolean" &&
    typeof v.createdAt === "string" &&
    typeof v.updatedAt === "string"
  );
}

/**
 * Brings tasks saved by older versions up to the current shape.
 * v1 tasks had no important/urgent flags: derive them from the priority
 * (urgent → both, high → important) so the matrix starts out sensible.
 */
export function upgradeTask(value: unknown): Task | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  const priority = v.priority as Priority;
  const candidate = {
    ...v,
    important: typeof v.important === "boolean" ? v.important : priority === "high" || priority === "urgent",
    urgent: typeof v.urgent === "boolean" ? v.urgent : priority === "urgent",
  };
  return isTask(candidate) ? candidate : null;
}
