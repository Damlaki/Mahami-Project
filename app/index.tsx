import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { daySummary, filterTasks, nextUp, sortTasks } from "@/domain/selectors";
import { dayPart, formatLongDate, formatTime, toDateKey } from "@/lib/date";
import { useTasks } from "@/state/TasksProvider";
import { useUI } from "@/state/UIProvider";
import { usePreferences } from "@/state/PreferencesProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeProvider";
import { space } from "@/theme/tokens";
import { Screen } from "@/components/ui/Screen";
import { Card } from "@/components/ui/Card";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Fab } from "@/components/ui/Fab";
import { LoadState } from "@/components/LoadState";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SkyHero } from "@/components/SkyHero";
import { LiveClock, useNow } from "@/components/LiveClock";
import { TaskCard } from "@/components/TaskCard";

const TODAY_PREVIEW = 5;

export default function HomeScreen() {
  const router = useRouter();
  const { tasks, status, toggleDone } = useTasks();
  const { openEditor } = useUI();
  const { prefs } = usePreferences();
  const { t, lang, row } = useI18n();
  const { colors } = useTheme();

  // Minute precision is enough here; the clock component ticks on its own.
  const now = useNow(60_000);
  const today = toDateKey(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const summary = useMemo(() => daySummary(tasks, today), [tasks, today]);
  const next = useMemo(() => nextUp(tasks, today, nowMinutes), [tasks, today, nowMinutes]);
  const todayTasks = useMemo(() => sortTasks(filterTasks(tasks, "today", today)), [tasks, today]);
  const overdueCount = useMemo(() => filterTasks(tasks, "overdue", today).length, [tasks, today]);

  const name = prefs.displayName.trim();
  const greeting = t(`greeting.${dayPart(now.getHours())}`);

  const addForToday = () => openEditor(null, { date: today });

  return (
    <View style={styles.flex}>
      <Screen>
        <View style={[styles.header, { flexDirection: row }]}>
          <AppText variant="heading" tone="primary">
            {t("appName")}
          </AppText>
          <ThemeToggle />
        </View>

        <SkyHero>
          <View style={styles.heroText}>
            <AppText variant="title">
              {name ? `${greeting}${lang === "ar" ? "، " : ", "}${name}` : greeting}
            </AppText>
            <AppText variant="caption" tone="muted">
              {formatLongDate(now, lang)}
            </AppText>
          </View>
          <LiveClock />
        </SkyHero>

        <LoadState>
          {overdueCount > 0 ? (
            <Button
              label={t("home.overdueBanner", { count: overdueCount })}
              icon="alert-circle-outline"
              variant="danger"
              onPress={() => router.navigate({ pathname: "/tasks", params: { view: "overdue" } })}
            />
          ) : null}

          <Card style={styles.cardGap}>
            <View style={[styles.between, { flexDirection: row }]}>
              <AppText variant="heading">{t("home.today")}</AppText>
              {summary.total > 0 ? (
                <AppText variant="heading" tone="primary">
                  {summary.percent}%
                </AppText>
              ) : null}
            </View>
            {summary.total > 0 ? (
              <>
                <ProgressBar percent={summary.percent} />
                <AppText variant="caption" tone="muted">
                  {summary.remaining === 0
                    ? t("home.allDone")
                    : t("home.progress", { done: summary.done, total: summary.total })}
                </AppText>
              </>
            ) : (
              <AppText tone="muted">{t("home.noTasksToday")}</AppText>
            )}
          </Card>

          <Card style={[styles.cardGap, { flexDirection: row, alignItems: "center" }]}>
            <View style={[styles.nextIcon, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="arrow-forward" size={20} color={colors.primary} style={{ transform: [{ scaleX: lang === "ar" ? -1 : 1 }] }} />
            </View>
            <View style={styles.flexShrink}>
              <AppText variant="label" tone="muted">
                {t("home.nextUp")}
                {next
                  ? ` · ${
                      next.kind === "now"
                        ? t("home.now")
                        : next.kind === "later" && next.task.startTime
                          ? t("home.at", { time: formatTime(next.task.startTime, prefs.timeFormat, lang) })
                          : t("home.anytime")
                    }`
                  : ""}
              </AppText>
              <AppText variant="bodyStrong" numberOfLines={1}>
                {next ? next.task.title : t("home.nothingNext")}
              </AppText>
            </View>
          </Card>

          {todayTasks.length > 0 ? (
            <View style={styles.cardGap}>
              <View style={[styles.between, { flexDirection: row }]}>
                <AppText variant="heading">{t("home.todayList")}</AppText>
                <Button
                  label={t("home.seeAll")}
                  variant="ghost"
                  onPress={() => router.navigate({ pathname: "/tasks", params: { view: "today" } })}
                  style={styles.seeAll}
                />
              </View>
              {todayTasks.slice(0, TODAY_PREVIEW).map((task) => (
                <TaskCard key={task.id} task={task} overdue={false} onToggle={toggleDone} onOpen={openEditor} />
              ))}
            </View>
          ) : status === "ready" ? (
            <Button label={t("empty.action")} icon="add" variant="secondary" onPress={addForToday} />
          ) : null}
        </LoadState>
      </Screen>
      <Fab onPress={addForToday} accessibilityLabel={t("editor.new")} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexShrink: { flexShrink: 1 },
  header: { alignItems: "center", justifyContent: "space-between" },
  heroText: { gap: 0, maxWidth: "75%" },
  between: { alignItems: "center", justifyContent: "space-between" },
  cardGap: { gap: space.md },
  nextIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  seeAll: { minHeight: 32, paddingHorizontal: 0 },
});
