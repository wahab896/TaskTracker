# TaskTracker

A personal Android time-tracking app — organize work into Topics → Tasks, run a Simple or Pomodoro timer per task, log sessions automatically, attach a note per task, and track total hours per topic. Data is stored locally as JSON for easy export/import.

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 20.19.x or newer | Expo SDK 54 minimum; [nodejs.org](https://nodejs.org) |
| npm | comes with Node | `npm -v` to check |
| Expo SDK | 54 | matches the versioned dependencies in `package.json` |
| Android phone | Android 8+ | for on-device testing |
| EAS CLI | latest | only needed for building the dev client / APK |

**Important:** timer completion alerts are local notifications. Expo Go supports local notifications, but Android background timing, channels, and native permissions should be verified with the custom **development build**. Remote push notifications are the capability removed from Expo Go on Android in SDK 53+; TaskTracker does not currently use remote push.

## Task organization

Long-press a task inside a topic to enter multi-select mode. Select one or more tasks, then choose:

- **Move**: changes their topic while preserving checklist, schedule, status, and session history.
- **Copy**: creates fresh current tasks in another topic with the same name, timer configuration, and checklist. Copies do not inherit tracked sessions, reminders, expiry dates, or completion state.

Both operations are saved immediately to the local JSON data file.

While tasks are selected, the new-task controls are hidden. Choosing a destination opens a confirmation dialog before anything is moved or copied.

Use the pin icon on a topic or task to keep priority items at the top of their list. Unpinned items retain their existing creation order.

Checklist items can be tapped to edit them inline and save automatically when editing finishes. Reminder frequency, time, date, and weekday changes also save immediately; there is no separate save action.

## First-time setup

```bash
# Install dependencies
npm install

# Confirm your installed Expo SDK version matches this project
npm list expo
```

## Building a development client (recommended for notification testing)

Build your own dev client to test the same native notification configuration used by release builds.

```bash
# 1. Install EAS CLI globally (one-time, machine-wide)
npm install -g eas-cli

# 2. Log in to your Expo account (creates one for free if you don't have one)
eas login

# 3. Configure the project for EAS Build (one-time, per project)
eas build:configure

# 4. Build the Android development client (runs in EAS's cloud — no Android
#    Studio or Gradle needed locally)
eas build --profile development --platform android
```

This takes roughly 10–20 minutes depending on EAS's build queue. When it finishes, your terminal (and the EAS build page) will show a download link — install that APK directly on your Android phone (you'll need to allow "install from unknown sources" once).

You only need to repeat this build if you add a **new native module** later (e.g. another `expo-*` package that needs native code). Plain JS/TS changes never require a rebuild.

Changes to native app configuration also require a rebuild. After pulling the notification reliability changes that added the `expo-notifications` config plugin and Android exact-alarm permission, rebuild and reinstall the development client before testing background timer completion.

Use **Settings -> Test Notification** to schedule a one-second local alert. If it does not appear after rebuilding, verify that notifications (and, where exposed by Android, alarms/reminders) are allowed for TaskTracker in system settings.

## Running the app day-to-day

Once the dev client is installed on your phone:

```bash
npx expo start --dev-client
```

Scan the QR code shown in your terminal using your installed dev client app (not Expo Go). Edits to your code will hot-reload on your phone automatically.

If you only need to work on non-notification features (Topics, Tasks, Notes, CRUD), you can also use plain Expo Go for faster iteration:

```bash
npx expo start
```

Scan with the regular Expo Go app from the Play Store.

## Building a release APK (when ready to install permanently)

```bash
eas build --profile preview --platform android
```

This produces an installable release APK (not tied to the dev server) — download and install it on your phone the same way as the dev client.

## Project structure

```
app/                  → screens (file-based routing via expo-router)
  (tabs)/             → Home, Notes, Completed, Settings tabs
  topic/[topicId].tsx → Topic detail screen
  task/[taskId].tsx   → Task detail screen
  timer/[taskId].tsx  → Full-screen timer
store/                → Zustand store (all app state + actions)
services/             → storage.ts (JSON persistence), notifications.ts
types/                → shared TypeScript types
utils/                → color generation, duration formatting
components/           → shared UI components (from base scaffold)
constants/            → theme colors
```

## Data & storage

All app data (topics, tasks, sessions, notes) is stored in a single JSON file on-device via `expo-file-system`, exposed through a `services/storage.ts` layer. No backend, no SQL — designed to be easy to export/import between devices later.

## Known limitations (in progress)

- Pomodoro currently runs a single work interval (no automatic break cycling yet)
- No scheduling/reminders yet (daily/custom recurring notifications)
- No task expiry automation yet
- Export/import UI not yet built (storage layer already supports it)

## License

Personal project — no license specified.
