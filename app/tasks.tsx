/**
 * Tasks tab: the same tasks shown three ways, switched at the top like Google
 * Calendar: Month (grid of days), Week (hour grid) and List (filters).
 * The selected day is shared, so switching views keeps you on the same date.
 */
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TASK_VIEWS } from "@/domain/selectors";
import type { TaskView } from "@/domain/selectors";
import { addDays, toDateKey } from "@/lib/date";
import { useTasks } from "@/state/TasksProvider";
import { useUI } from "@/state/UIProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { space } from "@/theme/tokens";
import { AppText } from "@/components/ui/AppText";
import { ChipRow } from "@/components/ui/Chip";
import { Fab } from "@/components/ui/Fab";
import { useNow } from "@/components/LiveClock";
import { MonthView } from "@/components/calendar/MonthView";
import { WeekView } from "@/components/calendar/WeekView";
import { TaskListView } from "@/components/calendar/TaskListView";
import type { IconName } from "@/components/ui/Button";

type Mode = "month" | "week" | "list";
const MODES: readonly { value: Mode; icon: IconName }[] = [
  { value: "month", icon: "calendar-outline" },
  { value: "week", icon: "today-outline" },
  { value: "list", icon: "list-outline" },
];

function isTaskView(value: unknown): value is TaskView {
  return typeof value === "string" && (TASK_VIEWS as readonly string[]).includes(value);
}

export default function TasksScreen() {
  // Links from the home screen ("See all", "overdue") open the list on that filter.
  const params = useLocalSearchParams<{ view?: string }>();
  const linkedView = isTaskView(params.view) ? params.view : null;

  const [mode, setMode] = useState<Mode>(linkedView ? "list" : "month");
  const [listView, setListView] = useState<TaskView>(linkedView ?? "all");

  useEffect(() => {
    if (linkedView) {
      setListView(linkedView);
      setMode("list");
    }
  }, [linkedView]);

  const today = toDateKey(useNow(60_000));
  const [selected, setSelected] = useState(today);

  const { tasks } = useTasks();
  const { openEditor } = useUI();
  const { t, row } = useI18n();
  const insets = useSafeAreaInsets();

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + space.md }]}>
      <View style={[styles.titleRow, { flexDirection: row }]}>
        <AppText variant="title">{t("tab.tasks")}</AppText>
        <AppText variant="heading" tone="faint">
          {tasks.length}
        </AppText>
      </View>
      <ChipRow
        options={MODES.map((m) => ({ value: m.value, icon: m.icon, label: t(`calendar.${m.value}`) }))}
        value={mode}
        onChange={setMode}
      />
    </View>
  );

  const add = () => {
    if (mode === "list") {
      openEditor(null, { date: listView === "upcoming" ? addDays(today, 1) : today });
    } else {
      openEditor(null, { date: selected });
    }
  };

  return (
    <View style={styles.flex}>
      {mode === "month" ? (
        <MonthView header={header} selected={selected} today={today} onSelect={setSelected} />
      ) : mode === "week" ? (
        <WeekView
          header={header}
          selected={selected}
          today={today}
          onSelect={setSelected}
          onShowDay={(day) => {
            setSelected(day);
            setMode("month");
          }}
        />
      ) : (
        <TaskListView header={header} today={today} view={listView} onViewChange={setListView} />
      )}
      <Fab onPress={add} accessibilityLabel={t("editor.new")} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { gap: space.md },
  titleRow: { alignItems: "baseline", gap: space.sm },
});
