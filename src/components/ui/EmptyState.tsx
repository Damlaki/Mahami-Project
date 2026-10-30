import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/ThemeProvider";
import { space } from "@/theme/tokens";
import { AppText } from "./AppText";
import { Button } from "./Button";
import type { IconName } from "./Button";

interface EmptyStateProps {
  icon: IconName;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, message, actionLabel, onAction }: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrapper}>
      <View style={[styles.badge, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name={icon} size={30} color={colors.primary} />
      </View>
      <AppText tone="muted" align="center">
        {message}
      </AppText>
      {actionLabel && onAction ? <Button label={actionLabel} icon="add" variant="secondary" onPress={onAction} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: "center", gap: space.md, paddingVertical: space.xxxl, paddingHorizontal: space.xl },
  badge: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
});
