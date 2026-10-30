import { useEffect, useState } from "react";
import { AppState, StyleSheet, View } from "react-native";
import { clockParts } from "@/lib/date";
import { useI18n } from "@/i18n/I18nProvider";
import { usePreferences } from "@/state/PreferencesProvider";
import { AppText } from "./ui/AppText";

/**
 * Ticks once per second, aligned to the start of each real second (so it never
 * drifts), and refreshes immediately when the app returns to the foreground.
 */
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const current = new Date();
      setNow(current);
      timer = setTimeout(tick, intervalMs - (current.getTime() % intervalMs) + 5);
    };
    tick();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        clearTimeout(timer);
        tick();
      }
    });
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, [intervalMs]);

  return now;
}

export function LiveClock() {
  const now = useNow();
  const { lang, row } = useI18n();
  const { prefs } = usePreferences();
  const { main, seconds, period } = clockParts(now, prefs.timeFormat, lang);

  return (
    // Digits always read left→right, even inside Arabic layout.
    <View
      style={[styles.row, { flexDirection: row }]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={period ? `${main} ${period}` : main}
    >
      <View style={styles.digits}>
        <AppText variant="display" style={styles.main}>
          {main}
        </AppText>
        <AppText variant="label" tone="muted" style={styles.seconds}>
          {seconds}
        </AppText>
      </View>
      {period ? (
        <AppText variant="heading" tone="muted" style={styles.period}>
          {period}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "flex-end", gap: 8 },
  digits: { flexDirection: "row", direction: "ltr", alignItems: "flex-start" },
  // Tabular figures stop the clock from wobbling as digits change width.
  main: { fontVariant: ["tabular-nums"], letterSpacing: -1 },
  seconds: { marginTop: 10, marginStart: 4, fontVariant: ["tabular-nums"] },
  period: { marginBottom: 8 },
});
