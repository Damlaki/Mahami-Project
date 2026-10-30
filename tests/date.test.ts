import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  clockParts,
  dayPart,
  formatTime,
  isValidDateKey,
  isValidTime,
  minutesToTime,
  parseDateKey,
  relativeDay,
  timeToMinutes,
  toDateKey,
} from "../src/lib/date.ts";

test("date keys round-trip in local time", () => {
  const d = new Date(2026, 9, 28, 23, 59); // 28 Oct 2026, late evening
  assert.equal(toDateKey(d), "2026-10-28");
  assert.equal(toDateKey(parseDateKey("2026-10-28")!), "2026-10-28");
});

test("invalid dates are rejected", () => {
  assert.equal(isValidDateKey("2026-02-31"), false);
  assert.equal(isValidDateKey("2026-2-3"), false);
  assert.equal(isValidDateKey("hello"), false);
  assert.equal(isValidDateKey("2028-02-29"), true); // leap year
});

test("addDays crosses month and year boundaries", () => {
  assert.equal(addDays("2026-10-31", 1), "2026-11-01");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
});

test("time parsing and formatting", () => {
  assert.equal(isValidTime("23:59"), true);
  assert.equal(isValidTime("24:00"), false);
  assert.equal(isValidTime("9:00"), false);
  assert.equal(timeToMinutes("07:30"), 450);
  assert.equal(minutesToTime(450), "07:30");
  assert.equal(minutesToTime(1440 + 15), "00:15");
  assert.equal(formatTime("13:05", "12h", "en"), "1:05 PM");
  assert.equal(formatTime("00:10", "12h", "en"), "12:10 AM");
  assert.equal(formatTime("12:00", "12h", "ar"), "12:00 م");
  assert.equal(formatTime("13:05", "24h", "en"), "13:05");
});

test("clock parts", () => {
  const d = new Date(2026, 0, 15, 17, 59, 14);
  assert.deepEqual(clockParts(d, "24h", "en"), { main: "17:59", seconds: "14", period: null });
  assert.deepEqual(clockParts(d, "12h", "en"), { main: "5:59", seconds: "14", period: "PM" });
});

test("day parts and relative days", () => {
  assert.equal(dayPart(6), "morning");
  assert.equal(dayPart(13), "afternoon");
  assert.equal(dayPart(21), "evening");
  assert.equal(dayPart(2), "night");
  assert.equal(relativeDay("2026-10-29", "2026-10-28"), "tomorrow");
  assert.equal(relativeDay("2026-10-27", "2026-10-28"), "yesterday");
  assert.equal(relativeDay("2026-11-02", "2026-10-28"), null);
});
