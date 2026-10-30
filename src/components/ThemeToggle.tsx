/**
 * Sun ⇄ moon switch. One Animated value (theme progress, 0 = day, 1 = night)
 * drives everything: the knob slides across, the sun's rays spin and fade,
 * a shadow disc slides over the knob to carve a crescent moon, and stars appear.
 */
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { sky } from "@/theme/tokens";

const TRACK_W = 68;
const TRACK_H = 36;
const KNOB = 26;
const PAD = (TRACK_H - KNOB) / 2;
const TRAVEL = TRACK_W - KNOB - PAD * 2;
const RAYS = [0, 45, 90, 135, 180, 225, 270, 315];
const STARS = [
  { top: 8, left: 12, size: 3 },
  { top: 20, left: 22, size: 2 },
  { top: 11, left: 30, size: 2 },
];

export function ThemeToggle() {
  const { progress, scheme, toggleScheme } = useTheme();
  const { t } = useI18n();
  const isDark = scheme === "dark";

  const trackColor = progress.interpolate({ inputRange: [0, 1], outputRange: [...sky.toggleTrack] });
  const knobX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, TRAVEL] });
  const knobColor = progress.interpolate({ inputRange: [0, 1], outputRange: [sky.sun, sky.moon] });
  const raysOpacity = progress.interpolate({ inputRange: [0, 0.5], outputRange: [1, 0], extrapolate: "clamp" });
  const raysRotate = progress.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "90deg"] });
  const raysScale = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.4] });
  // The crescent "bite": a disc in the track color sliding in from the top-right.
  const biteX = progress.interpolate({ inputRange: [0, 1], outputRange: [KNOB, KNOB * 0.32] });
  const biteY = progress.interpolate({ inputRange: [0, 1], outputRange: [-KNOB, -KNOB * 0.18] });
  const starsOpacity = progress.interpolate({ inputRange: [0.5, 1], outputRange: [0, 1], extrapolate: "clamp" });

  return (
    <Pressable
      onPress={toggleScheme}
      accessibilityRole="switch"
      accessibilityState={{ checked: isDark }}
      accessibilityLabel={isDark ? t("theme.toLight") : t("theme.toDark")}
      hitSlop={6}
    >
      {/* Physical left→right in both languages: sun on the left, moon on the right, like a sunrise→night arc. */}
      <Animated.View style={[styles.track, { backgroundColor: trackColor, direction: "ltr" }]}>
        {STARS.map((s, i) => (
          <Animated.View
            key={i}
            style={[
              styles.star,
              { top: s.top, left: s.left, width: s.size, height: s.size, opacity: starsOpacity },
            ]}
          />
        ))}

        <Animated.View style={[styles.knobSlot, { transform: [{ translateX: knobX }] }]}>
          <Animated.View
            style={[
              styles.rays,
              { opacity: raysOpacity, transform: [{ rotate: raysRotate }, { scale: raysScale }] },
            ]}
          >
            {RAYS.map((deg) => (
              <View key={deg} style={[styles.rayArm, { transform: [{ rotate: `${deg}deg` }] }]}>
                <View style={styles.ray} />
              </View>
            ))}
          </Animated.View>

          <Animated.View style={[styles.knob, { backgroundColor: knobColor }]}>
            <Animated.View
              style={[
                styles.bite,
                { backgroundColor: trackColor, transform: [{ translateX: biteX }, { translateY: biteY }] },
              ]}
            />
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const RAY_BOX = KNOB + 10;

const styles = StyleSheet.create({
  track: {
    width: TRACK_W,
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    padding: PAD,
    overflow: "hidden",
  },
  star: { position: "absolute", borderRadius: 2, backgroundColor: sky.star },
  knobSlot: { width: KNOB, height: KNOB, alignItems: "center", justifyContent: "center" },
  rays: {
    position: "absolute",
    width: RAY_BOX,
    height: RAY_BOX,
    alignItems: "center",
    justifyContent: "center",
  },
  rayArm: { position: "absolute", width: 2, height: RAY_BOX, alignItems: "center" },
  ray: { width: 2, height: 4, borderRadius: 1, backgroundColor: sky.sun },
  knob: { width: KNOB, height: KNOB, borderRadius: KNOB / 2, overflow: "hidden" },
  bite: { position: "absolute", width: KNOB, height: KNOB, borderRadius: KNOB / 2 },
});
