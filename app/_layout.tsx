import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import { AppState, Vibration } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { ensureNotificationChannel, requestNotificationPermission } from '@/services/notifications';
import { resyncAllReminders } from '@/services/scheduling';
import { useTaskStore } from '@/store/useTaskStore';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  const isDataLoaded = useTaskStore((state) => state.isLoaded);
  const initialize = useTaskStore((state) => state.initialize);
  const tasks = useTaskStore((state) => state.tasks);
  const router = useRouter();

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    ensureNotificationChannel();
    requestNotificationPermission();
    initialize();
  }, []);

  useEffect(() => {
    if (isDataLoaded) {
      resyncAllReminders(tasks);
    }
  }, [isDataLoaded]); // boot-only resync, deliberately not re-running per task edit

  useEffect(() => {
    if (loaded && isDataLoaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded, isDataLoaded]);

  // Tapping a reminder notification opens that task's detail screen
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const taskId = response.notification.request.content.data?.taskId;
      if (taskId) router.push(`/task/${taskId}`);
    });
    return () => sub.remove();
  }, []);

  // Global timer-expiry watchdog — runs regardless of which screen is open,
  // which is what lets the timer survive navigating away from its screen.
  const checkingRef = useRef(false);
  useEffect(() => {
    const interval = setInterval(async () => {
      if (checkingRef.current) return;
      checkingRef.current = true;
      try {
        const justCompleted = await useTaskStore.getState().checkTimerExpiry();
        if (justCompleted) Vibration.vibrate([0, 300, 150, 300]);
      } finally {
        checkingRef.current = false;
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Re-check immediately on foreground, in case the interval above was
  // suspended while the app was backgrounded
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (nextState) => {
      if (nextState === 'active') {
        const justCompleted = await useTaskStore.getState().checkTimerExpiry();
        if (justCompleted) Vibration.vibrate([0, 300, 150, 300]);
      }
    });
    return () => sub.remove();
  }, []);

  if (!loaded || !isDataLoaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}