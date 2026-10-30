import type { ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { radius, space } from "@/theme/tokens";

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Pinned under the scrolling content (e.g. Save / Cancel). */
  footer?: ReactNode;
}

/**
 * Bottom sheet built on RN's Modal: the Android back button and a tap on the
 * dimmed backdrop both close it (same behaviour as Esc / click-outside on the web app).
 */
export function Sheet({ visible, onClose, children, footer }: SheetProps) {
  const { colors, reduceMotion } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();

  return (
    <Modal
      visible={visible}
      transparent
      animationType={reduceMotion ? "none" : "slide"}
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t("common.close")}
        />
        <View style={[styles.flex, { pointerEvents: "box-none" }]} />
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.surface, paddingBottom: Math.max(insets.bottom, space.lg) },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            {children}
          </ScrollView>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  sheet: {
    maxHeight: "92%",
    borderTopLeftRadius: radius.lg + 4,
    borderTopRightRadius: radius.lg + 4,
  },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, marginTop: space.sm },
  content: { padding: space.xl, gap: space.lg },
  footer: { paddingHorizontal: space.xl, paddingTop: space.sm },
});
