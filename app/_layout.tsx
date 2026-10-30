import { useEffect } from "react";
import { I18nManager, StyleSheet, View } from "react-native";
import { Slot } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Cairo_400Regular, Cairo_600SemiBold, Cairo_700Bold, useFonts } from "@expo-google-fonts/cairo";
import { PreferencesProvider, usePreferences } from "@/state/PreferencesProvider";
import { TasksProvider } from "@/state/TasksProvider";
import { UIProvider } from "@/state/UIProvider";
import { I18nProvider } from "@/i18n/I18nProvider";
import { ThemeProvider, useTheme } from "@/theme/ThemeProvider";
import { TabBar } from "@/components/TabBar";

// Keep the native layout left-to-right; I18nProvider mirrors the UI for Arabic
// itself so switching language doesn't require restarting the app.
I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

SplashScreen.preventAutoHideAsync().catch(() => undefined);

// Shows expo-router's error screen with a "Retry" button instead of a blank app.
export { ErrorBoundary } from "expo-router";

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Cairo_400Regular, Cairo_600SemiBold, Cairo_700Bold });

  return (
    <SafeAreaProvider>
      <PreferencesProvider>
        {/* If fonts fail to load, continue with the system font rather than hang. */}
        <AppGate fontsReady={fontsLoaded || fontError != null} />
      </PreferencesProvider>
    </SafeAreaProvider>
  );
}

function AppGate({ fontsReady }: { fontsReady: boolean }) {
  const { ready } = usePreferences();
  const show = ready && fontsReady;

  useEffect(() => {
    if (show) SplashScreen.hideAsync().catch(() => undefined);
  }, [show]);

  if (!show) return null;

  return (
    <I18nProvider>
      <ThemeProvider>
        <TasksProvider>
          <UIProvider>
            <Shell />
          </UIProvider>
        </TasksProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}

function Shell() {
  const { scheme, colors } = useTheme();

  useEffect(() => {
    // Root background behind screens/keyboard, so there's no white flash in dark mode.
    SystemUI.setBackgroundColorAsync(colors.bg).catch(() => undefined);
  }, [colors.bg]);

  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <View style={styles.content}>
        <Slot />
      </View>
      <TabBar />
    </>
  );
}

const styles = StyleSheet.create({ content: { flex: 1 } });
