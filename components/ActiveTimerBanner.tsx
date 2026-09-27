import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTaskStore } from '@/store/useTaskStore';

function formatRemaining(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function ActiveTimerBanner() {
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const activeTimer = useTaskStore((state) => state.activeTimer);
  const task = useTaskStore((state) =>
    activeTimer ? state.tasks.find((item) => item.id === activeTimer.taskId) : undefined
  );
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!activeTimer) return;

    const update = () => {
      setRemaining(
        activeTimer.paused
          ? activeTimer.remainingAtPause ?? 0
          : Math.max(0, Math.round((activeTimer.endTime - Date.now()) / 1000))
      );
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [activeTimer]);

  if (!activeTimer || !task || segments[0] === 'timer') return null;

  const aboveTabBar = segments[0] === '(tabs)';

  return (
    <Pressable
      style={[styles.banner, { bottom: insets.bottom + (aboveTabBar ? 58 : 12) }]}
      onPress={() => router.push(`/timer/${task.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`View timer for ${task.name}`}>
      <View style={[styles.indicator, activeTimer.paused && styles.indicatorPaused]} />
      <View style={styles.details}>
        <Text style={styles.label}>{activeTimer.paused ? 'Timer paused' : 'Timer running'}</Text>
        <Text style={styles.taskName} numberOfLines={1}>{task.name}</Text>
      </View>
      <Text style={styles.remaining}>
        {activeTimer.paused ? 'Paused' : formatRemaining(remaining)}
      </Text>
      <FontAwesome name="chevron-right" size={13} color="#fff" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 100,
    elevation: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#312E81',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 5,
  },
  indicator: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#22C55E' },
  indicatorPaused: { backgroundColor: '#F59E0B' },
  details: { flex: 1 },
  label: { color: '#C7D2FE', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  taskName: { color: '#fff', fontSize: 14, fontWeight: '700', marginTop: 1 },
  remaining: { color: '#fff', fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
