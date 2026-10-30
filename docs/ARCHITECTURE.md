# Architecture

## Why React Native + Expo

- You asked for an **Android app** and want to keep learning **React**. React Native uses the same components, hooks and state ideas.
- **Expo Go** runs the app on your phone instantly, with no Android Studio. EAS Build produces a real APK/AAB when you're ready to publish.
- Expo has first-party native **local notifications** (lock screen, scheduled, action buttons). That covers most of the reminder requirements without a server (see `NOTIFICATIONS.md`).

## Layers

```
screens (app/)  →  state (src/state)  →  data (src/data)  →  storage
       ↘                ↘
        components        domain (pure functions)
```

| Layer | Rule |
|---|---|
| `domain/` | Plain TypeScript. No React, no storage. Every business rule lives here and is unit-tested. |
| `data/` | Repositories (`TaskRepository`, `PreferencesRepository`). Only `data/storage.ts` imports AsyncStorage. Stored values are wrapped as `{ version, data }` so future schema changes can be migrated. |
| `state/` | React context + `useReducer`. Same loop as the old app (change → save → render), but the save is an effect after each user change, and failures surface in the UI. |
| `components/ui/` | The design system. Screens never hard-code colors, fonts or spacing; they come from `theme/tokens.ts`. |
| `app/` | Thin screens that compose components and call state actions. |

## What was kept from the original web app

| Original | Here |
|---|---|
| `{ id, title, date, isDone }` | Extended `Task` with time, duration, priority, category, notes, timestamps |
| `localStorage` + try/catch | Repository + versioned envelope + load/save error states |
| `update()` → save → `renderTasks()` | Reducer → effect saves → React re-renders |
| `textContent` (XSS-safe) | React Native `<Text>` never interprets markup |
| One reusable modal for create/edit | One `TaskEditor` sheet for create/edit |
| Delete confirmation modal | Delete + **Undo** snackbar (recoverable, fewer taps) |
| Esc / click outside closes dialogs | Android back button / tap outside closes sheets |
| `prefers-reduced-motion` | `AccessibilityInfo.isReduceMotionEnabled()` |
| Arabic RTL | Arabic RTL **and** English LTR, switchable live |

## RTL strategy

`I18nManager.forceRTL()` only applies after a restart, so the native layout stays LTR and `I18nProvider` exposes `row`, `textAlign`, `inset()` and `dir`. Components use these for anything horizontal. Inside Arabic layout, digits (clock, times) keep reading left-to-right.

## Theming

`ThemeProvider` resolves the scheme (`system | light | dark | time`) and owns one `Animated.Value` called `progress` (0 = day, 1 = night). `ThemeToggle` and `SkyHero` interpolate everything from it, including sun position, moon crescent, stars and colors. A full-screen layer painted with the old background fades out on every switch, so the whole UI dissolves into the new theme. Reduced motion skips all of this.

## Next phases: where things plug in

- **Phase 4 (Supabase):** add `supabaseTaskRepository` that implements `TaskRepository`, and pass it to `<TasksProvider repository={…}>`. The schema maps 1:1 to `Task`, plus a `user_id` column with row-level-security policies `user_id = auth.uid()`. On first sign-in, upload local tasks (ids are stable, so this is idempotent).
- **Phase 6 (notifications):** a `NotificationScheduler` service subscribes to task changes and reconciles scheduled notifications. See `NOTIFICATIONS.md`.
