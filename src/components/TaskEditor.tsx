/**
 * Create / edit task sheet. Fast path: type a title and press Save (date defaults
 * to where you opened it from). Date, time, duration and one priority choice are
 * always visible; category, notes and delete sit behind "More options".
 */
import { useEffect, useMemo, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import {
  CATEGORIES,
  DURATION_PRESETS,
  NOTES_MAX,
  TITLE_MAX,
  emptyTaskInput,
  hasErrors,
  taskToInput,
  validateTaskInput,
} from "@/domain/task";
import type { Task, TaskErrors, TaskInput } from "@/domain/task";
import { QUADRANTS, quadrantFields, quadrantOf, quickDates } from "@/domain/selectors";
import type { Quadrant } from "@/domain/selectors";
import { dateToTime, formatShortDate, formatTime, parseDateKey, toDateKey, todayKey } from "@/lib/date";
import type { StringKey } from "@/i18n/strings";
import { useI18n } from "@/i18n/I18nProvider";
import { usePreferences } from "@/state/PreferencesProvider";
import { useTheme } from "@/theme/ThemeProvider";
import { space } from "@/theme/tokens";
import { AppText } from "./ui/AppText";
import { Button } from "./ui/Button";
import { ChipRow } from "./ui/Chip";
import type { IconName } from "./ui/Button";
import { Sheet } from "./ui/Sheet";
import { TextField } from "./ui/TextField";
import { CATEGORY_ICONS } from "./TaskCard";

interface TaskEditorProps {
  visible: boolean;
  task: Task | null;
  defaults?: Partial<TaskInput>;
  onClose: () => void;
  onSave: (input: TaskInput) => void;
  onDelete?: (task: Task) => void;
}

type DateChoice = "none" | "today" | "tomorrow" | "custom";

export const LEVEL_ICONS: Record<Quadrant, IconName> = {
  do: "flash",
  schedule: "star",
  delegate: "time",
  eliminate: "ellipse-outline",
};

export function TaskEditor({ visible, task, defaults, onClose, onSave, onDelete }: TaskEditorProps) {
  const { t, lang, row } = useI18n();
  const { prefs } = usePreferences();
  const { colors } = useTheme();
  const levelColors: Record<Quadrant, string> = {
    do: colors.danger,
    schedule: colors.success,
    delegate: colors.warning,
    eliminate: colors.textMuted,
  };

  const [input, setInput] = useState<TaskInput>(emptyTaskInput());
  const [errors, setErrors] = useState<TaskErrors>({});
  const [showMore, setShowMore] = useState(false);
  const [dateText, setDateText] = useState("");
  const [timeText, setTimeText] = useState("");

  // Reset the form each time the sheet opens.
  useEffect(() => {
    if (!visible) return;
    const initial = task ? taskToInput(task) : emptyTaskInput(defaults);
    setInput(initial);
    setErrors({});
    setShowMore(task !== null);
    setDateText(initial.date ?? "");
    setTimeText(initial.startTime ?? "");
  }, [visible, task, defaults]);

  const today = todayKey();
  const dates = quickDates(today);
  const dateChoice: DateChoice =
    input.date === null ? "none" : input.date === dates.today ? "today" : input.date === dates.tomorrow ? "tomorrow" : "custom";

  const set = <K extends keyof TaskInput>(key: K, value: TaskInput[K]) => {
    setInput((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const setDate = (date: string | null) => {
    set("date", date);
    setDateText(date ?? "");
    if (date === null) {
      set("startTime", null);
      setTimeText("");
    }
  };

  const pickDate = () => {
    if (Platform.OS !== "android") return; // other platforms use the text field below
    const current = (input.date && parseDateKey(input.date)) || new Date();
    DateTimePickerAndroid.open({
      value: current,
      mode: "date",
      onChange: (event, date) => {
        if (event.type === "set" && date) setDate(toDateKey(date));
      },
    });
  };

  const pickTime = () => {
    if (Platform.OS !== "android") return;
    // A time needs a day: default to today when none is chosen yet.
    if (input.date === null) setDate(dates.today);
    const base = new Date();
    if (input.startTime) {
      const [h, m] = input.startTime.split(":").map(Number);
      base.setHours(h, m, 0, 0);
    }
    DateTimePickerAndroid.open({
      value: base,
      mode: "time",
      is24Hour: prefs.timeFormat === "24h",
      onChange: (event, date) => {
        if (event.type === "set" && date) {
          const value = dateToTime(date);
          set("startTime", value);
          setTimeText(value);
        }
      },
    });
  };

  const save = () => {
    const found = validateTaskInput(input);
    setErrors(found);
    if (hasErrors(found)) {
      // Make sure the field with the problem is visible.
      if (found.date || found.startTime || found.durationMin || found.notes) setShowMore(true);
      return;
    }
    onSave(input);
  };

  const errorText = (key: keyof TaskInput) => (errors[key] ? t(`error.${errors[key]}` as StringKey) : undefined);

  const dateOptions = useMemo(
    () => [
      { value: "none" as const, label: t("editor.noDate") },
      { value: "today" as const, label: t("editor.today") },
      { value: "tomorrow" as const, label: t("editor.tomorrow") },
      {
        value: "custom" as const,
        label:
          dateChoice === "custom" && input.date
            ? formatShortDate(parseDateKey(input.date) ?? new Date(), lang)
            : t("editor.pickDate"),
        icon: "calendar-outline" as const,
      },
    ],
    [t, dateChoice, input.date, lang],
  );

  const isAndroid = Platform.OS === "android";

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      footer={
        <View style={[styles.footer, { flexDirection: row }]}>
          <Button label={t("editor.cancel")} variant="secondary" onPress={onClose} style={styles.flex} />
          <Button label={t("editor.save")} icon="checkmark" onPress={save} style={styles.flex} />
        </View>
      }
    >
      <AppText variant="heading">{task ? t("editor.edit") : t("editor.new")}</AppText>

      <TextField
        label={t("editor.title")}
        placeholder={t("editor.titlePlaceholder")}
        value={input.title}
        onChangeText={(v) => set("title", v)}
        maxLength={TITLE_MAX}
        autoFocus={task === null}
        returnKeyType="done"
        onSubmitEditing={save}
        error={errorText("title")}
      />

      <View style={styles.group}>
        <AppText variant="label" tone="muted">
          {t("editor.date")}
        </AppText>
        <ChipRow
          options={dateOptions}
          value={dateChoice}
          onChange={(choice) => {
            if (choice === "none") setDate(null);
            else if (choice === "today") setDate(dates.today);
            else if (choice === "tomorrow") setDate(dates.tomorrow);
            else if (isAndroid) pickDate();
            else setDate(input.date ?? dates.nextWeek);
          }}
        />
        {!isAndroid && dateChoice === "custom" ? (
          <TextField
            label={t("editor.date")}
            hint={t("editor.dateFormatHint")}
            value={dateText}
            onChangeText={(v) => {
              setDateText(v);
              set("date", v.trim() === "" ? null : v.trim());
            }}
            autoCapitalize="none"
            keyboardType="numbers-and-punctuation"
            error={errorText("date")}
          />
        ) : errors.date ? (
          <AppText variant="caption" tone="danger">
            {errorText("date")}
          </AppText>
        ) : null}
      </View>

      <View style={styles.group}>
        <AppText variant="label" tone="muted">
          {t("editor.time")}
        </AppText>
        {isAndroid ? (
          <ChipRow
            options={[
              { value: "none", label: t("editor.noTime") },
              {
                value: "pick",
                label: input.startTime
                  ? formatTime(input.startTime, prefs.timeFormat, lang)
                  : t("editor.pickTime"),
                icon: "time-outline",
              },
            ]}
            value={input.startTime ? "pick" : "none"}
            onChange={(v) => {
              if (v === "none") {
                set("startTime", null);
                setTimeText("");
              } else pickTime();
            }}
          />
        ) : (
          <TextField
            label={t("editor.time")}
            hint={t("editor.timeFormatHint")}
            value={timeText}
            onChangeText={(v) => {
              setTimeText(v);
              set("startTime", v.trim() === "" ? null : v.trim());
              if (input.date === null && v.trim() !== "") setDate(dates.today);
            }}
            keyboardType="numbers-and-punctuation"
            error={errorText("startTime")}
          />
        )}
        {isAndroid && errors.startTime ? (
          <AppText variant="caption" tone="danger">
            {errorText("startTime")}
          </AppText>
        ) : null}
      </View>

      <View style={styles.group}>
        <AppText variant="label" tone="muted">
          {t("editor.duration")}
        </AppText>
        <ChipRow
          options={[
            { value: 0, label: "—" },
            ...DURATION_PRESETS.map((n) => ({ value: n, label: t("task.minutes", { n }) })),
          ]}
          value={input.durationMin ?? 0}
          onChange={(n) => set("durationMin", n === 0 ? null : n)}
        />
      </View>

      <View style={styles.group}>
        <AppText variant="label" tone="muted">
          {t("editor.priority")}
        </AppText>
        <ChipRow
          options={QUADRANTS.map((q) => ({
            value: q,
            label: t(`level.${q}`),
            color: levelColors[q],
            icon: LEVEL_ICONS[q],
          }))}
          value={quadrantOf(input)}
          onChange={(q) => {
            const fields = quadrantFields(q);
            set("important", fields.important);
            set("urgent", fields.urgent);
            set("priority", fields.priority);
          }}
        />
        <AppText variant="label" tone="faint">
          {t("editor.priorityHint")}
        </AppText>
      </View>

      <View style={{ flexDirection: row }}>
        <Button
          label={showMore ? t("editor.less") : t("editor.more")}
          icon={showMore ? "chevron-up" : "chevron-down"}
          variant="ghost"
          onPress={() => setShowMore((v) => !v)}
          accessibilityState={{ expanded: showMore }}
          style={styles.moreButton}
        />
      </View>

      {showMore ? (
        <>
          <View style={styles.group}>
            <AppText variant="label" tone="muted">
              {t("editor.category")}
            </AppText>
            <ChipRow
              options={CATEGORIES.map((c) => ({
                value: c,
                label: t(`category.${c}`),
                color: colors.category[c],
                icon: CATEGORY_ICONS[c],
              }))}
              value={input.category}
              onChange={(c) => set("category", c)}
            />
          </View>

          <TextField
            label={t("editor.notes")}
            placeholder={t("editor.notesPlaceholder")}
            value={input.notes}
            onChangeText={(v) => set("notes", v)}
            multiline
            maxLength={NOTES_MAX}
            error={errorText("notes")}
          />

          {task && onDelete ? (
            <Button label={t("editor.delete")} icon="trash-outline" variant="danger" onPress={() => onDelete(task)} />
          ) : null}
        </>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  group: { gap: space.sm },
  footer: { gap: space.md },
  flex: { flex: 1 },
  moreButton: { paddingHorizontal: 0, minHeight: 36 },
});
