import type { Lang, TimeFormat } from "../lib/date";

/**
 * system = follow the phone's dark-mode setting
 * time   = light during the day, dark at night (see DAYTIME_START/END)
 */
export type ThemeMode = "system" | "light" | "dark" | "time";
export type Scheme = "light" | "dark";

export interface Preferences {
  themeMode: ThemeMode;
  language: Lang;
  timeFormat: TimeFormat;
  displayName: string;
}

export const DAYTIME_START_HOUR = 6;
export const DAYTIME_END_HOUR = 19;
export const NAME_MAX = 40;

export function defaultPreferences(deviceLocale: string): Preferences {
  return {
    themeMode: "system",
    language: deviceLocale.toLowerCase().startsWith("ar") ? "ar" : "en",
    timeFormat: "24h",
    displayName: "",
  };
}

export function resolveScheme(mode: ThemeMode, systemScheme: Scheme | null, hour: number): Scheme {
  switch (mode) {
    case "light":
    case "dark":
      return mode;
    case "time":
      return hour >= DAYTIME_START_HOUR && hour < DAYTIME_END_HOUR ? "light" : "dark";
    case "system":
      return systemScheme ?? "light";
  }
}

/** Merges stored values over defaults, ignoring anything invalid (e.g. from an older version). */
export function sanitizePreferences(stored: unknown, defaults: Preferences): Preferences {
  if (typeof stored !== "object" || stored === null) return defaults;
  const s = stored as Record<string, unknown>;
  return {
    themeMode: ["system", "light", "dark", "time"].includes(s.themeMode as string)
      ? (s.themeMode as ThemeMode)
      : defaults.themeMode,
    language: s.language === "ar" || s.language === "en" ? s.language : defaults.language,
    timeFormat: s.timeFormat === "12h" || s.timeFormat === "24h" ? s.timeFormat : defaults.timeFormat,
    displayName:
      typeof s.displayName === "string" ? s.displayName.slice(0, NAME_MAX) : defaults.displayName,
  };
}
