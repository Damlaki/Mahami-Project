/**
 * Date & time helpers.
 *
 * Dates are stored as local "date keys" ("YYYY-MM-DD") and times as "HH:mm".
 * Storing local keys (not UTC timestamps) means a task planned for "Tuesday 09:00"
 * stays on Tuesday 09:00 even if the phone's time zone changes.
 */

export type TimeFormat = "12h" | "24h";
export type Lang = "ar" | "en";

const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

const pad = (n: number) => String(n).padStart(2, "0");

/** Date -> "YYYY-MM-DD" in the device's local time zone. */
export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** "YYYY-MM-DD" -> Date at local midnight. Returns null for invalid input. */
export function parseDateKey(key: string): Date | null {
  const m = DATE_KEY_RE.exec(key);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  const day = Number(m[3]);
  const date = new Date(year, month, day);
  // Rejects things like 2026-02-31 (JS would roll it over to March)
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return null;
  }
  return date;
}

export function isValidDateKey(key: string): boolean {
  return parseDateKey(key) !== null;
}

export function isValidTime(value: string): boolean {
  return TIME_RE.test(value);
}

export function todayKey(now: Date = new Date()): string {
  return toDateKey(now);
}

/** Adds whole days to a date key (DST-safe because it works on calendar fields). */
export function addDays(key: string, days: number): string {
  const date = parseDateKey(key);
  if (!date) throw new Error(`Invalid date key: ${key}`);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

/** "HH:mm" -> minutes since midnight. */
export function timeToMinutes(value: string): number {
  const m = TIME_RE.exec(value);
  if (!m) throw new Error(`Invalid time: ${value}`);
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Minutes since midnight -> "HH:mm" (wraps past midnight). */
export function minutesToTime(total: number): string {
  const wrapped = ((Math.round(total) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(wrapped / 60))}:${pad(wrapped % 60)}`;
}

export function dateToTime(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** "13:05" -> "1:05 PM" / "1:05 م" or "13:05". */
export function formatTime(value: string, format: TimeFormat, lang: Lang): string {
  if (format === "24h") return value;
  const minutes = timeToMinutes(value);
  const h24 = Math.floor(minutes / 60);
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const period = h24 < 12 ? (lang === "ar" ? "ص" : "AM") : lang === "ar" ? "م" : "PM";
  return `${h12}:${pad(minutes % 60)} ${period}`;
}

export interface ClockParts {
  main: string; // "17:59" or "5:59"
  seconds: string; // "14"
  period: string | null; // "PM" / "م" in 12h mode
}

export function clockParts(now: Date, format: TimeFormat, lang: Lang): ClockParts {
  const seconds = pad(now.getSeconds());
  if (format === "24h") {
    return { main: dateToTime(now), seconds, period: null };
  }
  const [main, period] = formatTime(dateToTime(now), "12h", lang).split(" ");
  return { main, seconds, period };
}

export type DayPart = "morning" | "afternoon" | "evening" | "night";

export function dayPart(hour: number): DayPart {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "evening";
  return "night";
}

export type RelativeDay = "today" | "tomorrow" | "yesterday";

export function relativeDay(key: string, today: string): RelativeDay | null {
  if (key === today) return "today";
  if (key === addDays(today, 1)) return "tomorrow";
  if (key === addDays(today, -1)) return "yesterday";
  return null;
}

/** Locale tag for Intl. Latin digits keep times/numbers consistent across both languages. */
export function intlLocale(lang: Lang): string {
  return lang === "ar" ? "ar-u-nu-latn" : "en-GB";
}

function safeFormat(date: Date, lang: Lang, options: Intl.DateTimeFormatOptions): string {
  try {
    return new Intl.DateTimeFormat(intlLocale(lang), options).format(date);
  } catch {
    try {
      return new Intl.DateTimeFormat(lang, options).format(date);
    } catch {
      return toDateKey(date);
    }
  }
}

/** "Wednesday, 28 October" */
export function formatLongDate(date: Date, lang: Lang): string {
  return safeFormat(date, lang, { weekday: "long", day: "numeric", month: "long" });
}

/** "Wed, 28 Oct" */
export function formatShortDate(date: Date, lang: Lang): string {
  return safeFormat(date, lang, { weekday: "short", day: "numeric", month: "short" });
}
