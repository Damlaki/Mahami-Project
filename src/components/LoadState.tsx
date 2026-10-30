import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useTasks } from "@/state/TasksProvider";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { radius, space } from "@/theme/tokens";
import { AppText } from "./ui/AppText";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";

/** Wraps task-dependent content: skeletons while loading, a retry card on failure. */
export function LoadState({ children }: { children: ReactNode }) {
  const { status, reload, saveFailed } = useTasks();
  const { t } = useI18n();

  if (status === "loading") return <Skeleton />;

  if (status === "error") {
    return (
      <Card style={styles.gap}>
        <AppText tone="danger">{t("error.loadFailed")}</AppText>
        <Button label={t("error.retry")} icon="refresh" variant="secondary" onPress={reload} />
      </Card>
    );
  }

  return (
    <>
      {saveFailed ? (
        <AppText variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {t("error.saveFailed")}
        </AppText>
      ) : null}
      {children}
    </>
  );
}

function Skeleton() {
  const { colors, reduceMotion } = useTheme();
  const { t } = useI18n();
  const pulse = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.5, duration: 600, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, reduceMotion]);

  return (
    <View style={styles.gap} accessibilityLabel={t("common.loading")} accessibilityRole="progressbar">
      {[96, 72, 72].map((h, i) => (
        <Animated.View
          key={i}
          style={[styles.block, { height: h, backgroundColor: colors.surfaceAlt, opacity: pulse }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: space.md },
  block: { borderRadius: radius.md },
});
