/**
 * Import tasks from the original web app (Lessons/JS-Course2/to-do-list-project).
 *
 * That app keeps `[{ id, title, date, isDone }]` under the localStorage key "my-tasks".
 * A phone app can't read a browser's localStorage, so the user copies the JSON
 * (see README → "Bring over your old tasks") and pastes it into Settings → Import.
 *
 * Exports from this app (Settings → Export) can be pasted back in the same way.
 */
import { isValidDateKey } from "../lib/date";
import { isTask } from "./task";
import type { Task } from "./task";

export type ImportErrorCode = "empty" | "notJson" | "notArray";

export type ImportResult =
  | { ok: true; tasks: Task[]; skipped: number; duplicates: number }
  | { ok: false; error: ImportErrorCode };

interface LegacyTask {
  id: number | string;
  title: string;
  date: string;
  isDone: boolean;
}

function isLegacyTask(value: unknown): value is LegacyTask {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    (typeof v.id === "number" || typeof v.id === "string") &&
    typeof v.title === "string" &&
    v.title.trim() !== "" &&
    typeof v.date === "string" &&
    typeof v.isDone === "boolean"
  );
}

function fromLegacy(item: LegacyTask, now: Date): Task {
  const iso = now.toISOString();
  return {
    // Stable id, so importing the same data twice doesn't create duplicates.
    id: `legacy_${item.id}`,
    title: item.title.trim().slice(0, 120),
    notes: "",
    date: isValidDateKey(item.date) ? item.date : null,
    startTime: null,
    durationMin: null,
    priority: "medium",
    category: "personal",
    isDone: item.isDone,
    completedAt: item.isDone ? iso : null,
    createdAt: iso,
    updatedAt: iso,
  };
}

/** Accepts the old app's array, this app's export `{ tasks: [...] }`, or an array of tasks. */
export function parseImport(
  text: string,
  existing: readonly Task[],
  now: Date = new Date(),
): ImportResult {
  const trimmed = text.trim();
  if (trimmed === "") return { ok: false, error: "empty" };

  let data: unknown;
  try {
    data = JSON.parse(trimmed);
    // DevTools sometimes gives a quoted string: "\"[...]\"" — unwrap once.
    if (typeof data === "string") data = JSON.parse(data);
  } catch {
    return { ok: false, error: "notJson" };
  }

  if (typeof data === "object" && data !== null && !Array.isArray(data)) {
    data = (data as { tasks?: unknown }).tasks;
  }
  if (!Array.isArray(data)) return { ok: false, error: "notArray" };

  const known = new Set(existing.map((t) => t.id));
  const tasks: Task[] = [];
  let skipped = 0;
  let duplicates = 0;

  for (const item of data) {
    let task: Task | null = null;
    if (isTask(item)) task = item;
    else if (isLegacyTask(item)) task = fromLegacy(item, now);

    if (task === null) {
      skipped++;
    } else if (known.has(task.id)) {
      duplicates++;
    } else {
      known.add(task.id);
      tasks.push(task);
    }
  }

  return { ok: true, tasks, skipped, duplicates };
}
