import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { motion } from "@/theme/tokens";

export function ProgressBar({ percent, color }: { percent: number; color?: string }) {
  const { colors, reduceMotion } = useTheme();
  const { row } = useI18n();
  const value = useRef(new Animated.Value(percent)).current;

  useEffect(() => {
    if (reduceMotion) {
      value.setValue(percent);
      return;
    }
    Animated.timing(value, { toValue: percent, duration: motion.base * 2, useNativeDriver: false }).start();
  }, [percent, reduceMotion, value]);

  const width = value.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"], extrapolate: "clamp" });

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      style={[styles.track, { backgroundColor: colors.surfaceAlt, flexDirection: row }]}
    >
      <Animated.View style={[styles.fill, { width, backgroundColor: color ?? colors.primary }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 8, borderRadius: 4, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 4 },
});
