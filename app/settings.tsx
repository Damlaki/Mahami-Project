import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Share, StyleSheet, View } from "react-native";
import Constants from "expo-constants";
import { parseImport } from "@/domain/legacyImport";
import { NAME_MAX } from "@/domain/preferences";
import type { ThemeMode } from "@/domain/preferences";
import type { Lang, TimeFormat } from "@/lib/date";
import { usePreferences } from "@/state/PreferencesProvider";
import { useTasks } from "@/state/TasksProvider";
import { useUI } from "@/state/UIProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { space } from "@/theme/tokens";
import { Screen } from "@/components/ui/Screen";
import { Card } from "@/components/ui/Card";
import { AppText } from "@/components/ui/AppText";
import { Button } from "@/components/ui/Button";
import { ChipRow } from "@/components/ui/Chip";
import { TextField } from "@/components/ui/TextField";
import { ThemeToggle } from "@/components/ThemeToggle";

const THEME_MODES: ThemeMode[] = ["system", "light", "dark", "time"];

export default function SettingsScreen() {
  const { prefs, updatePrefs } = usePreferences();
  const { tasks, addMany, status } = useTasks();
  const { showToast } = useUI();
  const { t, row } = useI18n();

  const [name, setName] = useState(prefs.displayName);
  const [importText, setImportText] = useState("");
  const [importMessage, setImportMessage] = useState<{ text: string; error: boolean } | null>(null);

  useEffect(() => setName(prefs.displayName), [prefs.displayName]);

  const saveName = () => {
    const trimmed = name.trim();
    if (trimmed !== prefs.displayName) {
      updatePrefs({ displayName: trimmed });
      showToast({ message: t("toast.saved") });
    }
  };

  const runImport = () => {
    const result = parseImport(importText, tasks);
    if (!result.ok) {
      setImportMessage({ text: t(`settings.importError.${result.error}`), error: true });
      return;
    }
    addMany(result.tasks);
    setImportMessage({
      text: t("settings.importResult", {
        count: result.tasks.length,
        skipped: result.skipped,
        duplicates: result.duplicates,
      }),
      error: false,
    });
    if (result.tasks.length > 0) setImportText("");
  };

  const runExport = async () => {
    const payload = JSON.stringify(
      { app: "mahami", exportedAt: new Date().toISOString(), version: 1, tasks },
      null,
      2,
    );
    try {
      await Share.share({ message: payload, title: t("settings.export") });
    } catch (error) {
      console.warn("Export failed", error);
    }
  };

  return (
    <Screen>
      <AppText variant="title">{t("settings.title")}</AppText>

      <Section title={t("settings.profile")}>
        <TextField
          label={t("settings.name")}
          placeholder={t("settings.namePlaceholder")}
          value={name}
          onChangeText={setName}
          onEndEditing={saveName}
          onSubmitEditing={saveName}
          maxLength={NAME_MAX}
          autoCapitalize="words"
          returnKeyType="done"
        />
      </Section>

      <Section title={t("settings.appearance")}>
        <View style={[styles.between, { flexDirection: row }]}>
          <AppText variant="bodyStrong">{t("settings.theme")}</AppText>
          <ThemeToggle />
        </View>
        <ChipRow
          options={THEME_MODES.map((m) => ({ value: m, label: t(`settings.theme.${m}`) }))}
          value={prefs.themeMode}
          onChange={(themeMode) => updatePrefs({ themeMode })}
        />
        {prefs.themeMode === "time" ? (
          <AppText variant="caption" tone="muted">
            {t("settings.theme.timeHint")}
          </AppText>
        ) : null}

        <AppText variant="bodyStrong">{t("settings.language")}</AppText>
        <ChipRow<Lang>
          options={[
            { value: "ar", label: "العربية" },
            { value: "en", label: "English" },
          ]}
          value={prefs.language}
          onChange={(language) => updatePrefs({ language })}
        />

        <AppText variant="bodyStrong">{t("settings.timeFormat")}</AppText>
        <ChipRow<TimeFormat>
          options={[
            { value: "24h", label: t("settings.time.24h") },
            { value: "12h", label: t("settings.time.12h") },
          ]}
          value={prefs.timeFormat}
          onChange={(timeFormat) => updatePrefs({ timeFormat })}
        />
      </Section>

      <Section title={t("settings.data")}>
        <AppText variant="caption" tone="muted">
          {t("settings.dataHint")}
        </AppText>

        <AppText variant="bodyStrong">{t("settings.import")}</AppText>
        <TextField
          label={t("settings.importHint")}
          placeholder={t("settings.importPlaceholder")}
          value={importText}
          onChangeText={(v) => {
            setImportText(v);
            setImportMessage(null);
          }}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.code}
        />
        {importMessage ? (
          <AppText variant="caption" tone={importMessage.error ? "danger" : "success"} accessibilityLiveRegion="polite">
            {importMessage.text}
          </AppText>
        ) : null}
        <Button
          label={t("settings.importAction")}
          icon="download-outline"
          variant="secondary"
          onPress={runImport}
          disabled={status !== "ready"}
        />

        <AppText variant="bodyStrong">{t("settings.export")}</AppText>
        <AppText variant="caption" tone="muted">
          {t("settings.exportHint")}
        </AppText>
        <Button
          label={t("settings.export")}
          icon="share-outline"
          variant="secondary"
          onPress={runExport}
          disabled={status !== "ready" || tasks.length === 0}
        />
      </Section>

      <Section title={t("settings.about")}>
        <AppText tone="muted">
          {t("appName")} · {t("settings.version", { version: Constants.expoConfig?.version ?? "—" })}
        </AppText>
      </Section>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="label" tone="muted" accessibilityRole="header" style={styles.sectionTitle}>
        {title}
      </AppText>
      <Card style={styles.card}>{children}</Card>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.sm },
  sectionTitle: { textTransform: "uppercase", paddingHorizontal: space.xs },
  card: { gap: space.md },
  between: { alignItems: "center", justifyContent: "space-between" },
  code: { fontSize: 13, minHeight: 110 },
});
