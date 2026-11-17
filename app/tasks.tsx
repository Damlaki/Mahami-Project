import { useEffect, useMemo, useState } from "react";
import { SectionList, StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TASK_VIEWS, countByView, filterTasks, groupByDay, isOverdue } from "@/domain/selectors";
import type { TaskView } from "@/domain/selectors";
import { addDays, formatShortDate, parseDateKey, relativeDay, toDateKey } from "@/lib/date";
import { useTasks } from "@/state/TasksProvider";
import { useUI } from "@/state/UIProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { space } from "@/theme/tokens";
import { AppText } from "@/components/ui/AppText";
import { ChipRow } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Fab } from "@/components/ui/Fab";
import { LoadState } from "@/components/LoadState";
import { TaskCard } from "@/components/TaskCard";
import { useNow } from "@/components/LiveClock";
import type { IconName } from "@/components/ui/Button";

const EMPTY_ICONS: Record<TaskView, IconName> = {
  all: "sparkles-outline",
  today: "sunny-outline",
  upcoming: "calendar-outline",
  overdue: "happy-outline",
  completed: "checkmark-done-outline",
};

function isTaskView(value: unknown): value is TaskView {
  return typeof value === "string" && (TASK_VIEWS as readonly string[]).includes(value);
}

export default function TasksScreen() {
  const params = useLocalSearchParams<{ view?: string }>();
  const [view, setView] = useState<TaskView>(isTaskView(params.view) ? params.view : "all");
  const { tasks, toggleDone } = useTasks();
  const { openEditor } = useUI();
  const { t, lang, row } = useI18n();
  const insets = useSafeAreaInsets();

  // Follow links like "See all" / "overdue" from the home screen.
  useEffect(() => {
    if (isTaskView(params.view)) setView(params.view);
  }, [params.view]);

  const today = toDateKey(useNow(60_000));
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

  const add = () => openEditor(null, { date: view === "upcoming" ? addDays(today, 1) : today });

  return (
    <View style={styles.flex}>
      <SectionList
        sections={sections}
        keyExtractor={(task) => task.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + space.md }]}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={[styles.titleRow, { flexDirection: row }]}>
              <AppText variant="title">{t("tab.tasks")}</AppText>
              <AppText variant="heading" tone="faint">
                {counts.all}
              </AppText>
            </View>
            <ChipRow
              scroll
              options={TASK_VIEWS.map((v) => ({ value: v, label: t(`view.${v}`), count: counts[v] }))}
              value={view}
              onChange={setView}
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
      <Fab onPress={add} accessibilityLabel={t("editor.new")} />
    </View>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: space.xl, paddingBottom: 120 },
  header: { gap: space.lg, marginBottom: space.sm },
  titleRow: { alignItems: "baseline", gap: space.sm },
  sectionHeader: { marginTop: space.lg, marginBottom: space.sm, textTransform: "uppercase" },
  separator: { height: space.sm },
});
