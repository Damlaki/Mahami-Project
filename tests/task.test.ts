import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyTaskInput,
  createTask,
  emptyTaskInput,
  isTask,
  taskEndTime,
  toggleTaskDone,
  validateTaskInput,
} from "../src/domain/task.ts";
import type { Task } from "../src/domain/task.ts";
import {
  countByView,
  daySummary,
  filterTasks,
  groupByDay,
  nextUp,
  sortTasks,
} from "../src/domain/selectors.ts";

const NOW = new Date(2026, 9, 28, 10, 0);
const TODAY = "2026-10-28";

function make(overrides: Partial<Task> = {}): Task {
  return { ...createTask(emptyTaskInput({ title: "x" }), NOW), ...overrides };
}

test("validation catches bad input", () => {
  assert.deepEqual(validateTaskInput(emptyTaskInput({ title: "Read" })), {});
  assert.equal(validateTaskInput(emptyTaskInput({ title: "   " })).title, "titleRequired");
  assert.equal(validateTaskInput(emptyTaskInput({ title: "a".repeat(121) })).title, "titleTooLong");
  assert.equal(validateTaskInput(emptyTaskInput({ title: "a", date: "2026-13-01" })).date, "invalidDate");
  assert.equal(
    validateTaskInput(emptyTaskInput({ title: "a", startTime: "09:00" })).startTime,
    "timeWithoutDate",
  );
  assert.equal(
    validateTaskInput(emptyTaskInput({ title: "a", durationMin: 0 })).durationMin,
    "invalidDuration",
  );
});

test("create trims text and drops a time with no date", () => {
  const t = createTask(emptyTaskInput({ title: "  Gym  ", startTime: "09:00" }), NOW);
  assert.equal(t.title, "Gym");
  assert.equal(t.startTime, null);
  assert.equal(t.isDone, false);
  assert.ok(isTask(t));
});

test("toggle records and clears completion time", () => {
  const done = toggleTaskDone(make(), NOW);
  assert.equal(done.isDone, true);
  assert.equal(done.completedAt, NOW.toISOString());
  const undone = toggleTaskDone(done, NOW);
  assert.equal(undone.isDone, false);
  assert.equal(undone.completedAt, null);
});

test("edit keeps id and createdAt", () => {
  const t = make();
  const later = new Date(NOW.getTime() + 60_000);
  const edited = applyTaskInput(t, emptyTaskInput({ title: "New" }), later);
  assert.equal(edited.id, t.id);
  assert.equal(edited.createdAt, t.createdAt);
  assert.equal(edited.title, "New");
  assert.equal(edited.updatedAt, later.toISOString());
});

test("end time wraps past midnight", () => {
  assert.equal(taskEndTime({ startTime: "23:30", durationMin: 60 }), "00:30");
  assert.equal(taskEndTime({ startTime: "09:00", durationMin: null }), null);
});

test("views", () => {
  const tasks = [
    make({ id: "a", date: "2026-10-27" }), // overdue
    make({ id: "b", date: TODAY }),
    make({ id: "c", date: "2026-10-30" }), // upcoming
    make({ id: "d", date: "2026-10-20", isDone: true }), // completed, not overdue
    make({ id: "e", date: null }),
  ];
  const ids = (list: Task[]) => list.map((t) => t.id).sort();
  assert.deepEqual(ids(filterTasks(tasks, "overdue", TODAY)), ["a"]);
  assert.deepEqual(ids(filterTasks(tasks, "today", TODAY)), ["b"]);
  assert.deepEqual(ids(filterTasks(tasks, "upcoming", TODAY)), ["c"]);
  assert.deepEqual(ids(filterTasks(tasks, "completed", TODAY)), ["d"]);
  assert.deepEqual(countByView(tasks, TODAY), { all: 5, today: 1, upcoming: 1, overdue: 1, completed: 1 });
});

test("sorting: open first, then date, time, priority", () => {
  const tasks = [
    make({ id: "done", date: TODAY, isDone: true }),
    make({ id: "noDate", date: null }),
    make({ id: "late", date: TODAY, startTime: "18:00" }),
    make({ id: "early", date: TODAY, startTime: "07:00" }),
    make({ id: "untimedUrgent", date: TODAY, priority: "urgent" }),
    make({ id: "untimedLow", date: TODAY, priority: "low" }),
  ];
  assert.deepEqual(
    sortTasks(tasks).map((t) => t.id),
    ["early", "late", "untimedUrgent", "untimedLow", "noDate", "done"],
  );
});

test("groupByDay puts overdue first and unscheduled last", () => {
  const sections = groupByDay(
    [make({ date: null }), make({ date: "2026-10-30" }), make({ date: TODAY }), make({ date: "2026-10-01" })],
    TODAY,
  );
  assert.deepEqual(
    sections.map((s) => s.key),
    ["overdue", TODAY, "2026-10-30", "none"],
  );
});

test("day summary", () => {
  const tasks = [make({ date: TODAY, isDone: true }), make({ date: TODAY }), make({ date: TODAY }), make()];
  assert.deepEqual(daySummary(tasks, TODAY), { total: 3, done: 1, remaining: 2, percent: 33 });
  assert.deepEqual(daySummary([], TODAY), { total: 0, done: 0, remaining: 0, percent: 0 });
});

test("next up: current, then later, then anytime", () => {
  const breakfast = make({ id: "breakfast", date: TODAY, startTime: "09:30", durationMin: 60 });
  const meeting = make({ id: "meeting", date: TODAY, startTime: "14:00" });
  const read = make({ id: "read", date: TODAY });
  const tasks = [breakfast, meeting, read];
  assert.deepEqual(nextUp(tasks, TODAY, 10 * 60), { kind: "now", task: breakfast });
  assert.deepEqual(nextUp(tasks, TODAY, 11 * 60), { kind: "later", task: meeting });
  assert.deepEqual(nextUp(tasks, TODAY, 15 * 60), { kind: "anytime", task: read });
  assert.equal(nextUp([], TODAY, 600), null);
});
