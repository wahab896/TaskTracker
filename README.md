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

**Important:** this project uses `expo-notifications` for background timer completion, which is **not supported in plain Expo Go** (removed from Expo Go as of SDK 53+). You need a custom **development build** to test the full timer flow, including background completion. Plain Expo Go works fine for everything else (Topics, Tasks, Notes, CRUD) but will silently skip scheduling background notifications.

## First-time setup

```bash
# Install dependencies
npm install

# Confirm your installed Expo SDK version matches this project
npm list expo
```

## Building a development client (required for notifications)

Plain Expo Go can't run this project's notification code. Build your own dev client once — it behaves like Expo Go but includes every native module this project needs.

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
