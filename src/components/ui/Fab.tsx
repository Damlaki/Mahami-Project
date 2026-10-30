import { Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { space } from "@/theme/tokens";

/** Floating "+" button, placed on the reading-end side above the tab bar. */
export function Fab({ onPress, accessibilityLabel }: { onPress: () => void; accessibilityLabel: string }) {
  const { colors } = useTheme();
  const { inset } = useI18n();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.fab,
        inset("end", space.xl),
        {
          backgroundColor: colors.primary,
          shadowColor: colors.primary,
          transform: [{ scale: pressed ? 0.94 : 1 }],
        },
      ]}
    >
      <Ionicons name="add" size={30} color={colors.onPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: space.xl,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
});
