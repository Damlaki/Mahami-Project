import { useRef } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { radius, space } from "@/theme/tokens";
import { AppText } from "./AppText";
import type { IconName } from "./Button";

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** Accent color for the selected state (e.g. a category color). */
  color?: string;
  icon?: IconName;
  count?: number;
}

export function Chip({ label, selected, onPress, color, icon, count }: ChipProps) {
  const { colors } = useTheme();
  const { row } = useI18n();
  const accent = color ?? colors.primary;
  const fg = selected ? (color ? "#FFFFFF" : colors.onPrimary) : colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          flexDirection: row,
          backgroundColor: selected ? accent : colors.surface,
          borderColor: selected ? accent : colors.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      {icon ? <Ionicons name={icon} size={16} color={selected ? fg : accent} /> : null}
      <AppText variant="label" style={{ color: fg }}>
        {label}
      </AppText>
      {count !== undefined ? (
        <View style={[styles.count, { backgroundColor: selected ? "rgba(255,255,255,0.25)" : colors.surfaceAlt }]}>
          <AppText variant="label" style={{ color: fg, fontSize: 10, lineHeight: 14 }}>
            {count}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

interface ChipRowProps<T extends string | number> {
  options: readonly { value: T; label: string; color?: string; icon?: IconName; count?: number }[];
  value: T | null;
  onChange: (value: T) => void;
  scroll?: boolean;
}

/** A single-choice group of chips (wraps, or scrolls horizontally). */
export function ChipRow<T extends string | number>({ options, value, onChange, scroll }: ChipRowProps<T>) {
  const { row } = useI18n();
  const scrollRef = useRef<ScrollView>(null);
  const chips = options.map((o) => (
    <Chip
      key={String(o.value)}
      label={o.label}
      color={o.color}
      icon={o.icon}
      count={o.count}
      selected={o.value === value}
      onPress={() => onChange(o.value)}
    />
  ));

  if (scroll) {
    return (
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        // In a mirrored row the first chip sits at the far end; start scrolled there.
        onContentSizeChange={() => {
          if (row === "row-reverse") scrollRef.current?.scrollToEnd({ animated: false });
        }}
        contentContainerStyle={[styles.row, { flexDirection: row }]}
      >
        {chips}
      </ScrollView>
    );
  }
  return (
    <View accessibilityRole="radiogroup" style={[styles.row, styles.wrap, { flexDirection: row }]}>
      {chips}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 32,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: "center",
    gap: 6,
  },
  row: { gap: space.sm },
  wrap: { flexWrap: "wrap" },
  count: { borderRadius: radius.pill, paddingHorizontal: 6, minWidth: 20, alignItems: "center" },
});
