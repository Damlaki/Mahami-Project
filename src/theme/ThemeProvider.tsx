import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet, View, useColorScheme } from "react-native";
import { resolveScheme } from "@/domain/preferences";
import type { Scheme } from "@/domain/preferences";
import { usePreferences } from "@/state/PreferencesProvider";
import { motion, palettes } from "./tokens";
import type { Palette } from "./tokens";

interface ThemeContextValue {
  scheme: Scheme;
  colors: Palette;
  /** 0 = day/light, 1 = night/dark. Drives the sun/moon animations. */
  progress: Animated.Value;
  reduceMotion: boolean;
  toggleScheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Current hour, refreshed every minute — only while "by time" mode needs it. */
function useHour(active: boolean): number {
  const [hour, setHour] = useState(() => new Date().getHours());
  useEffect(() => {
    if (!active) return;
    const update = () => setHour(new Date().getHours());
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [active]);
  return hour;
}

function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce).catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduce);
    return () => sub.remove();
  }, []);
  return reduce;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { prefs, updatePrefs } = usePreferences();
  const system = useColorScheme();
  const systemScheme: Scheme | null = system === "dark" ? "dark" : system === "light" ? "light" : null;
  const hour = useHour(prefs.themeMode === "time");
  const reduceMotion = useReduceMotion();

  const scheme = resolveScheme(prefs.themeMode, systemScheme, hour);
  const colors = palettes[scheme];

  const progress = useRef(new Animated.Value(scheme === "dark" ? 1 : 0)).current;

  // Cross-fade: when the scheme changes, a layer painted with the OLD background
  // sits on top and fades out, so the whole screen dissolves into the new theme.
  const fade = useRef(new Animated.Value(0)).current;
  const [fadeColor, setFadeColor] = useState(colors.bg);
  const previous = useRef(scheme);

  useEffect(() => {
    if (previous.current === scheme) return;
    const oldBg = palettes[previous.current].bg;
    previous.current = scheme;
    const target = scheme === "dark" ? 1 : 0;

    if (reduceMotion) {
      progress.setValue(target);
      return;
    }
    setFadeColor(oldBg);
    fade.setValue(1);
    // backgroundColor interpolation can't use the native driver, so all theme
    // animations share the JS driver. They are short and run only on toggle.
    Animated.parallel([
      Animated.timing(progress, {
        toValue: target,
        duration: motion.theme,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(fade, {
        toValue: 0,
        duration: motion.base + 120,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
    ]).start();
  }, [scheme, reduceMotion, progress, fade]);

  const toggleScheme = useCallback(() => {
    updatePrefs({ themeMode: scheme === "dark" ? "light" : "dark" });
  }, [scheme, updatePrefs]);

  const value = useMemo(
    () => ({ scheme, colors, progress, reduceMotion, toggleScheme }),
    [scheme, colors, progress, reduceMotion, toggleScheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        {children}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: fadeColor, opacity: fade, pointerEvents: "none" },
          ]}
        />
      </View>
    </ThemeContext.Provider>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
