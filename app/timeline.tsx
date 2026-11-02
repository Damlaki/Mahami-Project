/**
 * Structured-style day timeline: a week strip to pick the day, then the day's
 * tasks as colored capsules on a vertical rail (taller for longer tasks),
 * free time between them, and a live "now" line on today.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { buildTimeline, blockStatus, splitDuration } from "@/domain/timeline";
import type { TimelineEntry } from "@/domain/timeline";
import type { Task } from "@/domain/task";
import {
  addDays,
  formatLongDate,
  formatMonthYear,
  formatTime,
  formatWeekdayShort,
  minutesToTime,
  parseDateKey,
  startOfWeek,
  toDateKey,
} from "@/lib/date";
import type { StringKey } from "@/i18n/strings";
import { useTasks } from "@/state/TasksProvider";
import { useUI } from "@/state/UIProvider";
import { usePreferences } from "@/state/PreferencesProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space } from "@/theme/tokens";
import { AppText } from "@/components/ui/AppText";
import { IconButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Fab } from "@/components/ui/Fab";
import { LoadState } from "@/components/LoadState";
import { CATEGORY_ICONS } from "@/components/TaskCard";
import { useNow } from "@/components/LiveClock";

const TIME_COL = 46;
const RAIL_COL = 48;
const PILL_W = 40;

type T = (key: StringKey, params?: Record<string, string | number>) => string;

function durationLabel(minutes: number, t: T): string {
  const { h, m } = splitDuration(minutes);
  if (h === 0) return t("task.minutes", { n: m });
  return m === 0 ? t("duration.h", { h }) : t("duration.hm", { h, m });
}

/** Capsule height grows with duration, within readable limits. */
function pillHeight(minutes: number): number {
  return Math.max(48, Math.min(170, Math.round(minutes * 1.1)));
}

