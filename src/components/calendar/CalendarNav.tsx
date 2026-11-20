/**
 * Title + "Today" + previous/next arrows, shared by the month and week views.
 * Arrows point the way the calendar moves in the current reading direction.
 */
import { Pressable, StyleSheet, View } from "react-native";
import { useI18n } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space } from "@/theme/tokens";
import { AppText } from "@/components/ui/AppText";
import { IconButton } from "@/components/ui/Button";

interface CalendarNavProps {
  title: string;
  /** Show the "Today" shortcut (hidden when today is already in view and selected) */
  showToday: boolean;
  onToday: () => void;
  onPrev: () => void;
  onNext: () => void;
  prevLabel: string;
  nextLabel: string;
}

export function CalendarNav({ title, showToday, onToday, onPrev, onNext, prevLabel, nextLabel }: CalendarNavProps) {
  const { t, row, dir } = useI18n();
  const { colors } = useTheme();

  return (
    <View style={[styles.header, { flexDirection: row }]}>
      <AppText variant="heading" style={styles.title} accessibilityRole="header">
        {title}
      </AppText>
      {showToday ? (
        <Pressable
          onPress={onToday}
          accessibilityRole="button"
          style={({ pressed }) => [styles.todayButton, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
        >
          <AppText variant="label" tone="primary">
            {t("timeline.today")}
          </AppText>
        </Pressable>
      ) : null}
      <IconButton
        icon={dir === 1 ? "chevron-back" : "chevron-forward"}
        size={20}
        accessibilityLabel={prevLabel}
        onPress={onPrev}
      />
      <IconButton
        icon={dir === 1 ? "chevron-forward" : "chevron-back"}
        size={20}
        accessibilityLabel={nextLabel}
        onPress={onNext}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", gap: 2 },
  title: { flex: 1, minWidth: 0 },
  todayButton: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 4,
  },
});
