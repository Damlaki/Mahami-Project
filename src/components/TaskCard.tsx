import { memo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { taskEndTime } from "@/domain/task";
import type { CategoryId, Task } from "@/domain/task";
import { formatTime } from "@/lib/date";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { usePreferences } from "@/state/PreferencesProvider";
import { radius, space } from "@/theme/tokens";
import { AppText } from "./ui/AppText";
import type { IconName } from "./ui/Button";

export const CATEGORY_ICONS: Record<CategoryId, IconName> = {
  personal: "person",
  work: "briefcase",
  study: "book",
  health: "fitness",
  home: "home",
};

interface TaskCardProps {
  task: Task;
  overdue: boolean;
  /** Extra label shown before the time, e.g. the date in "Upcoming". */
  dateLabel?: string;
  onToggle: (id: string) => void;
  onOpen: (task: Task) => void;
}

function TaskCardBase({ task, overdue, dateLabel, onToggle, onOpen }: TaskCardProps) {
  const { colors } = useTheme();
  const { t, row, lang } = useI18n();
  const { prefs } = usePreferences();
  const accent = colors.category[task.category];

  const meta: string[] = [];
  if (dateLabel) meta.push(dateLabel);
  if (task.startTime) {
    const end = taskEndTime(task);
    const start = formatTime(task.startTime, prefs.timeFormat, lang);
    meta.push(end ? `${start} – ${formatTime(end, prefs.timeFormat, lang)}` : start);
  }
  if (task.durationMin) meta.push(t("task.minutes", { n: task.durationMin }));

  const showFlag = task.priority === "high" || task.priority === "urgent";

  return (
    <Pressable
      onPress={() => onOpen(task)}
      accessibilityRole="button"
      accessibilityLabel={t("task.open", { title: task.title })}
      style={({ pressed }) => [
        styles.card,
        {
          flexDirection: row,
          backgroundColor: colors.surface,
          borderColor: overdue ? colors.danger : colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={[styles.capsule, { backgroundColor: task.isDone ? colors.surfaceAlt : accent }]}>
        <Ionicons
          name={CATEGORY_ICONS[task.category]}
          size={18}
          color={task.isDone ? colors.textFaint : "#FFFFFF"}
        />
      </View>

      <View style={styles.body}>
        {meta.length > 0 || overdue ? (
          <View style={[styles.metaRow, { flexDirection: row }]}>
            {overdue ? (
              <AppText variant="label" tone="danger">
                {t("task.overdue")}
              </AppText>
            ) : null}
            {meta.length > 0 ? (
              <AppText variant="caption" tone="muted" numberOfLines={1} style={styles.shrink}>
                {meta.join(" · ")}
              </AppText>
            ) : null}
          </View>
        ) : null}
        <View style={[styles.titleRow, { flexDirection: row }]}>
          <AppText
            variant="bodyStrong"
            tone={task.isDone ? "faint" : "default"}
            strike={task.isDone}
            numberOfLines={2}
            style={styles.shrink}
          >
            {task.title}
          </AppText>
          {showFlag && !task.isDone ? (
            <Ionicons name="flag" size={14} color={colors.priority[task.priority]} />
          ) : null}
        </View>
        {task.notes ? (
          <AppText variant="caption" tone="faint" numberOfLines={1}>
            {task.notes}
          </AppText>
        ) : null}
      </View>

      <Pressable
        onPress={() => onToggle(task.id)}
        hitSlop={10}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: task.isDone }}
        accessibilityLabel={t(task.isDone ? "task.markUndone" : "task.markDone", { title: task.title })}
        style={({ pressed }) => [
          styles.check,
          {
            borderColor: accent,
            backgroundColor: task.isDone ? accent : "transparent",
            transform: [{ scale: pressed ? 0.9 : 1 }],
          },
        ]}
      >
        {task.isDone ? <Ionicons name="checkmark" size={18} color="#FFFFFF" /> : null}
      </Pressable>
    </Pressable>
  );
}

export const TaskCard = memo(TaskCardBase);

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    gap: space.md,
    padding: space.md,
    borderRadius: radius.md + 2,
    borderWidth: StyleSheet.hairlineWidth,
  },
  capsule: {
    width: 40,
    height: 52,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, minWidth: 0, gap: 1 },
  metaRow: { alignItems: "center", gap: space.sm },
  titleRow: { alignItems: "center", gap: 6 },
  shrink: { flexShrink: 1 },
  check: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
