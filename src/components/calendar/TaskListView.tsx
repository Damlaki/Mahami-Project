/**
 * The original task list (All / Today / Upcoming / Overdue / Completed),
 * now one of the Tasks tab's three views.
 */
import { useMemo } from "react";
import type { ReactNode } from "react";
import { SectionList, StyleSheet, View } from "react-native";
import { TASK_VIEWS, countByView, filterTasks, groupByDay, isOverdue } from "@/domain/selectors";
import type { TaskView } from "@/domain/selectors";
import { formatShortDate, parseDateKey, relativeDay } from "@/lib/date";
import { useTasks } from "@/state/TasksProvider";
import { useUI } from "@/state/UIProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { space } from "@/theme/tokens";
import { AppText } from "@/components/ui/AppText";
import { ChipRow } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadState } from "@/components/LoadState";
import { TaskCard } from "@/components/TaskCard";
import type { IconName } from "@/components/ui/Button";

const EMPTY_ICONS: Record<TaskView, IconName> = {
  all: "sparkles-outline",
  today: "sunny-outline",
  upcoming: "calendar-outline",
  overdue: "happy-outline",
  completed: "checkmark-done-outline",
};

interface TaskListViewProps {
  header: ReactNode;
  today: string;
  view: TaskView;
  onViewChange: (view: TaskView) => void;
}

export function TaskListView({ header, today, view, onViewChange }: TaskListViewProps) {
  const { tasks, toggleDone } = useTasks();
  const { openEditor } = useUI();
  const { t, lang } = useI18n();

  const counts = useMemo(() => countByView(tasks, today), [tasks, today]);
  const sections = useMemo(
    () => groupByDay(filterTasks(tasks, view, today), today),
    [tasks, view, today],
  );

  const sectionTitle = (key: string) => {
    if (key === "overdue") return t("section.overdue");
    if (key === "none") return t("section.none");
    const rel = relativeDay(key, today);
    if (rel) return t(`day.${rel}`);
    const date = parseDateKey(key);
    return date ? formatShortDate(date, lang) : key;
  };

  return (
    <SectionList
      sections={sections}
      keyExtractor={(task) => task.id}
      stickySectionHeadersEnabled={false}
      contentContainerStyle={styles.content}
      ListHeaderComponent={
        <View style={styles.header}>
          {header}
          <ChipRow
            scroll
            options={TASK_VIEWS.map((v) => ({ value: v, label: t(`view.${v}`), count: counts[v] }))}
            value={view}
            onChange={onViewChange}
          />
        </View>
      }
      renderSectionHeader={({ section }) => (
        <AppText
          variant="label"
          tone={section.key === "overdue" ? "danger" : "muted"}
          style={styles.sectionHeader}
          accessibilityRole="header"
        >
          {sectionTitle(section.key)}
        </AppText>
      )}
      renderItem={({ item }) => (
        <TaskCard task={item} overdue={isOverdue(item, today)} onToggle={toggleDone} onOpen={openEditor} />
      )}
      ItemSeparatorComponent={Separator}
      ListEmptyComponent={
        <LoadState>
          <EmptyState
            icon={EMPTY_ICONS[view]}
            message={t(`empty.${view}`)}
            hint={view === "today" || view === "upcoming" ? t("empty.hint") : undefined}
          />
        </LoadState>
      }
    />
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.xl, paddingBottom: 120 },
  header: { gap: space.lg, marginBottom: space.sm },
  sectionHeader: { marginTop: space.lg, marginBottom: space.sm, textTransform: "uppercase" },
  separator: { height: space.sm },
});
