import { test } from "node:test";
import assert from "node:assert/strict";
import { createTask, emptyTaskInput } from "../src/domain/task.ts";
import type { Task } from "../src/domain/task.ts";
import { layoutDay, monthGrid, tasksByDay, weekDays } from "../src/domain/calendar.ts";
import { addMonths, formatHourLabel, isSameMonth, startOfMonth } from "../src/lib/date.ts";

const NOW = new Date(2026, 10, 20, 10, 0);
const DAY = "2026-11-20";
const make = (o: Partial<Task>): Task => ({ ...createTask(emptyTaskInput({ title: "x" }), NOW), ...o });

test("month helpers", () => {
  assert.equal(startOfMonth("2026-11-20"), "2026-11-01");
  assert.equal(addMonths("2026-11-20", 1), "2026-12-20");
  assert.equal(addMonths("2026-12-15", 1), "2027-01-15");
  assert.equal(addMonths("2026-01-15", -1), "2025-12-15");
  // the day is clamped instead of rolling into the next month
  assert.equal(addMonths("2026-01-31", 1), "2026-02-28");
  assert.equal(addMonths("2026-03-31", -1), "2026-02-28");
  assert.equal(addMonths("2028-01-31", 1), "2028-02-29");
  assert.ok(isSameMonth("2026-11-01", "2026-11-30"));
  assert.ok(!isSameMonth("2026-11-30", "2026-12-01"));
});

test("hour labels", () => {
  assert.equal(formatHourLabel(9, "24h", "en"), "09:00");
  assert.equal(formatHourLabel(0, "12h", "en"), "12 AM");
  assert.equal(formatHourLabel(13, "12h", "en"), "1 PM");
  assert.equal(formatHourLabel(12, "12h", "ar"), "12 م");
});

test("month grid starts on Monday and covers the whole month", () => {
  // 1 Nov 2026 is a Sunday, 30 Nov a Monday: 6 rows
  const nov = monthGrid("2026-11-20");
  assert.equal(nov.length, 6);
  assert.equal(nov[0][0], "2026-10-26");
  assert.equal(nov[0][6], "2026-11-01");
  assert.equal(nov[5][0], "2026-11-30");
  assert.equal(nov[5][6], "2026-12-06");
  assert.ok(nov.every((week) => week.length === 7));

  // 1 Feb 2027 is a Monday and February has 28 days: exactly 4 rows
  const feb = monthGrid("2027-02-10");
  assert.equal(feb.length, 4);
  assert.equal(feb[0][0], "2027-02-01");
  assert.equal(feb[3][6], "2027-02-28");
});

test("week days", () => {
  assert.deepEqual(weekDays("2026-11-20"), [
    "2026-11-16",
    "2026-11-17",
    "2026-11-18",
    "2026-11-19",
    "2026-11-20",
    "2026-11-21",
    "2026-11-22",
  ]);
  // a Monday is the first day of its own week
  assert.equal(weekDays("2026-11-16")[0], "2026-11-16");
});

test("tasks are grouped per day: no-time tasks first, then by time", () => {
  const map = tasksByDay([
    make({ id: "late", date: DAY, startTime: "18:00" }),
    make({ id: "anytime", date: DAY }),
    make({ id: "early", date: DAY, startTime: "08:30", isDone: true }),
    make({ id: "other", date: "2026-11-21" }),
    make({ id: "inbox", date: null }),
  ]);
  assert.deepEqual(map.get(DAY)?.map((t) => t.id), ["anytime", "early", "late"]);
  assert.deepEqual(map.get("2026-11-21")?.map((t) => t.id), ["other"]);
  assert.equal(map.size, 2);
});

test("week layout puts overlapping tasks side by side", () => {
  const blocks = layoutDay(
    [
      make({ id: "a", date: DAY, startTime: "09:00", durationMin: 60 }),
      make({ id: "b", date: DAY, startTime: "09:30", durationMin: 30 }),
      make({ id: "c", date: DAY, startTime: "10:00", durationMin: 30 }), // starts as a ends: no overlap
      make({ id: "d", date: DAY, startTime: "13:00" }), // no duration: drawn 30 min
      make({ id: "anytime", date: DAY }), // not in the hour grid
      make({ id: "other", date: "2026-11-21", startTime: "09:00" }),
    ],
    DAY,
  );
  const byId = Object.fromEntries(blocks.map((b) => [b.task.id, b]));
  assert.deepEqual(Object.keys(byId).sort(), ["a", "b", "c", "d"]);
  assert.deepEqual([byId.a.lane, byId.a.lanes], [0, 2]);
  assert.deepEqual([byId.b.lane, byId.b.lanes], [1, 2]);
  assert.deepEqual([byId.c.lane, byId.c.lanes], [0, 1]);
  assert.deepEqual([byId.d.start, byId.d.end, byId.d.lanes], [780, 810, 1]);
});

test("a chain of overlaps shares one column count and reuses free columns", () => {
  // a overlaps b, b overlaps c, but a and c don't touch: c reuses a's column
  const blocks = layoutDay(
    [
      make({ id: "a", date: DAY, startTime: "09:00", durationMin: 60 }),
      make({ id: "b", date: DAY, startTime: "09:30", durationMin: 60 }),
      make({ id: "c", date: DAY, startTime: "10:00", durationMin: 60 }),
    ],
    DAY,
  );
  const byId = Object.fromEntries(blocks.map((b) => [b.task.id, b]));
  assert.deepEqual([byId.a.lane, byId.b.lane, byId.c.lane], [0, 1, 0]);
  assert.ok(blocks.every((b) => b.lanes === 2));
});

test("blocks never run past midnight", () => {
  const [block] = layoutDay([make({ date: DAY, startTime: "23:30", durationMin: 120 })], DAY);
  assert.deepEqual([block.start, block.end], [1410, 1440]);
});
