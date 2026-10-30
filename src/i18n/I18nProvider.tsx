/**
 * Language + layout direction.
 *
 * React Native's built-in RTL (I18nManager.forceRTL) only applies after an app
 * restart. To switch Arabic ⇄ English instantly, the app keeps the native layout
 * LTR (see app/_layout.tsx) and flips rows and text alignment itself via
 * `row` and `textAlign` from this context. Use them for any horizontal layout.
 */
import { createContext, useCallback, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { I18nManager } from "react-native";
import { interpolate, strings } from "./strings";
import type { StringKey } from "./strings";
import { usePreferences } from "@/state/PreferencesProvider";
import type { Lang } from "@/lib/date";

type Params = Record<string, string | number>;

interface I18nContextValue {
  lang: Lang;
  isRTL: boolean;
  t: (key: StringKey, params?: Params) => string;
  /** flexDirection for a horizontal row that starts on the reading side */
  row: "row" | "row-reverse";
  /** textAlign for the reading start side */
  textAlign: "left" | "right";
  /** textAlign for the reading end side */
  textAlignEnd: "left" | "right";
  /** 1 or -1: multiply horizontal offsets/arrows by this */
  dir: 1 | -1;
  /**
   * Maps a reading side to the style key to use for absolute positioning / margins,
   * e.g. `{ [side("end")]: 16 }` sits 16px from the side where reading ends.
   */
  side: (reading: "start" | "end") => "start" | "end";
  /** `{ start: n }` or `{ end: n }` — typed helper built on `side`. */
  inset: (reading: "start" | "end", value: number) => { start: number } | { end: number };
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const { prefs } = usePreferences();
  const lang = prefs.language;
  const isRTL = lang === "ar";

  const t = useCallback(
    (key: StringKey, params?: Params) => interpolate(strings[lang][key] ?? strings.en[key], params),
    [lang],
  );

  const value = useMemo<I18nContextValue>(() => {
    // If the OS still has native RTL on (first launch on an Arabic phone, before
    // forceRTL(false) takes effect), React Native already mirrors rows — so only
    // flip when the wanted direction differs from the native one.
    const flip = isRTL !== I18nManager.isRTL;
    return {
      lang,
      isRTL,
      t,
      row: flip ? "row-reverse" : "row",
      textAlign: flip ? "right" : "left",
      textAlignEnd: flip ? "left" : "right",
      dir: isRTL ? -1 : 1,
      side: (reading) => (flip ? (reading === "start" ? "end" : "start") : reading),
      inset: (reading, value) => {
        const key = flip ? (reading === "start" ? "end" : "start") : reading;
        return key === "start" ? { start: value } : { end: value };
      },
    };
  }, [lang, isRTL, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
