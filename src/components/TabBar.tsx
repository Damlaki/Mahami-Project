/**
 * Bottom navigation. Built by hand (instead of a navigator's tab bar) so it can
 * follow the app's own Arabic/English direction instantly and match the design.
 */
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import type { StringKey } from "@/i18n/strings";
import { space } from "@/theme/tokens";
import { AppText } from "./ui/AppText";
import type { IconName } from "./ui/Button";

export const TAB_BAR_HEIGHT = 64;

const TABS: { href: "/" | "/tasks" | "/settings"; label: StringKey; icon: IconName; activeIcon: IconName }[] = [
  { href: "/", label: "tab.home", icon: "sunny-outline", activeIcon: "sunny" },
  { href: "/tasks", label: "tab.tasks", icon: "checkmark-circle-outline", activeIcon: "checkmark-circle" },
  { href: "/settings", label: "tab.settings", icon: "settings-outline", activeIcon: "settings" },
];

export function TabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t, row } = useI18n();

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.bar,
        {
          flexDirection: row,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: insets.bottom,
          height: TAB_BAR_HEIGHT + insets.bottom,
        },
      ]}
    >
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Pressable
            key={tab.href}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (!active) router.navigate(tab.href);
            }}
            style={styles.item}
          >
            <View style={[styles.pill, active && { backgroundColor: colors.primarySoft }]}>
              <Ionicons
                name={active ? tab.activeIcon : tab.icon}
                size={22}
                color={active ? colors.primary : colors.textMuted}
              />
            </View>
            <AppText variant="label" tone={active ? "primary" : "muted"} align="center" style={styles.label}>
              {t(tab.label)}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: space.xs,
  },
  item: { flex: 1, alignItems: "center", justifyContent: "center", gap: 1 },
  pill: { width: 60, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  label: { fontSize: 11, lineHeight: 15 },
});
