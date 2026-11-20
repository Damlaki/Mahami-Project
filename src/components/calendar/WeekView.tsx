/**
 * Google Calendar-style week: hours down the side, one column per day, timed
 * tasks as blocks whose position and height come from their start time and
 * duration (overlaps share the width), tasks without a time in a strip at the
 * top, a "now" line on today, and tap an empty slot to plan a task there.
 */
import { useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import type { GestureResponderEvent } from "react-native";
import { layoutDay, tasksByDay, weekDays, WEEK_START } from "@/domain/calendar";
import type { DayBlock } from "@/domain/calendar";
import type { Task } from "@/domain/task";
import {
  addDays,
  formatHourLabel,
  formatLongDate,
  formatMonthYear,
  formatTime,
  formatWeekdayShort,
  minutesToTime,
  parseDateKey,
  startOfWeek,
} from "@/lib/date";
import { useTasks } from "@/state/TasksProvider";
import { useUI } from "@/state/UIProvider";
import { usePreferences } from "@/state/PreferencesProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeProvider";
import { space } from "@/theme/tokens";
import { AppText } from "@/components/ui/AppText";
import { LoadState } from "@/components/LoadState";
import { useNow } from "@/components/LiveClock";
import { CalendarNav } from "./CalendarNav";

const HOUR_H = 48; // height of one hour in the grid
const TIME_COL = 44; // width of the hour labels
const SLOT_MIN = 30; // tapping an empty spot snaps to half hours
const MAX_ANYTIME = 2; // no-time chips per day before "+N"
const HOURS = Array.from({ length: 24 }, (_, h) => h);

interface WeekViewProps {
  header: ReactNode;
  selected: string;
  today: string;
  onSelect: (day: string) => void;
  /** Open the full list for one day (used by the "+N" in the top strip) */
  onShowDay: (day: string) => void;
}

export function WeekView({ header, selected, today, onSelect, onShowDay }: WeekViewProps) {
  const { tasks, status } = useTasks();
  const { openEditor } = useUI();
  const { prefs } = usePreferences();
  const { t, lang, row } = useI18n();
  const { colors } = useTheme();

  const now = useNow(60_000);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const weekStart = startOfWeek(selected, WEEK_START);
  const days = useMemo(() => weekDays(weekStart, WEEK_START), [weekStart]);
  const blocks = useMemo(() => new Map(days.map((d) => [d, layoutDay(tasks, d)])), [tasks, days]);
  const anytime = useMemo(() => {
    const byDay = tasksByDay(tasks);
    return new Map(days.map((d) => [d, (byDay.get(d) ?? []).filter((task) => task.startTime === null)]));
  }, [tasks, days]);
  const hasAnytime = days.some((d) => (anytime.get(d)?.length ?? 0) > 0);
  const todayInWeek = days.includes(today);

  // Open the grid near the current hour (or the morning) when the week changes.
  const scrollRef = useRef<ScrollView>(null);
  const startHour = todayInWeek ? Math.max(0, now.getHours() - 1) : 7;
  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      scrollRef.current?.scrollTo({ y: startHour * HOUR_H, animated: false }),
    );
    return () => cancelAnimationFrame(frame);
    // Only when switching weeks or once tasks have loaded (the grid isn't
    // mounted while loading): don't yank the grid while the user scrolls.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart, status]);

  const createAt = (day: string, minutes: number) => {
    onSelect(day);
    openEditor(null, { date: day, startTime: minutesToTime(minutes), durationMin: SLOT_MIN });
  };

  return (
    <View style={styles.flex}>
      {/* Fixed part: title, navigation, day names, no-time tasks */}
      <View style={styles.top}>
        {header}
        <CalendarNav
          title={formatMonthYear(parseDateKey(selected) ?? now, lang)}
          showToday={selected !== today}
          onToday={() => onSelect(today)}
          onPrev={() => onSelect(addDays(selected, -7))}
          onNext={() => onSelect(addDays(selected, 7))}
          prevLabel={t("timeline.prevWeek")}
          nextLabel={t("timeline.nextWeek")}
        />

        <View style={[styles.daysRow, { flexDirection: row }]}>
          <View style={styles.timeCol} />
          {days.map((key) => {
            const date = parseDateKey(key)!;
            const isToday = key === today;
            const isSelected = key === selected;
            return (
              <Pressable
                key={key}
                onPress={() => onSelect(key)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={formatLongDate(date, lang)}
                style={[styles.dayHead, isSelected && { backgroundColor: colors.primarySoft }]}
              >
                <AppText
                  variant="label"
                  align="center"
                  tone={isToday ? "primary" : "muted"}
                  style={styles.dayName}
                  numberOfLines={1}
                >
                  {formatWeekdayShort(date, lang)}
                </AppText>
                <View style={[styles.dayNumber, isToday && { backgroundColor: colors.primary }]}>
                  <AppText variant="bodyStrong" align="center" style={{ color: isToday ? colors.onPrimary : colors.text }}>
                    {date.getDate()}
                  </AppText>
                </View>
              </Pressable>
            );
          })}
        </View>

        {hasAnytime ? (
          <View style={[styles.anytimeRow, { flexDirection: row, borderColor: colors.border }]}>
            <View style={styles.timeCol}>
              <AppText variant="label" tone="faint" align="center" style={styles.anytimeLabel} numberOfLines={2}>
                {t("timeline.anytime")}
              </AppText>
            </View>
            {days.map((key) => (
              <AnytimeColumn
                key={key}
                tasks={anytime.get(key) ?? []}
                onOpen={openEditor}
                onMore={() => onShowDay(key)}
                moreLabel={t("calendar.showDay", {
                  count: anytime.get(key)?.length ?? 0,
                  day: formatLongDate(parseDateKey(key)!, lang),
                })}
              />
            ))}
          </View>
        ) : null}
      </View>

      <LoadState>
        <ScrollView ref={scrollRef} style={styles.flex} contentContainerStyle={styles.scrollContent}>
          <View style={[styles.grid, { flexDirection: row }]}>
            {/* Hour labels */}
            <View style={styles.timeCol}>
              {HOURS.map((h) =>
                h === 0 ? null : (
                  <AppText
                    key={h}
                    variant="label"
                    tone="faint"
                    align="center"
                    style={[styles.hourLabel, { top: h * HOUR_H - 8 }]}
                  >
                    {formatHourLabel(h, prefs.timeFormat, lang)}
                  </AppText>
                ),
              )}
            </View>

            {/* Day columns, with the hour lines drawn behind them */}
            <View style={[styles.columns, { flexDirection: row }]}>
              <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                {HOURS.map((h) => (
                  <View key={h} style={[styles.hourLine, { top: h * HOUR_H, backgroundColor: colors.border }]} />
                ))}
              </View>

              {days.map((key) => (
                <DayColumn
                  key={key}
                  day={key}
                  blocks={blocks.get(key) ?? []}
                  isToday={key === today}
                  nowMinutes={nowMinutes}
                  onCreate={createAt}
                  onOpen={openEditor}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      </LoadState>
    </View>
  );
}

function DayColumn({
  day,
  blocks,
  isToday,
  nowMinutes,
  onCreate,
  onOpen,
}: {
  day: string;
  blocks: DayBlock[];
  isToday: boolean;
  nowMinutes: number;
  onCreate: (day: string, minutes: number) => void;
  onOpen: (task: Task) => void;
}) {
  const { colors } = useTheme();
  const { t, lang, side } = useI18n();
  const { prefs } = usePreferences();
  const startSide = side("start");

  const onPressEmpty = (e: GestureResponderEvent) => {
    const slot = Math.floor(e.nativeEvent.locationY / ((HOUR_H * SLOT_MIN) / 60));
    const minutes = Math.min(1440 - SLOT_MIN, Math.max(0, slot * SLOT_MIN));
    onCreate(day, minutes);
  };

  return (
    <Pressable
      onPress={onPressEmpty}
      accessibilityLabel={t("calendar.addOn", { day: formatLongDate(parseDateKey(day)!, lang) })}
      style={[
        styles.dayColumn,
        { borderColor: colors.border },
        isToday && { backgroundColor: colors.primarySoft },
      ]}
    >
      {blocks.map((block) => {
        const { task, start, end, lane, lanes } = block;
        const height = Math.max(16, ((end - start) / 60) * HOUR_H - 2);
        const offset = `${(lane * 100) / lanes}%` as const;
        const accent = colors.category[task.category];
        const time = task.startTime ? formatTime(task.startTime, prefs.timeFormat, lang) : "";
        return (
          <Pressable
            key={task.id}
            onPress={() => onOpen(task)}
            accessibilityRole="button"
            accessibilityLabel={`${time}, ${t("task.open", { title: task.title })}`}
            style={[
              styles.block,
              startSide === "start" ? { start: offset } : { end: offset },
              { top: (start / 60) * HOUR_H + 1, height, width: `${100 / lanes}%` as const },
            ]}
          >
            <View
              style={[
                styles.blockInner,
                {
                  backgroundColor: task.isDone ? colors.surfaceAlt : accent,
                  borderColor: task.isDone ? accent : "transparent",
                },
              ]}
            >
              <AppText
                strike={task.isDone}
                numberOfLines={Math.max(1, Math.floor((height - 4) / 12))}
                style={[styles.blockText, { color: task.isDone ? colors.textFaint : "#FFFFFF" }]}
              >
                {task.title}
              </AppText>
            </View>
          </Pressable>
        );
      })}

      {isToday ? (
        <View pointerEvents="none" style={[styles.nowLine, { top: (nowMinutes / 60) * HOUR_H, backgroundColor: colors.primary }]}>
          <View style={[styles.nowDot, startSide === "start" ? { start: -4 } : { end: -4 }, { backgroundColor: colors.primary }]} />
        </View>
      ) : null}
    </Pressable>
  );
}

function AnytimeColumn({
  tasks,
  onOpen,
  onMore,
  moreLabel,
}: {
  tasks: Task[];
  onOpen: (task: Task) => void;
  onMore: () => void;
  moreLabel: string;
}) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const shown = tasks.length > MAX_ANYTIME ? tasks.slice(0, MAX_ANYTIME - 1) : tasks;
  const more = tasks.length - shown.length;

  return (
    <View style={styles.anytimeCol}>
      {shown.map((task) => (
        <Pressable
          key={task.id}
          onPress={() => onOpen(task)}
          accessibilityRole="button"
          accessibilityLabel={t("task.open", { title: task.title })}
          style={[styles.anytimeChip, { backgroundColor: task.isDone ? colors.surfaceAlt : colors.category[task.category] }]}
        >
          <AppText
            numberOfLines={1}
            strike={task.isDone}
            style={[styles.blockText, { color: task.isDone ? colors.textFaint : "#FFFFFF" }]}
          >
            {task.title}
          </AppText>
        </Pressable>
      ))}
      {more > 0 ? (
        <Pressable onPress={onMore} accessibilityRole="button" accessibilityLabel={moreLabel} hitSlop={4}>
          <AppText variant="label" tone="primary" align="center" style={styles.blockText}>
            {t("calendar.more", { n: more })}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: { paddingHorizontal: space.lg, gap: space.sm },
  daysRow: { alignItems: "stretch" },
  timeCol: { width: TIME_COL },
  dayHead: { flex: 1, minWidth: 0, alignItems: "center", paddingVertical: 4, borderRadius: 10 },
  dayName: { fontSize: 10, lineHeight: 14 },
  dayNumber: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  anytimeRow: { borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: space.xs },
  anytimeLabel: { fontSize: 9, lineHeight: 12 },
  anytimeCol: { flex: 1, minWidth: 0, gap: 2, paddingHorizontal: 1 },
  anytimeChip: { borderRadius: 4, paddingHorizontal: 3 },
  scrollContent: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: 120 },
  grid: { height: 24 * HOUR_H },
  hourLabel: { position: "absolute", left: 0, right: 0, fontSize: 9, lineHeight: 16 },
  columns: { flex: 1 },
  hourLine: { position: "absolute", left: 0, right: 0, height: StyleSheet.hairlineWidth },
  dayColumn: { flex: 1, minWidth: 0, borderStartWidth: StyleSheet.hairlineWidth },
  block: { position: "absolute", paddingHorizontal: 1 },
  blockInner: { flex: 1, borderRadius: 4, borderWidth: 1, paddingHorizontal: 2, paddingTop: 1, overflow: "hidden" },
  blockText: { fontSize: 9, lineHeight: 12 },
  nowLine: { position: "absolute", left: 0, right: 0, height: 2 },
  nowDot: { position: "absolute", top: -3, width: 8, height: 8, borderRadius: 4 },
});
