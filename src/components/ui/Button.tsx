import { Pressable, StyleSheet, View } from "react-native";
import type { PressableProps, StyleProp, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { radius, space } from "@/theme/tokens";
import { AppText } from "./AppText";

export type IconName = ComponentProps<typeof Ionicons>["name"];

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends Omit<PressableProps, "style" | "children"> {
  label: string;
  icon?: IconName;
  variant?: Variant;
  style?: StyleProp<ViewStyle>;
  fullWidth?: boolean;
}

export function Button({ label, icon, variant = "primary", style, fullWidth, disabled, ...rest }: ButtonProps) {
  const { colors } = useTheme();
  const { row } = useI18n();

  const palette = {
    primary: { bg: colors.primary, fg: colors.onPrimary, border: colors.primary },
    secondary: { bg: colors.surfaceAlt, fg: colors.text, border: colors.border },
    ghost: { bg: "transparent", fg: colors.primary, border: "transparent" },
    danger: { bg: colors.dangerSoft, fg: colors.danger, border: colors.dangerSoft },
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      {...rest}
      style={({ pressed }) => [
        styles.button,
        {
          flexDirection: row,
          backgroundColor: palette.bg,
          borderColor: palette.border,
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
          alignSelf: fullWidth ? "stretch" : "auto",
        },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={18} color={palette.fg} /> : null}
      <AppText variant="bodyStrong" style={{ color: palette.fg }} align="center">
        {label}
      </AppText>
    </Pressable>
  );
}

interface IconButtonProps extends Omit<PressableProps, "style" | "children"> {
  icon: IconName;
  /** Required: icon-only buttons need a spoken label */
  accessibilityLabel: string;
  size?: number;
  color?: string;
  background?: string;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({ icon, size = 22, color, background, style, ...rest }: IconButtonProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={8}
      {...rest}
      style={({ pressed }) => [
        styles.iconButton,
        { backgroundColor: background ?? "transparent", opacity: pressed ? 0.6 : 1 },
        style,
      ]}
    >
      <View>
        <Ionicons name={icon} size={size} color={color ?? colors.text} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    paddingHorizontal: space.xl,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
});
