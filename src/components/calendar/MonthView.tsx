/**
 * Google Calendar-style month: a grid of days with a coloured chip per task
 * (category colour, struck through when done), "+N" when a day is full, and the
 * selected day's tasks listed under the grid.
 */
import { memo, useMemo } from "react";
import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { monthGrid, tasksByDay, WEEK_START } from "@/domain/calendar";
import { isOverdue } from "@/domain/selectors";
import type { Task } from "@/domain/task";
import {
  addMonths,
  formatLongDate,
  formatMonthYear,
  formatWeekdayShort,
  isSameMonth,
  parseDateKey,
  startOfMonth,
} from "@/lib/date";
import { useTasks } from "@/state/TasksProvider";
import { useUI } from "@/state/UIProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space } from "@/theme/tokens";
import { AppText } from "@/components/ui/AppText";
import { LoadState } from "@/components/LoadState";
import { TaskCard } from "@/components/TaskCard";
import { CalendarNav } from "./CalendarNav";

/** Chips that fit in one day cell. With more tasks, the last slot becomes "+N". */
const MAX_CHIPS = 3;

interface MonthViewProps {
  header: ReactNode;
  selected: string;
  today: string;
  onSelect: (day: string) => void;
}

export function MonthView({ header, selected, today, onSelect }: MonthViewProps) {
  const { tasks, toggleDone } = useTasks();
  const { openEditor } = useUI();
  const { t, lang, row } = useI18n();
  const { colors } = useTheme();

  const monthStart = startOfMonth(selected);
  const weeks = useMemo(() => monthGrid(monthStart, WEEK_START), [monthStart]);
  const byDay = useMemo(() => tasksByDay(tasks), [tasks]);

  const selectedDate = parseDateKey(selected) ?? new Date();
  const selectedTasks = byDay.get(selected) ?? [];

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {header}

      <CalendarNav
        title={formatMonthYear(parseDateKey(monthStart) ?? selectedDate, lang)}
        showToday={selected !== today}
        onToday={() => onSelect(today)}
        onPrev={() => onSelect(addMonths(selected, -1))}
        onNext={() => onSelect(addMonths(selected, 1))}
        prevLabel={t("calendar.prevMonth")}
        nextLabel={t("calendar.nextMonth")}
      />

      <View style={[styles.grid, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {/* Weekday names, from the first week's days */}
        <View style={[styles.weekRow, { flexDirection: row, borderBottomColor: colors.border }]}>
          {weeks[0].map((key) => (
            <AppText key={key} variant="label" tone="muted" align="center" style={styles.weekday} numberOfLines={1}>
              {formatWeekdayShort(parseDateKey(key)!, lang)}
            </AppText>
          ))}
        </View>

        {weeks.map((week, i) => (
          <View
            key={week[0]}
            style={[
              styles.weekRow,
              { flexDirection: row, borderBottomColor: colors.border },
              i === weeks.length - 1 && styles.lastRow,
            ]}
          >
            {week.map((key) => (
              <DayCell
                key={key}
                dayKey={key}
                tasks={byDay.get(key) ?? EMPTY}
                inMonth={isSameMonth(key, monthStart)}
                isToday={key === today}
                isSelected={key === selected}
                onPress={onSelect}
              />
            ))}
          </View>
        ))}
      </View>

      {/* Selected day */}
      <LoadState>
        <View style={styles.dayList}>
          <AppText variant="label" tone="muted" style={styles.dayTitle} accessibilityRole="header">
            {formatLongDate(selectedDate, lang)}
          </AppText>
          {selectedTasks.length === 0 ? (
            <AppText variant="caption" tone="faint">
              {`${t("calendar.dayEmpty")} ${t("empty.hint")}`}
            </AppText>
          ) : (
            selectedTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                overdue={isOverdue(task, today)}
                onToggle={toggleDone}
                onOpen={openEditor}
              />
            ))
          )}
        </View>
      </LoadState>
    </ScrollView>
  );
}

const EMPTY: Task[] = [];

interface DayCellProps {
  dayKey: string;
  tasks: Task[];
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  onPress: (day: string) => void;
}

const DayCell = memo(function DayCell({ dayKey, tasks, inMonth, isToday, isSelected, onPress }: DayCellProps) {
  const { colors } = useTheme();
  const { t, lang } = useI18n();
  const date = parseDateKey(dayKey)!;

  const chipCount = tasks.length > MAX_CHIPS ? MAX_CHIPS - 1 : tasks.length;
  const visible = tasks.slice(0, chipCount);
  const more = tasks.length - visible.length;

  return (
    <Pressable
      onPress={() => onPress(dayKey)}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={t("timeline.selectDay", { day: formatLongDate(date, lang), count: tasks.length })}
      style={({ pressed }) => [
        styles.cell,
        isSelected && { backgroundColor: colors.primarySoft },
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={[styles.dayNumber, isToday && { backgroundColor: colors.primary }]}>
        <AppText
          variant="label"
          align="center"
          style={{ color: isToday ? colors.onPrimary : inMonth ? colors.text : colors.textFaint }}
        >
          {date.getDate()}
        </AppText>
      </View>

      {visible.map((task) => (
        <View
          key={task.id}
          style={[
            styles.chip,
            { backgroundColor: task.isDone ? colors.surfaceAlt : colors.category[task.category] },
            !inMonth && styles.faded,
          ]}
        >
          <AppText
            numberOfLines={1}
            strike={task.isDone}
            style={[styles.chipText, { color: task.isDone ? colors.textFaint : "#FFFFFF" }]}
          >
            {task.title}
          </AppText>
        </View>
      ))}

      {more > 0 ? (
        <AppText variant="label" tone="muted" style={styles.chipText} numberOfLines={1}>
          {t("calendar.more", { n: more })}
        </AppText>
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.lg, paddingBottom: 120, gap: space.md },
  grid: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, overflow: "hidden" },
  weekRow: { borderBottomWidth: StyleSheet.hairlineWidth },
  lastRow: { borderBottomWidth: 0 },
  weekday: { flex: 1, paddingVertical: 6, fontSize: 10, lineHeight: 14 },
  cell: { flex: 1, minWidth: 0, minHeight: 86, paddingHorizontal: 2, paddingBottom: 4, gap: 2 },
  dayNumber: {
    alignSelf: "center",
    width: 22,
    height: 22,
    borderRadius: 11,
    marginTop: 3,
    marginBottom: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  chip: { borderRadius: 4, paddingHorizontal: 3 },
  chipText: { fontSize: 9, lineHeight: 14 },
  faded: { opacity: 0.5 },
  dayList: { gap: space.sm },
  dayTitle: { textTransform: "uppercase" },
});
