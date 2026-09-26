# TaskTracker Project Memory

Last reviewed: 2026-09-26

This file is the durable handoff for developers and AI agents. Update it whenever a feature, schema, dependency, architectural decision, or known issue changes. Keep detailed user documentation in `README.md`; keep this file focused on project state and engineering history.

## Product scope

TaskTracker is a personal, local-first Expo/React Native app for organizing work as Topics -> Tasks and recording time against tasks.

Implemented user flows:

- Create, rename, and delete topics.
- Create, rename, delete, complete, and reopen tasks.
- Choose a simple timer or a basic Pomodoro work timer per task.
- Run one global timer at a time; pause, resume, navigate away, and recover it after app restart.
- Record and total sessions by task and topic.
- Maintain one checklist-style note per task, with automatic persistence.
- Configure daily, weekly, or one-time local reminder notifications.
- View completed/expired tasks and all non-empty checklists.
- Export, import, or wipe the local JSON data set.
- Use light/dark system themes.

Not implemented or incomplete:

- Full Pomodoro cycles, breaks, and long breaks.
- Task expiry automation (`expiryDate` and `expired` exist in the model only).
- A true Android foreground service/live countdown notification.
- Cloud sync, accounts, multi-device conflict handling, or analytics.
- User-configurable timer durations and Pomodoro settings.
- Automated test coverage and CI.

## Technical baseline

- Expo SDK 54 (`expo-router` 6), React Native 0.81, React 19.1, TypeScript strict mode.
- Zustand is the single in-memory store.
- Expo Router provides file-based navigation.
- `expo-file-system` stores one JSON file named `taskTrackerData.json` in the app document directory.
- `expo-notifications` provides timer completion, running-status, and task reminder notifications.
- The app is primarily Android-oriented, although iOS and web configuration is present.
- Notifications require a development/release build for complete testing; Expo Go is insufficient for the full notification flow.
- Repository instruction: consult the exact Expo SDK 54 docs at <https://docs.expo.dev/versions/v54.0.0/> before changing code.

Important version note: `package.json` targets SDK 54. The README currently and incorrectly says SDK 57 and Node 18+ in its prerequisites; Expo's SDK 54 reference specifies Node 20.19.x minimum.

## Architecture map

- `app/_layout.tsx`: startup, font/data loading, notification initialization, reminder resync, notification routing, and global timer-expiry watchdog.
- `app/(tabs)/`: Home, Notes, Completed, and Settings screens.
- `app/topic/[topicId].tsx`: topic summary and task CRUD.
- `app/task/[taskId].tsx`: task summary, checklist, reminder editor, and session history.
- `app/timer/[taskId].tsx`: timer controls and countdown UI.
- `store/useTaskStore.ts`: all domain state, mutations, timer lifecycle, derived totals, and persistence calls.
- `services/storage.ts`: JSON storage, schema migration, export, and import.
- `services/notifications.ts`: notification permissions/channel and timer notifications.
- `services/scheduling.ts`: recurring and one-time task reminders.
- `types/index.ts`: persisted domain model.

## Persisted data and invariants

Current storage schema version: 2.

The persisted `AppData` contains topics, tasks, sessions, notes, and at most one `activeTimer`. Schema v2 migrated legacy free-text notes into checklist items. New schema changes must increment `CURRENT_SCHEMA_VERSION` in `services/storage.ts` and add an explicit migration.

Expected relationships:

- A task belongs to one topic.
- A session and note belong to one task.
- There should be no more than one note per task.
- There should be no more than one active timer globally.
- `activeTimer.sessionId` should refer to an open session for `activeTimer.taskId`.
- The persisted `endTime` is the countdown source of truth while running; `remainingAtPause` is the source while paused.

## Current engineering risks and recommended order

1. Timer accounting correctness: `endSession` calculates wall-clock time from session start to stop. This includes paused time and can over-count when an expired background timer is reconciled after its intended end. Store accumulated/running duration explicitly or clamp automatic completion to the timer deadline.
2. Destructive-action cleanup: deleting a running task/topic or wiping/importing data can leave active notifications, scheduled reminders, and an `activeTimer`/session relationship inconsistent. Centralize cleanup and make these operations async where needed.
3. Reminder lifecycle: renaming/deleting a task does not reliably refresh/cancel its scheduled reminders. Import reloads the store but the boot-only reminder resync effect may not rerun.
4. Data safety: import validates only top-level arrays, not record shapes or relationships. A parse/load failure falls back to empty state, which risks hiding corruption. Add schema validation, backup/recovery behavior, and atomic writes.
5. Persistence observability: most store actions fire-and-forget `persist`, while several notification failures are silently swallowed. Surface actionable errors and serialize writes if mutations can overlap.
6. Dependency audit: npm reports transitive advisories in the Expo SDK 54/tooling tree. The suggested automated remediations require incompatible major-version changes, so reassess during a planned Expo SDK upgrade instead of using `npm audit fix --force`.
7. Tests: there is no test script or configured runner. Add focused tests for migrations, cascaded deletion, timer pause/resume/expiry math, import validation, and schedule generation first.
8. UX consistency: checklist changes currently auto-save, despite an old comment saying persistence waits for Save and `Notes.txt` requesting an explicit Save button. Decide the intended interaction and make UI/copy/code consistent.
9. Scope cleanup: expiry fields/status exist but no expiry behavior exists; either implement it or remove/defer the unused surface until designed.

## Review snapshot

On 2026-09-26:

- `npx tsc --noEmit` passed.
- Expo SDK 54 dependencies were aligned with `npx expo install`: `expo ~54.0.37`, `expo-constants ~18.0.14`, and `expo-file-system ~19.0.24`.
- Expo Doctor 1.20.4 passed all 18 checks after alignment.
- `npm audit --omit=dev` reported 24 transitive advisories (20 moderate, 4 high, 0 critical). Available blanket fixes require incompatible Expo/package major changes and were not applied.
- No automated app tests were runnable from `package.json`.
- The repository has no commits yet and contains existing staged/unstaged work. Preserve user changes carefully.

## Decisions and history

- 2026-09-26: Created this project memory after a workspace review. No application behavior was changed.
- Existing decision: local JSON storage is preferred for portability and simple export/import; there is no backend.
- Existing decision: timer state is global and persisted so leaving the timer screen does not stop it.
- Existing decision: the running Android notification is static; a live countdown/foreground service is deferred.

## Update checklist

After meaningful work, update:

1. `Last reviewed` and the product status above.
2. Technical versions when dependencies change.
3. Schema version/migrations when persisted data changes.
4. Risks: remove resolved items and add newly discovered ones.
5. Review snapshot with the exact checks run and their results.
6. Decisions/history with a dated, one-line summary of behavior-changing work.
7. `README.md` when setup or user-facing behavior changes.

Do not store secrets, tokens, personal data, generated build artifacts, or temporary debugging notes here.
