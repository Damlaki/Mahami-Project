# مهامي · Mahami — personal planner for Android

A daily planner, task manager and (soon) calendar, habit tracker and focus timer, built with **React Native + Expo** and TypeScript. It grew out of the vanilla-JS to-do app in `Lessons/JS-Course2/to-do-list-project`, which is left untouched.

**Status: Phase 1 of 6.** See [What works now](#what-works-now) and [Roadmap](#roadmap).

---

## Run it on your Android phone

### 1. One-time setup on your PC

1. Install **Node.js 22 LTS** from <https://nodejs.org> (React Native 0.85+ needs Node ≥ 20.19.4).
2. On your phone, install **Expo Go** from Google Play.
   - This project uses **Expo SDK 58** (React Native 0.88), the same SDK as the current Expo Go.

### 2. Install dependencies

Open a terminal in this folder (in VS Code: *Terminal → New Terminal*) and run:

```bash
npm install
```

All versions are pinned in `package.json` (chosen by `npx expo install --fix`). If npm reports an `ERESOLVE` conflict after a version change, do a clean install: delete `node_modules` and `package-lock.json`, then run `npm install` again.

### 3. Start

```bash
npm start
```

Scan the QR code with Expo Go. Your PC and phone must be on the same Wi-Fi. If they can't connect, run `npx expo start --tunnel`.

### Useful scripts

| Command | What it does |
|---|---|
| `npm start` | Start the dev server (press `a` to open on a connected Android device/emulator) |
| `npm test` | Run the unit tests (dates, tasks, filters, import, preferences); needs no extra packages |
| `npm run typecheck` | TypeScript check of the whole app |
| `npm run doctor` | `expo-doctor`, which checks dependency versions and config |

---

## What works now

- **Home**: greeting based on time of day (with your name, if you set one), today's date, a live clock that ticks each second without drifting, an animated **sun/moon sky**, today's progress, "Next up", today's tasks and an overdue banner.
- **Tasks**: create, edit, complete/undo and delete, with **Undo** after a delete. Filter views: All, Today, Upcoming, Overdue and Completed, with counts, grouped by day.
- **Task fields**: title, notes, date (Today/Tomorrow/pick), start time, duration, priority (low → urgent) and category (with colors and icons). Adding a task is fast: type a title and tap Save. The rest sits under "More options".
- **Theme**: light, dark, follow the system, or **by time** (light 06:00–19:00). The sun/moon toggle animates the switch, the whole screen cross-fades, and animations are skipped when the phone's "Remove animations" setting is on.
- **Language**: Arabic (RTL) ⇄ English (LTR), switched instantly without a restart.
- **Settings**: name, theme, language, 12/24-hour time, import and export.
- **Storage**: tasks and settings are saved on the phone (AsyncStorage) through a repository layer, so a database can be added later without changing the screens.
- Loading skeletons, an error state with retry, empty states with a call to action, validation messages, and screen-reader labels on all controls.

### Bring over your old tasks

The old web app saves tasks in the browser's `localStorage`, which a phone app can't read. To copy them over:

1. Open the old `index.html` in Chrome on your PC and press **F12** → **Console**.
2. Run: `copy(localStorage.getItem("my-tasks"))`. The JSON is now on your clipboard.
3. Send it to your phone (e-mail it to yourself, or use any notes app), then paste it into **Settings → Import tasks** in the app.

Importing twice won't create duplicates. **Settings → Export** shares a JSON backup that you can import the same way.

---

## Project structure

```
app/                    Screens (expo-router: one file = one route)
  _layout.tsx           Providers, fonts, splash screen, tab bar
  index.tsx             Home
  tasks.tsx             Task list
  settings.tsx          Settings
src/
  domain/               Pure logic, no React (fully unit-tested)
    task.ts             Task model, validation, create/edit/toggle
    selectors.ts        Views, sorting, grouping, daily summary, next up
    legacyImport.ts     Import from the old web app / exports
    preferences.ts      Settings model, theme resolution
  data/                 Data-access layer (the only code that touches storage)
  state/                React context providers (tasks, preferences, editor/toast)
  theme/                Design tokens + ThemeProvider (sun/moon progress)
  i18n/                 Arabic/English strings + direction helpers
  components/           TaskCard, TaskEditor, SkyHero, ThemeToggle, LiveClock …
  components/ui/        Design-system primitives: AppText, Button, Card, Chip, Sheet …
  lib/                  Date/time and id helpers
tests/                  node:test unit tests
docs/
  ARCHITECTURE.md       Decisions and how the layers fit together
  NOTIFICATIONS.md      Notification and lock-screen reminder design (Phase 6)
```

## Roadmap

| Phase | Scope | Status |
|---|---|---|
| 1 | Architecture, design system, layout, theming, i18n, core tasks, local storage, import | **Done** (this version) |
| 2 | Subtasks, recurrence, search, sort options, archive, duplicate, drag-to-reorder, projects | Next |
| 3 | Calendar (month/week/day/agenda), Structured-style daily timeline with a moving "now" line | |
| 4 | Accounts and sync with Supabase (Postgres + row-level security), migration of local data | |
| 5 | Habits, goals, focus/Pomodoro timer | |
| 6 | Notifications and lock-screen reminders (see `docs/NOTIFICATIONS.md`), accessibility pass, release build | |

## Known limitations (be aware)

- **Not yet run on a device by its author.** The code was written in an environment that couldn't download npm packages. The pure logic (`src/domain`, `src/lib`) is covered by 22 passing unit tests in three time zones, and every file was syntax-checked. But the app itself hasn't been type-checked against the real libraries or launched yet. Run `npm run typecheck` and `npm start` first. If anything fails, the error message is usually enough to fix it quickly.
- Data lives on this phone only until Phase 4. Uninstalling the app deletes it, so use Export for backups.
- Dates and times are entered with Android's native pickers. On other platforms (web/iOS) the editor falls back to text fields (`YYYY-MM-DD`, `HH:MM`).
- No reminders yet. Fields for reminders and recurrence arrive with Phases 2 and 6, and there are no controls in the UI that don't work.

## Upgrading the SDK

When a new Expo Go comes out (it only runs the latest SDK):

```bash
npx expo install expo@latest
npx expo install --fix
```

Then delete `node_modules` and `package-lock.json`, run `npm install`, and start with `npx expo start --clear`.

## Building an installable APK (later)

```bash
npm install -g eas-cli
eas build -p android --profile preview
```

This needs a free Expo account. Notifications that use remote push (Phase 6) also require a **development build** instead of Expo Go.
