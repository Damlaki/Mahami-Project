/**
 * Eisenhower matrix: open tasks split by important × urgent, in a 2×2 grid.
 * Tap a task to edit it (and move it by toggling Important / Urgent),
 * tap the circle to complete it, tap + to add a task straight into a quadrant.
 */
import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { QUADRANTS, groupByQuadrant, quadrantFlags } from "@/domain/selectors";
import type { Quadrant } from "@/domain/selectors";
import type { Task } from "@/domain/task";
import { formatShortDate, formatTime, parseDateKey } from "@/lib/date";
import { useTasks } from "@/state/TasksProvider";
import { useUI } from "@/state/UIProvider";
import { usePreferences } from "@/state/PreferencesProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space } from "@/theme/tokens";
import { Screen } from "@/components/ui/Screen";
import { AppText } from "@/components/ui/AppText";
import { IconButton } from "@/components/ui/Button";
import type { IconName } from "@/components/ui/Button";
import { LoadState } from "@/components/LoadState";

const VISIBLE_PER_QUADRANT = 6;

const ICONS: Record<Quadrant, IconName> = {
  do: "flash",
  schedule: "calendar",
  delegate: "people",
  eliminate: "cafe",
};

export default function MatrixScreen() {
  const { tasks } = useTasks();
  const { t, row } = useI18n();
  const groups = useMemo(() => groupByQuadrant(tasks), [tasks]);

  // Two rows of two cards; `row` mirrors the grid for Arabic.
  const rows: Quadrant[][] = [QUADRANTS.slice(0, 2), QUADRANTS.slice(2, 4)];

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="title">{t("matrix.title")}</AppText>
        <AppText variant="caption" tone="muted">
          {t("matrix.subtitle")}
        </AppText>
      </View>

      <LoadState>
        <View style={styles.grid}>
          {rows.map((pair, i) => (
            <View key={i} style={[styles.gridRow, { flexDirection: row }]}>
              {pair.map((q) => (
                <QuadrantCard key={q} quadrant={q} tasks={groups[q]} />
              ))}
            </View>
          ))}
        </View>
      </LoadState>
    </Screen>
  );
}

function QuadrantCard({ quadrant, tasks }: { quadrant: Quadrant; tasks: Task[] }) {
  const { colors } = useTheme();
  const { t, row } = useI18n();
  const { openEditor } = useUI();
  const { toggleDone } = useTasks();

  const accent = {
    do: colors.danger,
    schedule: colors.success,
    delegate: colors.warning,
    eliminate: colors.textMuted,
  }[quadrant];
  const name = t(`matrix.${quadrant}`);
  const hidden = tasks.length - VISIBLE_PER_QUADRANT;

  return (
    <View
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      accessibilityLabel={`${name}, ${tasks.length}`}
    >
      <View style={[styles.accentBar, { backgroundColor: accent }]} />

      <View style={[styles.cardHeader, { flexDirection: row }]}>
        <View style={[styles.badge, { backgroundColor: accent }]}>
          <Ionicons name={ICONS[quadrant]} size={13} color="#FFFFFF" />
        </View>
        <View style={styles.flex}>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {name}
          </AppText>
          <AppText variant="label" tone="faint" numberOfLines={1} style={styles.hint}>
            {t(`matrix.${quadrant}.hint`)}
          </AppText>
        </View>
        <IconButton
          icon="add"
          size={18}
          color={accent}
          accessibilityLabel={t("matrix.add", { name })}
          onPress={() => openEditor(null, quadrantFlags(quadrant))}
          style={styles.addButton}
        />
      </View>

      {tasks.length === 0 ? (
        <AppText variant="caption" tone="faint" align="center" style={styles.empty}>
          {t("matrix.empty")}
        </AppText>
      ) : (
        <View style={styles.list}>
          {tasks.slice(0, VISIBLE_PER_QUADRANT).map((task) => (
            <MatrixRow key={task.id} task={task} accent={accent} onToggle={toggleDone} onOpen={openEditor} />
          ))}
          {hidden > 0 ? (
            <AppText variant="label" tone="muted">
              {t("matrix.more", { n: hidden })}
            </AppText>
          ) : null}
        </View>
      )}
    </View>
  );
}

function MatrixRow({
  task,
  accent,
  onToggle,
  onOpen,
}: {
  task: Task;
  accent: string;
  onToggle: (id: string) => void;
  onOpen: (task: Task) => void;
}) {
  const { t, row, lang } = useI18n();
  const { prefs } = usePreferences();

  const meta: string[] = [];
  if (task.date) {
    const d = parseDateKey(task.date);
    if (d) meta.push(formatShortDate(d, lang));
  }
  if (task.startTime) meta.push(formatTime(task.startTime, prefs.timeFormat, lang));

  return (
    <Pressable
      onPress={() => onOpen(task)}
      accessibilityRole="button"
      accessibilityLabel={t("task.open", { title: task.title })}
      style={({ pressed }) => [styles.row, { flexDirection: row, opacity: pressed ? 0.7 : 1 }]}
    >
      <Pressable
        onPress={() => onToggle(task.id)}
        hitSlop={8}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: task.isDone }}
        accessibilityLabel={t("task.markDone", { title: task.title })}
        style={[styles.check, { borderColor: accent }]}
      />
      <View style={styles.flex}>
        <AppText variant="caption" numberOfLines={2}>
          {task.title}
        </AppText>
        {meta.length ? (
          <AppText variant="label" tone="faint" numberOfLines={1} style={styles.hint}>
            {meta.join(" · ")}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  header: { gap: 2 },
  grid: { gap: space.md },
  gridRow: { gap: space.md },
  card: {
    flex: 1,
    minHeight: 210,
    borderRadius: radius.md + 2,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    paddingBottom: space.md,
  },
  accentBar: { height: 4 },
  cardHeader: { alignItems: "center", gap: space.sm, paddingHorizontal: space.sm, paddingTop: space.sm },
  badge: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  hint: { fontSize: 10, lineHeight: 14 },
  addButton: { width: 36, height: 36 },
  empty: { marginTop: space.xl },
  list: { gap: space.sm, paddingHorizontal: space.md, paddingTop: space.sm },
  row: { alignItems: "flex-start", gap: space.sm },
  check: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, marginTop: 2 },
});
