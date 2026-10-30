# Notifications & lock-screen reminders — design (Phase 6)

> **Status: planned, not implemented.** Phase 1 contains no reminder UI, so nothing pretends to work. This document is the implementation spec. It is ordered so each step can be shipped and tested on a real phone.

## 1. Which technology, and why

The app is an **Android app**, so the main mechanism is **native local notifications** via `expo-notifications`, not Web Push.

| Need | Mechanism | Needs a server? |
|---|---|---|
| "Remind me 10 min before" for tasks/habits | Local scheduled notification (`scheduleNotificationAsync`), backed by Android's AlarmManager | **No.** Fires with the app closed, on the lock screen. |
| Recurring reminders (habits, daily tasks) | Local `DAILY` / `WEEKLY` / `CALENDAR` triggers, or rolling one-off schedules (see §4) | No |
| Mark done / Open from the notification | Notification **category** with action buttons (`setNotificationCategoryAsync`) | No |
| A change made on *another device* (after Phase 4 sync) should update reminders here | Remote push (FCM through Expo Push Service) as a "resync" signal, plus server-side scheduling | **Yes** (Supabase Edge Function + `pg_cron`), Phase 4+ |

Local notifications are the reliable core: they work offline and need no backend. Remote push only covers cross-device changes.

## 2. Platform requirements and limits (Android)

- **Expo Go:** local notifications work in Expo Go. **Remote push does not** (removed from Expo Go on Android since SDK 53), so remote push needs a development build (`eas build --profile development`).
- **Permission (Android 13+):** notifications need the user's opt-in. The system prompt only appears once at least one **notification channel** exists, so create channels first, then request permission.
- **Exact timing (Android 12+):** to fire at the exact minute, the app needs `SCHEDULE_EXACT_ALARM` in the manifest (`android.permissions` in `app.json`). On Android 14+ that permission is denied by default for new installs, and the user grants it in *Settings → Alarms & reminders*. Without it, Android may deliver a reminder **several minutes late**. The app will detect this and offer to open that setting, with an explanation.
- **Reboot:** `expo-notifications` adds `RECEIVE_BOOT_COMPLETED` and restores scheduled notifications after a restart. The app also re-reconciles on every launch (§5) as a safety net.
- **Battery savers:** some manufacturers (Xiaomi, Huawei, some Samsung modes) delay or kill alarms. The app can't override this. Settings will link to "Battery → Unrestricted" with a short explanation.
- **Lock screen:** Android shows notifications on the lock screen unless the user turned that off. **It is not guaranteed.** Channel `lockscreenVisibility` controls how much is shown there.
- **Volume:** keep at most ~50 pending notifications (a rolling 7-day window, §4). This stays well clear of OS alarm limits.

## 3. Channels (Android)

| Channel id | Used for | Importance | Lock screen |
|---|---|---|---|
| `reminders` | Task/event reminders at a set time | HIGH (heads-up + sound) | per privacy setting |
| `habits` | Habit nudges | DEFAULT | per privacy setting |
| `digest` | Daily overdue summary, schedule changes | LOW (silent) | per privacy setting |

Users can change sound/vibration per channel in Android settings. "Choose reminder sound where supported" maps to this. The app's settings link straight there.

## 4. Data model additions (Phase 2/6)

```ts
interface Task {
  // …existing fields
  reminders: number[];          // minutes before start: e.g. [10] or [30, 5]; 0 = at start
  recurrence: Recurrence | null; // daily | weekly(days) | monthly(day) | every N days
}

interface NotificationPrefs {
  enabled: boolean;
  defaultOffsets: number[];      // offered when a task gets a time (5, 10, 30, 60)
  quietHours: { start: "22:00"; end: "07:00" } | null;
  lockScreenDetail: "full" | "titleOnly" | "hidden";
  overdueDigestAt: "09:00" | null;
}
```

Tasks **without a start time** get no time-based reminder. They only appear in the daily digest if overdue.

## 5. Scheduling engine: reconcile, don't patch

A pure function plus a thin side-effect layer, both in `src/notifications/`:

```
plannedNotifications(tasks, habits, prefs, now) -> Planned[]   // pure, unit-tested
reconcile(planned)                                              // diff vs. getAllScheduledNotificationsAsync()
```

