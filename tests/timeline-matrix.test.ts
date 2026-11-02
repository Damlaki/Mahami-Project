import { test } from "node:test";
import assert from "node:assert/strict";
import { createTask, emptyTaskInput, upgradeTask } from "../src/domain/task.ts";
import type { Task } from "../src/domain/task.ts";
import { buildTimeline, blockStatus } from "../src/domain/timeline.ts";
import { groupByQuadrant, quadrantFlags, quadrantOf } from "../src/domain/selectors.ts";

const NOW = new Date(2026, 10, 2, 10, 0);
const DAY = "2026-11-02";
const make = (o: Partial<Task>): Task => ({ ...createTask(emptyTaskInput({ title: "x" }), NOW), ...o });

const kinds = (tl: ReturnType<typeof buildTimeline>) =>
  tl.entries.map((e) => (e.kind === "task" ? `task:${e.task.id}${e.conflict ? "!" : ""}` : e.kind === "gap" ? `gap:${e.start}-${e.end}` : `now:${e.at}`));

test("timeline orders tasks, shows free time and anytime tasks", () => {
  const tasks = [
    make({ id: "lunch", date: DAY, startTime: "12:00", durationMin: 60 }),
    make({ id: "wake", date: DAY, startTime: "07:00", durationMin: 30 }),
    make({ id: "read", date: DAY }),
    make({ id: "other", date: "2026-11-03", startTime: "09:00" }),
  ];
  const tl = buildTimeline(tasks, DAY, null);
  assert.deepEqual(kinds(tl), ["task:wake", "gap:450-720", "task:lunch"]);
  assert.deepEqual(tl.anytime.map((t) => t.id), ["read"]);
});

test("now marker splits a free gap and is placed between tasks", () => {
  const tasks = [
    make({ id: "a", date: DAY, startTime: "07:00", durationMin: 30 }),
    make({ id: "b", date: DAY, startTime: "12:00", durationMin: 30 }),
  ];
  assert.deepEqual(kinds(buildTimeline(tasks, DAY, 600)), ["task:a", "gap:450-600", "now:600", "gap:600-720", "task:b"]);
  assert.deepEqual(kinds(buildTimeline(tasks, DAY, 300)), ["now:300", "task:a", "gap:450-720", "task:b"]);
  assert.deepEqual(kinds(buildTimeline(tasks, DAY, 1300)), ["task:a", "gap:450-720", "task:b", "now:1300"]);
  // now during a task: the marker follows that task
  assert.deepEqual(kinds(buildTimeline(tasks, DAY, 430)), ["task:a", "now:430", "gap:450-720", "task:b"]);
});

test("overlapping tasks are flagged as conflicts", () => {
  const tasks = [
    make({ id: "a", date: DAY, startTime: "09:00", durationMin: 60 }),
    make({ id: "b", date: DAY, startTime: "09:30", durationMin: 30 }),
    make({ id: "c", date: DAY, startTime: "10:00", durationMin: 30 }),
  ];
  assert.deepEqual(kinds(buildTimeline(tasks, DAY, null)), ["task:a", "task:b!", "task:c"]);
});

test("block status", () => {
  assert.equal(blockStatus(420, 450, 600), "past");
  assert.equal(blockStatus(590, 620, 600), "current");
  assert.equal(blockStatus(700, 720, 600), "upcoming");
  assert.equal(blockStatus(700, 720, null), "upcoming");
});

test("quadrants", () => {
  assert.equal(quadrantOf({ important: true, urgent: true }), "do");
  assert.equal(quadrantOf({ important: true, urgent: false }), "schedule");
  assert.equal(quadrantOf({ important: false, urgent: true }), "delegate");
  assert.equal(quadrantOf({ important: false, urgent: false }), "eliminate");
  for (const q of ["do", "schedule", "delegate", "eliminate"] as const) assert.equal(quadrantOf(quadrantFlags(q)), q);

  const groups = groupByQuadrant([
    make({ id: "1", important: true, urgent: true }),
    make({ id: "2", important: true }),
    make({ id: "3", important: true, urgent: true, isDone: true }), // done tasks are hidden
  ]);
  assert.deepEqual(groups.do.map((t) => t.id), ["1"]);
  assert.deepEqual(groups.schedule.map((t) => t.id), ["2"]);
  assert.equal(groups.eliminate.length, 0);
});

test("tasks saved by v1 get matrix flags from their priority", () => {
  const { important, urgent, ...v1 } = make({ priority: "urgent" });
  void important;
  void urgent;
  const upgraded = upgradeTask(v1);
  assert.ok(upgraded);
  assert.equal(upgraded.important, true);
  assert.equal(upgraded.urgent, true);
  const { important: i2, urgent: u2, ...v1High } = make({ priority: "high" });
  void i2;
  void u2;
  assert.deepEqual([upgradeTask(v1High)?.important, upgradeTask(v1High)?.urgent], [true, false]);
  assert.equal(upgradeTask({ nonsense: true }), null);
});
