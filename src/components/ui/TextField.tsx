import { forwardRef, useState } from "react";
import type { ComponentRef } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import type { TextInputProps } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { fonts, radius, space } from "@/theme/tokens";
import { AppText } from "./AppText";

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
}

export const TextField = forwardRef<ComponentRef<typeof TextInput>, TextFieldProps>(function TextField(
  { label, error, hint, style, multiline, onFocus, onBlur, ...rest },
  ref,
) {
  const { colors } = useTheme();
  const { textAlign } = useI18n();
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      <AppText variant="label" tone="muted">
        {label}
      </AppText>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        placeholderTextColor={colors.textFaint}
        multiline={multiline}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...rest}
        style={[
          styles.input,
          multiline && styles.multiline,
          {
            color: colors.text,
            backgroundColor: colors.surfaceAlt,
            borderColor: error ? colors.danger : focused ? colors.primary : "transparent",
            textAlign,
          },
          style,
        ]}
      />
      {error ? (
        <AppText variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" tone="faint">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  input: {
    minHeight: 44,
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    fontFamily: fonts.regular,
    fontSize: 14,
  },
  multiline: { minHeight: 88, textAlignVertical: "top", paddingTop: space.md },
});