export default function TimelineScreen() {
  const now = useNow(30_000);
  const today = toDateKey(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const [day, setDay] = useState(today);
  const { tasks, toggleDone } = useTasks();
  const { openEditor } = useUI();
  const { t, lang, row, dir } = useI18n();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const isToday = day === today;
  const timeline = useMemo(
    () => buildTimeline(tasks, day, isToday ? nowMinutes : null),
    [tasks, day, isToday, nowMinutes],
  );
  const dayIsPast = day < today;

  // Week strip
  const weekStart = startOfWeek(day, 1);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const dotsByDay = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const task of tasks) {
      if (!task.date) continue;
      const list = map.get(task.date) ?? [];
      if (list.length < 3) list.push(colors.category[task.category]);
      map.set(task.date, list);
    }
    return map;
  }, [tasks, colors]);

  // Scroll the "now" line into view when opening today.
  const scrollRef = useRef<ScrollView>(null);
  const scrolledFor = useRef<string | null>(null);
  const timelineY = useRef(0);
  useEffect(() => {
    scrolledFor.current = null;
  }, [day]);

  const add = () => {
    const nextHour = Math.min(23, now.getHours() + 1);
    openEditor(null, {
      date: day,
      startTime: isToday ? minutesToTime(nextHour * 60) : "09:00",
      durationMin: 30,
    });
  };

  const selectedDate = parseDateKey(day) ?? now;
  const hasAnything = timeline.anytime.length > 0 || timeline.entries.some((e) => e.kind === "task");

  return (
    <View style={styles.flex}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + space.md }]}
      >
        {/* Month + navigation */}
        <View style={[styles.header, { flexDirection: row }]}>
          <AppText variant="title" style={styles.flex}>
            {formatMonthYear(selectedDate, lang)}
          </AppText>
          {!isToday ? (
            <Pressable
              onPress={() => setDay(today)}
              accessibilityRole="button"
              style={[styles.todayButton, { borderColor: colors.border }]}
            >
              <AppText variant="label" tone="primary">
                {t("timeline.today")}
              </AppText>
            </Pressable>
          ) : null}
          <IconButton
            icon={dir === 1 ? "chevron-back" : "chevron-forward"}
            size={20}
            accessibilityLabel={t("timeline.prevWeek")}
            onPress={() => setDay(addDays(day, -7))}
          />
          <IconButton
            icon={dir === 1 ? "chevron-forward" : "chevron-back"}
            size={20}
            accessibilityLabel={t("timeline.nextWeek")}
            onPress={() => setDay(addDays(day, 7))}
          />
        </View>

        {/* Week strip */}
        <View style={[styles.week, { flexDirection: row }]}>
          {weekDays.map((key) => {
            const date = parseDateKey(key)!;
            const selected = key === day;
            const isTodayKey = key === today;
            const dots = dotsByDay.get(key) ?? [];
            return (
              <Pressable
                key={key}
                onPress={() => setDay(key)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={formatLongDate(date, lang)}
                style={[
                  styles.dayCell,
                  selected && { backgroundColor: colors.primarySoft, borderColor: colors.primary },
                ]}
              >
                <AppText variant="label" tone={selected ? "primary" : "muted"} align="center" style={styles.dayName}>
                  {formatWeekdayShort(date, lang)}
                </AppText>
                <AppText
                  variant="bodyStrong"
                  align="center"
                  tone={selected || isTodayKey ? "primary" : "default"}
                >
                  {date.getDate()}
                </AppText>
                <View style={styles.dots}>
                  {dots.map((c, i) => (
                    <View key={i} style={[styles.dot, { backgroundColor: c }]} />
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>

        <AppText variant="caption" tone="muted">
          {formatLongDate(selectedDate, lang)}
        </AppText>

        <LoadState>
          {!hasAnything ? (
            <EmptyState
              icon="time-outline"
              message={`${t("timeline.empty")}\n${t("timeline.emptyHint")}`}
              actionLabel={t("empty.action")}
              onAction={add}
            />
          ) : null}

          {/* Anytime (no start time) */}
          {timeline.anytime.length > 0 ? (
            <View style={styles.anytime}>
              <AppText variant="label" tone="muted">
                {t("timeline.anytime")}
              </AppText>
              {timeline.anytime.map((task) => (
                <AnytimeRow key={task.id} task={task} onToggle={toggleDone} onOpen={openEditor} />
              ))}
            </View>
          ) : null}

          {/* Timeline */}
          <View style={styles.timeline} onLayout={(e) => (timelineY.current = e.nativeEvent.layout.y)}>
            {timeline.entries.map((entry, i) => (
              <EntryRow
                key={entry.kind === "task" ? entry.task.id : `${entry.kind}-${i}`}
                entry={entry}
                nowMinutes={isToday ? nowMinutes : dayIsPast ? 1440 * 2 : null}
                onToggle={toggleDone}
                onOpen={openEditor}
                durationText={(m) => durationLabel(m, t)}
                onNowLayout={(y) => {
                  if (scrolledFor.current === day) return;
                  scrolledFor.current = day;
                  // Children lay out before their parent; wait a frame so timelineY is known.
                  requestAnimationFrame(() =>
                    scrollRef.current?.scrollTo({ y: Math.max(0, timelineY.current + y - 200), animated: true }),
                  );
                }}
              />
            ))}
          </View>
        </LoadState>
      </ScrollView>
      <Fab onPress={add} accessibilityLabel={t("editor.new")} />
    </View>
  );
}

function EntryRow({
  entry,
  nowMinutes,
  onToggle,
  onOpen,
  durationText,
  onNowLayout,
}: {
  entry: TimelineEntry;
  nowMinutes: number | null;
  onToggle: (id: string) => void;
  onOpen: (task: Task) => void;
  durationText: (minutes: number) => string;
  onNowLayout: (y: number) => void;
}) {
  const { colors } = useTheme();
  const { t, row, lang } = useI18n();
  const { prefs } = usePreferences();
  const fmt = (minutes: number) => formatTime(minutesToTime(minutes), prefs.timeFormat, lang);

  if (entry.kind === "now") {
    return (
      <View
        style={[styles.row, styles.nowRow, { flexDirection: row }]}
        onLayout={(e) => onNowLayout(e.nativeEvent.layout.y)}
        accessibilityLabel={t("timeline.now", { time: fmt(entry.at) })}
      >
        <View style={styles.timeCol} />
        <View style={styles.railCol}>
          <View style={[styles.nowDot, { backgroundColor: colors.primary }]} />
        </View>
        <View style={[styles.nowLine, { backgroundColor: colors.primary }]} />
        <AppText variant="label" tone="primary">
          {t("timeline.now", { time: fmt(entry.at) })}
        </AppText>
      </View>
    );
  }

  if (entry.kind === "gap") {
    const minutes = entry.end - entry.start;
    return (
      <View style={[styles.row, { flexDirection: row, height: Math.max(34, Math.min(84, minutes * 0.25)) }]}>
        <View style={styles.timeCol} />
        <View style={styles.railCol}>
          <View style={styles.railDots}>
            {[0, 1, 2, 3, 4].map((i) => (
              <View key={i} style={[styles.railDot, { backgroundColor: colors.border }]} />
            ))}
          </View>
        </View>
        <View style={[styles.gapText, { flexDirection: row }]}>
          <Ionicons name="cafe-outline" size={13} color={colors.textFaint} />
          <AppText variant="label" tone="faint">
            {t("timeline.free", { d: durationText(minutes) })}
          </AppText>
        </View>
      </View>
    );
  }

  const { task, start, end, conflict } = entry;
  const accent = colors.category[task.category];
  const status = blockStatus(start, end, nowMinutes);
  const height = pillHeight(end - start);
  const meta = end > start ? `${fmt(start)} – ${fmt(end)} (${durationText(end - start)})` : fmt(start);

  return (
    <Pressable
      onPress={() => onOpen(task)}
      accessibilityRole="button"
      accessibilityLabel={`${meta}, ${task.title}`}
      style={({ pressed }) => [
        styles.row,
        { flexDirection: row, minHeight: height, opacity: pressed ? 0.75 : status === "past" && !task.isDone ? 0.6 : 1 },
      ]}
    >
      <View style={styles.timeCol}>
        <AppText variant="label" tone="muted" align="end">
          {fmt(start)}
        </AppText>
        {end > start ? (
          <AppText variant="label" tone="faint" align="end" style={styles.endTime}>
            {fmt(end)}
          </AppText>
        ) : null}
      </View>

      <View style={styles.railCol}>
        <View style={[styles.rail, { backgroundColor: colors.border }]} />
        <View
          style={[
            styles.pill,
            {
              height,
              backgroundColor: task.isDone ? colors.surfaceAlt : accent,
              borderColor: status === "current" ? colors.text : "transparent",
            },
          ]}
        >
          <Ionicons name={CATEGORY_ICONS[task.category]} size={17} color={task.isDone ? colors.textFaint : "#FFFFFF"} />
        </View>
      </View>

      <View style={styles.body}>
        <View style={[styles.metaRow, { flexDirection: row }]}>
          <AppText variant="label" tone="muted" numberOfLines={1} style={styles.shrink}>
            {meta}
          </AppText>
          {conflict ? (
            <View style={[styles.conflict, { backgroundColor: colors.dangerSoft }]}>
              <AppText variant="label" tone="danger" style={styles.conflictText}>
                {t("timeline.conflict")}
              </AppText>
            </View>
          ) : null}
        </View>
        <AppText variant="bodyStrong" strike={task.isDone} tone={task.isDone ? "faint" : "default"} numberOfLines={2}>
          {task.title}
        </AppText>
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
        style={[
          styles.check,
          { borderColor: accent, backgroundColor: task.isDone ? accent : "transparent" },
        ]}
      >
        {task.isDone ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
      </Pressable>
    </Pressable>
  );
}

function AnytimeRow({
  task,
  onToggle,
  onOpen,
}: {
  task: Task;
  onToggle: (id: string) => void;
  onOpen: (task: Task) => void;
}) {
  const { colors } = useTheme();
  const { t, row } = useI18n();
  const accent = colors.category[task.category];
  return (
    <Pressable
      onPress={() => onOpen(task)}
      accessibilityRole="button"
      accessibilityLabel={t("task.open", { title: task.title })}
      style={({ pressed }) => [
        styles.anytimeRow,
        { flexDirection: row, backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <View style={[styles.smallPill, { backgroundColor: task.isDone ? colors.surfaceAlt : accent }]}>
        <Ionicons name={CATEGORY_ICONS[task.category]} size={13} color={task.isDone ? colors.textFaint : "#FFFFFF"} />
      </View>
      <AppText
        variant="body"
        strike={task.isDone}
        tone={task.isDone ? "faint" : "default"}
        numberOfLines={1}
        style={styles.flex}
      >
        {task.title}
      </AppText>
      <Pressable
        onPress={() => onToggle(task.id)}
        hitSlop={10}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: task.isDone }}
        accessibilityLabel={t(task.isDone ? "task.markUndone" : "task.markDone", { title: task.title })}
        style={[styles.check, { borderColor: accent, backgroundColor: task.isDone ? accent : "transparent" }]}
      >
        {task.isDone ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  shrink: { flexShrink: 1 },
  content: { paddingHorizontal: space.lg, paddingBottom: 120, gap: space.md },
  header: { alignItems: "center", gap: 2 },
  todayButton: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 4,
  },
  week: { justifyContent: "space-between", gap: 4 },
  dayCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "transparent",
  },
  dayName: { fontSize: 10, lineHeight: 14 },
  dots: { flexDirection: "row", gap: 2, height: 5, marginTop: 2 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  anytime: { gap: space.sm },
  anytimeRow: {
    alignItems: "center",
    gap: space.md,
    padding: space.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  smallPill: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  timeline: { marginTop: space.sm },
  row: { alignItems: "stretch", gap: space.sm },
  timeCol: { width: TIME_COL, paddingTop: 2 },
  endTime: { marginTop: "auto" },
  railCol: { width: RAIL_COL, alignItems: "center" },
  rail: { position: "absolute", top: 0, bottom: 0, width: 2 },
  railDots: { flex: 1, justifyContent: "space-evenly", alignItems: "center", paddingVertical: 2 },
  railDot: { width: 3, height: 3, borderRadius: 1.5 },
  pill: {
    width: PILL_W,
    borderRadius: PILL_W / 2,
    alignItems: "center",
    paddingTop: 13,
    borderWidth: 2,
    marginVertical: 4,
  },
  body: { flex: 1, minWidth: 0, paddingVertical: 6, gap: 1 },
  metaRow: { alignItems: "center", gap: 6 },
  conflict: { borderRadius: radius.pill, paddingHorizontal: 6 },
  conflictText: { fontSize: 10, lineHeight: 14 },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  gapText: { alignItems: "center", gap: 6 },
  nowRow: { alignItems: "center", height: 26 },
  nowDot: { width: 10, height: 10, borderRadius: 5 },
  nowLine: { flex: 1, height: 2, borderRadius: 1 },
});
