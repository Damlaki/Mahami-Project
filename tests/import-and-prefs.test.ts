import { test } from "node:test";
import assert from "node:assert/strict";
import { parseImport } from "../src/domain/legacyImport.ts";
import { createTask, emptyTaskInput } from "../src/domain/task.ts";
import { defaultPreferences, resolveScheme, sanitizePreferences } from "../src/domain/preferences.ts";

const NOW = new Date(2026, 9, 28, 10, 0);

// Exactly what the old web app stores under localStorage "my-tasks"
const LEGACY = JSON.stringify([
  { id: 1, title: "الذهاب إلى النادي الرياضي", date: "2026-10-15", isDone: false },
  { id: 1730123456789, title: "قراءة كتاب", date: "2026-10-15", isDone: true },
  { id: 3, title: "", date: "2026-10-15", isDone: false }, // invalid: empty title
  { nonsense: true },
]);

test("imports the old web app's format", () => {
  const result = parseImport(LEGACY, [], NOW);
  assert.ok(result.ok);
  if (!result.ok) return;
  assert.equal(result.tasks.length, 2);
  assert.equal(result.skipped, 2);
  assert.equal(result.tasks[0].id, "legacy_1");
  assert.equal(result.tasks[0].title, "الذهاب إلى النادي الرياضي");
  assert.equal(result.tasks[0].date, "2026-10-15");
  assert.equal(result.tasks[1].isDone, true);
  assert.equal(result.tasks[1].completedAt, NOW.toISOString());
});

test("importing twice doesn't duplicate", () => {
  const first = parseImport(LEGACY, [], NOW);
  assert.ok(first.ok);
  if (!first.ok) return;
  const second = parseImport(LEGACY, first.tasks, NOW);
  assert.ok(second.ok);
  if (!second.ok) return;
  assert.equal(second.tasks.length, 0);
  assert.equal(second.duplicates, 2);
});

test("accepts a DevTools-quoted string and this app's own export", () => {
  const quoted = JSON.stringify(LEGACY); // "\"[...]\""
  const r1 = parseImport(quoted, [], NOW);
  assert.ok(r1.ok && r1.tasks.length === 2);

  const task = createTask(emptyTaskInput({ title: "Export me", date: "2026-11-01" }), NOW);
  const r2 = parseImport(JSON.stringify({ app: "mahami", tasks: [task] }), [], NOW);
  assert.ok(r2.ok);
  if (r2.ok) assert.deepEqual(r2.tasks, [task]);
});

test("reports clear errors", () => {
  assert.deepEqual(parseImport("   ", [], NOW), { ok: false, error: "empty" });
  assert.deepEqual(parseImport("{oops", [], NOW), { ok: false, error: "notJson" });
  assert.deepEqual(parseImport("42", [], NOW), { ok: false, error: "notArray" });
});

test("theme resolution", () => {
  assert.equal(resolveScheme("dark", "light", 12), "dark");
  assert.equal(resolveScheme("system", "dark", 12), "dark");
  assert.equal(resolveScheme("system", null, 12), "light");
  assert.equal(resolveScheme("time", null, 7), "light");
  assert.equal(resolveScheme("time", null, 19), "dark");
  assert.equal(resolveScheme("time", null, 3), "dark");
});

test("preferences: defaults by locale and sanitizing stored data", () => {
  assert.equal(defaultPreferences("ar-TR").language, "ar");
  assert.equal(defaultPreferences("en-US").language, "en");
  const d = defaultPreferences("ar");
  assert.deepEqual(sanitizePreferences(null, d), d);
  assert.deepEqual(
    sanitizePreferences({ themeMode: "neon", language: "en", timeFormat: "12h", displayName: 5 }, d),
    { ...d, language: "en", timeFormat: "12h" },
  );
});
