import { StyleSheet, View } from "react-native";
import type { ViewProps } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { radius, space } from "@/theme/tokens";

/** Rounded surface with a hairline border and a very soft shadow. */
export function Card({ style, ...rest }: ViewProps) {
  const { colors, scheme } = useTheme();
  return (
    <View
      {...rest}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          shadowColor: colors.shadow,
          shadowOpacity: scheme === "dark" ? 0 : 0.06,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: space.lg,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 1,
  },
});