- Each planned notification gets a **deterministic id**: `task:<id>:<occurrenceDate>:<offset>`. Reconcile cancels ids that are no longer planned and schedules missing ones. It is idempotent, so running it twice changes nothing.
- **When it runs:** after every task/habit/preference change (debounced ~1 s), on app start, and on return to the foreground. That covers edits, deletes, completion (cancels remaining reminders), time-zone changes and missed runs.
- **Time zones:** tasks store *local* date + time. The trigger instant is computed from the device's current zone at reconcile time. After travelling, the next foreground reconcile moves reminders to the new local time. If the user wants absolute times later, add an optional `tz` to the task.
- **Recurring items:** schedule concrete occurrences in a **rolling 7-day window** instead of one repeating trigger. This lets an edit to one occurrence, quiet hours and per-occurrence completion all work. Reconcile on launch extends the window.
- **Quiet hours:** a reminder falling inside quiet hours is moved to the end of quiet hours, unless the task itself *starts* inside quiet hours. In that case it's delivered silently on the `digest` channel.
- **Missed reminders:** when the app opens, any reminder in the last 12 h for a still-open task that never fired (`getPresentedNotificationsAsync` + a delivered-log in storage) is folded into one "You missed…" notification instead of a burst.
- **Smart, not noisy:**
  - at most one notification per task per offset, and
  - several reminders within the same 2-minute window are merged into one ("3 things starting at 09:00"), and
  - at most one overdue digest per day, and only if something is overdue, and
  - completed or deleted tasks cancel their pending notifications immediately.

## 6. Notification content and privacy

| `lockScreenDetail` | Title | Body | Channel `lockscreenVisibility` |
|---|---|---|---|
| `full` | Task title | "09:00 – 09:30 · in 10 min" + first line of notes | PUBLIC |
| `titleOnly` | Task title | time only | PRIVATE, with a public version reading "Reminder" |
| `hidden` | "Reminder" | "You have a task at 09:00" | SECRET on the lock screen; full text once unlocked |

Content is localized in the user's chosen language at scheduling time, and reconcile reschedules after a language change.

## 7. Quick actions

Category `task-reminder`:

- **Mark done**: `opensAppToForeground: false`. Handled in a background task registered with `Notifications.registerTaskAsync`, which on Android runs even when the app is terminated. It loads tasks from the repository, toggles the task, saves, and reconciles.
- **Snooze 10 min**: same background path; schedules `task:<id>:snooze`.
- **Tapping the notification body** opens the app at `mahami://tasks?focus=<id>`, using the expo-router deep link (the `scheme` in `app.json` is already set).

On-device testing must confirm that the background action handler runs when the app is killed. If a manufacturer blocks it, "Mark done" falls back to opening the app and completing the task there.

## 8. Permission UX

- **Never** prompt on first launch.
- Prompt the first time the user **adds a reminder to a task** (or enables a habit reminder). Show a short in-app sheet first: why the app needs it, an example of what will be shown, and the privacy option. Then request the system permission.
- If denied, the reminder chip shows "Notifications are off" with a button to open the system settings. Tasks still work normally.
- Settings → Notifications shows the live state: permission, exact-alarm access, battery optimization, and the count of pending reminders. A **"Send test notification"** button schedules one 10 s ahead, so the user can lock the phone and verify.

## 9. Testing plan

1. **Unit tests** (`node:test`, like `tests/`) for `plannedNotifications`: offsets, quiet hours, merging, recurrence window, time-zone shift, completed/deleted tasks, deterministic ids.
2. **Reconcile tests** with a fake scheduler (in-memory list): idempotency, cancel-on-delete, reschedule-on-edit.
3. **Device checklist** (Android 13, 14 and 15 if available):
   - Permission prompt appears only on the first reminder, and denial is handled.
   - Reminder fires with the app **swiped away**, with the **screen locked**, and after a **reboot**.
   - Exact-alarm denied → measurable delay → the warning appears.
   - Each privacy mode on the lock screen.
   - Mark done / Snooze with the app killed.
   - Quiet hours, a time-zone change (change it in system settings, reopen the app), and a language change.

## 10. If a web version is added later

A browser can't schedule a notification for when it's closed. That requires **Web Push**: a service worker, VAPID keys, push subscriptions stored per user, and a server job (Supabase `pg_cron` → Edge Function) that sends pushes at the due time. Platform caveats: iOS Safari only delivers Web Push to sites **added to the Home Screen** (iOS 16.4+). Desktop browsers deliver only while the browser process runs, and none of them guarantee lock-screen display. This would be built on the Phase 4 backend, reusing `plannedNotifications` on the server.
