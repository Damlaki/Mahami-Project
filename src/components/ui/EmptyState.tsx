import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/ThemeProvider";
import { space } from "@/theme/tokens";
import { AppText } from "./AppText";
import type { IconName } from "./Button";

interface EmptyStateProps {
  icon: IconName;
  message: string;
  /** Short pointer to the + button (the one place to add tasks) */
  hint?: string;
}

export function EmptyState({ icon, message, hint }: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrapper}>
      <View style={[styles.badge, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name={icon} size={30} color={colors.primary} />
      </View>
      <AppText tone="muted" align="center">
        {message}
      </AppText>
      {hint ? (
        <AppText variant="caption" tone="faint" align="center">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: "center", gap: space.md, paddingVertical: space.xxxl, paddingHorizontal: space.xl },
  badge: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
});
