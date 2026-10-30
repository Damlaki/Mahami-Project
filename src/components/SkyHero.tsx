/**
 * The home screen's hero: a small sky that follows the theme.
 * Light: warm dawn with a glowing sun. Dark: deep navy, the sun sets,
 * a crescent moon rises and stars fade in. Same Animated value as the toggle.
 */
import type { ReactNode } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { radius, sky, space } from "@/theme/tokens";

const SUN = 58;
const MOON = 46;
const TRAVEL = 150;

// Stars stay on the moon's side (distance from the reading-end edge, in %),
// so they never land on the greeting or the clock.
const STARS: { top: `${number}%`; fromEnd: `${number}%`; size: number }[] = [
  { top: "8%", fromEnd: "6%", size: 2 },
  { top: "14%", fromEnd: "38%", size: 3 },
  { top: "6%", fromEnd: "24%", size: 2 },
  { top: "46%", fromEnd: "4%", size: 2 },
  { top: "60%", fromEnd: "30%", size: 3 },
  { top: "72%", fromEnd: "12%", size: 2 },
  { top: "38%", fromEnd: "42%", size: 2 },
];

export function SkyHero({ children }: { children: ReactNode }) {
  const { progress } = useTheme();
  const { inset, side } = useI18n();
  const endKey = side("end");

  const background = progress.interpolate({ inputRange: [0, 1], outputRange: [...sky.background] });
  const sunY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, TRAVEL] });
  const sunOpacity = progress.interpolate({ inputRange: [0, 0.7], outputRange: [1, 0], extrapolate: "clamp" });
  const moonY = progress.interpolate({ inputRange: [0, 1], outputRange: [TRAVEL, 0] });
  const moonOpacity = progress.interpolate({ inputRange: [0.3, 1], outputRange: [0, 1], extrapolate: "clamp" });
  const starsOpacity = progress.interpolate({ inputRange: [0.4, 1], outputRange: [0, 0.85], extrapolate: "clamp" });

  return (
    <Animated.View style={[styles.sky, { backgroundColor: background }]}>
      <View style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]} importantForAccessibility="no-hide-descendants">
        {STARS.map((s, i) => (
          <Animated.View
            key={i}
            style={[
              styles.star,
              endKey === "end" ? { end: s.fromEnd } : { start: s.fromEnd },
              { top: s.top, width: s.size, height: s.size, opacity: starsOpacity },
            ]}
          />
        ))}

        <Animated.View
          style={[styles.body, { ...inset("end", 26), opacity: sunOpacity, transform: [{ translateY: sunY }] }]}
        >
          <View style={[styles.glow, { backgroundColor: sky.sunGlow }]} />
          <View style={[styles.halo, { backgroundColor: sky.sunGlow }]} />
          <View style={[styles.sun, { backgroundColor: sky.sun }]} />
        </Animated.View>

        <Animated.View
          style={[styles.body, { ...inset("end", 32), opacity: moonOpacity, transform: [{ translateY: moonY }] }]}
        >
          <View style={[styles.glow, { backgroundColor: sky.moonGlow }]} />
          <View style={[styles.halo, { backgroundColor: sky.moonGlow }]} />
          <View style={[styles.moon, { backgroundColor: sky.moon }]}>
            <Animated.View style={[styles.moonBite, { backgroundColor: background }]} />
          </View>
        </Animated.View>
      </View>

      <View style={styles.content}>{children}</View>
    </Animated.View>
  );
}

const GLOW = 100;
const HALO = 74;

const styles = StyleSheet.create({
  sky: { borderRadius: radius.lg, overflow: "hidden", minHeight: 210 },
  content: { padding: space.xl, gap: 2, flex: 1, justifyContent: "space-between" },
  star: { position: "absolute", borderRadius: 2, backgroundColor: sky.star },
  body: {
    position: "absolute",
    top: 18,
    width: GLOW,
    height: GLOW,
    alignItems: "center",
    justifyContent: "center",
  },
  // Two faint, stacked discs read as a soft halo rather than a solid ring.
  glow: { position: "absolute", width: GLOW, height: GLOW, borderRadius: GLOW / 2 },
  halo: { position: "absolute", width: HALO, height: HALO, borderRadius: HALO / 2 },
  sun: { width: SUN, height: SUN, borderRadius: SUN / 2 },
  moon: { width: MOON, height: MOON, borderRadius: MOON / 2, overflow: "hidden" },
  moonBite: {
    position: "absolute",
    width: MOON,
    height: MOON,
    borderRadius: MOON / 2,
    top: -MOON * 0.16,
    left: MOON * 0.34,
  },
});
