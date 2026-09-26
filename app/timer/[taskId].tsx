import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { useTaskStore } from '@/store/useTaskStore';

const DURATION_OPTIONS_MIN = [15, 25, 45, 60];

export default function TimerScreen() {
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const router = useRouter();

  const task = useTaskStore((state) => state.tasks.find((t) => t.id === taskId));
  const activeTimer = useTaskStore((state) => state.activeTimer);
  const beginTimer = useTaskStore((state) => state.beginTimer);
  const pauseTimer = useTaskStore((state) => state.pauseTimer);
  const resumeTimer = useTaskStore((state) => state.resumeTimer);
  const stopTimer = useTaskStore((state) => state.stopTimer);

  const isThisTaskRunning = activeTimer?.taskId === taskId;
  const [displayRemaining, setDisplayRemaining] = useState(0);

  // UI-only 1s tick for the countdown text. Real timer state lives in the
  // store + root layout's global watchdog, so closing/reopening this screen
  // never affects whether the timer is actually running.
  useEffect(() => {
    if (!isThisTaskRunning || !activeTimer) return;

    const update = () => {
      setDisplayRemaining(
        activeTimer.paused
          ? activeTimer.remainingAtPause ?? 0
          : Math.max(0, Math.round((activeTimer.endTime - Date.now()) / 1000))
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [isThisTaskRunning, activeTimer]);

  const handleStart = async (durationSeconds: number) => {
    if (!task) return;
    const result = await beginTimer(task.id, durationSeconds);
    if (!result.ok) Alert.alert('Timer already running', result.reason ?? 'Try again.');
    else if (!result.notificationsEnabled) {
      Alert.alert(
        'Notifications are off',
        'The timer will still run, but completion alerts are unavailable. Enable notifications for TaskTracker in system settings.'
      );
    }
  };

  const handleStop = async () => {
    await stopTimer(true);
    router.back();
  };

  if (!task) {
    return (
      <View style={styles.container}>
        <Text>Task not found</Text>
      </View>
    );
  }

  if (activeTimer && !isThisTaskRunning) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.taskName}>{task.name}</Text>
        <Text style={styles.selectLabel}>
          Another timer is currently running. Stop it before starting this one.
        </Text>
        <Pressable style={styles.stopButton} onPress={() => router.back()}>
          <Text style={styles.stopButtonText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {!isThisTaskRunning && (
        <>
          <Text style={styles.taskName}>{task.name}</Text>
          <Text style={styles.selectLabel}>
            {task.timerMode === 'pomodoro' ? 'Pomodoro session' : 'Choose duration'}
          </Text>

          {task.timerMode === 'pomodoro' ? (
            <Pressable
              style={styles.bigStartButton}
              onPress={() => handleStart((task.pomodoroConfig?.workMinutes ?? 25) * 60)}>
              <Text style={styles.bigStartButtonText}>
                Start {task.pomodoroConfig?.workMinutes ?? 25}m
              </Text>
            </Pressable>
          ) : (
            <View style={styles.durationGrid}>
              {DURATION_OPTIONS_MIN.map((min) => (
                <Pressable key={min} style={styles.durationOption} onPress={() => handleStart(min * 60)}>
                  <Text style={styles.durationOptionText}>{min}m</Text>
                </Pressable>
              ))}
            </View>
          )}
        </>
      )}

      {isThisTaskRunning && activeTimer && (
        <>
          <Text style={styles.taskName}>{task.name}</Text>
          <Text style={styles.countdown}>
            {Math.floor(displayRemaining / 60)}:{(displayRemaining % 60).toString().padStart(2, '0')}
          </Text>

          <View style={styles.controlsRow}>
            {activeTimer.paused ? (
              <Pressable style={styles.controlButton} onPress={resumeTimer}>
                <Text style={styles.controlButtonText}>Resume</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.controlButton} onPress={pauseTimer}>
                <Text style={styles.controlButtonText}>Pause</Text>
              </Pressable>
            )}
            <Pressable style={styles.stopButton} onPress={handleStop}>
              <Text style={styles.stopButtonText}>Stop</Text>
            </Pressable>
          </View>

          <Text style={styles.backHint}>You can leave this screen — the timer keeps running.</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  taskName: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  selectLabel: { fontSize: 14, opacity: 0.6, marginBottom: 24, textAlign: 'center' },
  durationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  durationOption: {
    width: 90, height: 90, borderRadius: 45, borderWidth: 2, borderColor: '#4F46E5',
    alignItems: 'center', justifyContent: 'center',
  },
  durationOptionText: { fontSize: 18, fontWeight: '700', color: '#4F46E5' },
  bigStartButton: { backgroundColor: '#4F46E5', borderRadius: 100, paddingVertical: 24, paddingHorizontal: 40 },
  bigStartButtonText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  countdown: { fontSize: 72, fontWeight: '200', marginVertical: 40, fontVariant: ['tabular-nums'] },
  controlsRow: { flexDirection: 'row', gap: 16, marginTop: 16 },
  controlButton: { borderWidth: 2, borderColor: '#4F46E5', borderRadius: 30, paddingVertical: 14, paddingHorizontal: 32 },
  controlButtonText: { color: '#4F46E5', fontWeight: '700', fontSize: 16 },
  stopButton: { backgroundColor: '#EF4444', borderRadius: 30, paddingVertical: 14, paddingHorizontal: 32 },
  stopButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  backHint: { fontSize: 12, opacity: 0.5, marginTop: 24, textAlign: 'center' },
});
