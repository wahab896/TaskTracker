import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, SectionList, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { useTaskStore } from '@/store/useTaskStore';
import { Task } from '@/types';
import { formatDuration } from '@/utils/time';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


export default function CompletedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const tasks = useTaskStore((state) => state.tasks);
  const topics = useTaskStore((state) => state.topics);
  const sessions = useTaskStore((state) => state.sessions);
  const updateTaskStatus = useTaskStore((state) => state.updateTaskStatus);

  const getTaskSeconds = (taskId: string) =>
    sessions.filter((s) => s.taskId === taskId).reduce((sum, s) => sum + s.durationSeconds, 0);

  const getTopicName = (topicId: string) =>
    topics.find((t) => t.id === topicId)?.name ?? 'Unknown topic';

  const sections = useMemo(() => {
    const completed = tasks.filter((t) => t.status === 'completed');
    const expired = tasks.filter((t) => t.status === 'expired');

    const result: { title: string; data: Task[] }[] = [];
    if (completed.length) result.push({ title: 'Completed', data: completed });
    if (expired.length) result.push({ title: 'Expired', data: expired });
    return result;
  }, [tasks]);

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Nothing here yet — completed and expired tasks show up in this tab.</Text>
        }
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <Pressable style={styles.taskCard} onPress={() => router.push(`/task/${item.id}`)}>
            <View style={styles.taskContent}>
              <Text style={styles.taskName}>{item.name}</Text>
              <Text style={styles.taskMeta}>
                {getTopicName(item.topicId)} · {formatDuration(getTaskSeconds(item.id))}
              </Text>
            </View>
            <Pressable
              style={styles.reopenButton}
              onPress={() => updateTaskStatus(item.id, 'current')}>
              <Text style={styles.reopenButtonText}>Reopen</Text>
            </Pressable>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16 },
  sectionHeader: { fontSize: 15, fontWeight: '700', marginTop: 12, marginBottom: 8, opacity: 0.7 },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    backgroundColor: 'rgba(128,128,128,0.08)',
  },
  taskContent: { flex: 1 },
  taskName: { fontSize: 15, fontWeight: '600' },
  taskMeta: { fontSize: 12, opacity: 0.6, marginTop: 4 },
  reopenButton: {
    borderWidth: 1,
    borderColor: '#4F46E5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  reopenButtonText: { color: '#4F46E5', fontWeight: '600', fontSize: 12 },
  emptyText: { textAlign: 'center', opacity: 0.5, marginTop: 40 },
});