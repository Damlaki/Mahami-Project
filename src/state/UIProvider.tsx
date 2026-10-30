/**
 * Shared UI that any screen can trigger: the task editor sheet and a toast
 * (snackbar) with an optional action such as "Undo".
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Task, TaskInput } from "@/domain/task";
import { TaskEditor } from "@/components/TaskEditor";
import { AppText } from "@/components/ui/AppText";
import { useTasks } from "./TasksProvider";
import { useTheme } from "@/theme/ThemeProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { radius, space } from "@/theme/tokens";
import { TAB_BAR_HEIGHT } from "@/components/TabBar";

interface Toast {
  id: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface UIContextValue {
  openEditor: (task?: Task | null, defaults?: Partial<TaskInput>) => void;
  showToast: (toast: Omit<Toast, "id">) => void;
}

const UIContext = createContext<UIContextValue | null>(null);
const TOAST_MS = 5000;

export function UIProvider({ children }: { children: ReactNode }) {
  const { addTask, updateTask, removeTask, restoreTask } = useTasks();
  const { t } = useI18n();

  const [editor, setEditor] = useState<{ visible: boolean; task: Task | null; defaults?: Partial<TaskInput> }>({
    visible: false,
    task: null,
  });
  const [toast, setToast] = useState<Toast | null>(null);
  const nextToastId = useRef(1);

  const openEditor = useCallback((task: Task | null = null, defaults?: Partial<TaskInput>) => {
    setEditor({ visible: true, task, defaults });
  }, []);

  const closeEditor = useCallback(() => setEditor((e) => ({ ...e, visible: false })), []);

  const showToast = useCallback((next: Omit<Toast, "id">) => {
    setToast({ ...next, id: nextToastId.current++ });
  }, []);

  const handleSave = useCallback(
    (input: TaskInput) => {
      if (editor.task) updateTask(editor.task.id, input);
      else addTask(input);
      closeEditor();
    },
    [editor.task, addTask, updateTask, closeEditor],
  );

  const handleDelete = useCallback(
    (task: Task) => {
      const removed = removeTask(task.id);
      closeEditor();
      if (removed) {
        showToast({
          message: t("toast.deleted"),
          actionLabel: t("toast.undo"),
          onAction: () => restoreTask(removed),
        });
      }
    },
    [removeTask, restoreTask, closeEditor, showToast, t],
  );

  const hideToast = useCallback(() => setToast(null), []);

  const value = useMemo(() => ({ openEditor, showToast }), [openEditor, showToast]);

  return (
    <UIContext.Provider value={value}>
      {children}
      <TaskEditor
        visible={editor.visible}
        task={editor.task}
        defaults={editor.defaults}
        onClose={closeEditor}
        onSave={handleSave}
        onDelete={handleDelete}
      />
      {toast ? <Snackbar key={toast.id} toast={toast} onDone={hideToast} /> : null}
    </UIContext.Provider>
  );
}

function Snackbar({ toast, onDone }: { toast: Toast; onDone: () => void }) {
  const { colors, scheme, reduceMotion } = useTheme();
  const { row } = useI18n();
  const insets = useSafeAreaInsets();
  const appear = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

  useEffect(() => {
    if (!reduceMotion) Animated.timing(appear, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    const timer = setTimeout(onDone, TOAST_MS);
    return () => clearTimeout(timer);
  }, [appear, onDone, reduceMotion]);

  // Inverted surface so the toast stands out in both themes.
  const bg = scheme === "dark" ? colors.text : "#2A2420";
  const fg = scheme === "dark" ? colors.bg : "#FFFFFF";

  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[
        styles.snackbar,
        {
          flexDirection: row,
          backgroundColor: bg,
          bottom: TAB_BAR_HEIGHT + insets.bottom + space.lg,
          opacity: appear,
          transform: [{ translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
        },
      ]}
    >
      <AppText variant="bodyStrong" style={[styles.message, { color: fg }]}>
        {toast.message}
      </AppText>
      {toast.actionLabel && toast.onAction ? (
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => {
            toast.onAction?.();
            onDone();
          }}
        >
          <View style={styles.action}>
            <AppText variant="bodyStrong" style={{ color: colors.primary }}>
              {toast.actionLabel}
            </AppText>
          </View>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  snackbar: {
    position: "absolute",
    left: space.lg,
    right: space.lg,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    alignItems: "center",
    gap: space.md,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  message: { flex: 1 },
  action: { paddingHorizontal: space.sm, paddingVertical: space.xs },
});

export function useUI(): UIContextValue {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used inside <UIProvider>");
  return ctx;
}
