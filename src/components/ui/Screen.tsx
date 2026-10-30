import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { space } from "@/theme/tokens";

interface ScreenProps {
  children: ReactNode;
  /** false for screens that render their own list (SectionList etc.) */
  scroll?: boolean;
}

/** Page wrapper: safe-area top padding and consistent side gutters. */
export function Screen({ children, scroll = true }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const padding = { paddingTop: insets.top + space.md };

  if (!scroll) return <View style={[styles.flex, padding]}>{children}</View>;

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.content, padding]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: space.xl, paddingBottom: 120, gap: space.xl },
});
