import { Text } from "react-native";
import type { TextProps } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { type as typeScale } from "@/theme/tokens";
import type { TypeVariant } from "@/theme/tokens";

export type Tone = "default" | "muted" | "faint" | "primary" | "danger" | "success" | "onPrimary";

interface AppTextProps extends TextProps {
  variant?: TypeVariant;
  tone?: Tone;
  align?: "start" | "center" | "end";
  strike?: boolean;
}

/** Every piece of text goes through here so font, color and direction stay consistent. */
export function AppText({
  variant = "body",
  tone = "default",
  align = "start",
  strike = false,
  style,
  ...rest
}: AppTextProps) {
  const { colors } = useTheme();
  const { textAlign, textAlignEnd } = useI18n();

  const color = {
    default: colors.text,
    muted: colors.textMuted,
    faint: colors.textFaint,
    primary: colors.primary,
    danger: colors.danger,
    success: colors.success,
    onPrimary: colors.onPrimary,
  }[tone];

  return (
    <Text
      {...rest}
      style={[
        typeScale[variant],
        {
          color,
          textAlign: align === "center" ? "center" : align === "end" ? textAlignEnd : textAlign,
          textDecorationLine: strike ? "line-through" : "none",
        },
        style,
      ]}
    />
  );
}
