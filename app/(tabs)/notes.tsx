import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, View } from '@/components/Themed';
import { useTaskStore } from '@/store/useTaskStore';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function NotesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const notes = useTaskStore((state) => state.notes);
  const tasks = useTaskStore((state) => state.tasks);
  const topics = useTaskStore((state) => state.topics);

  const enrichedNotes = useMemo(() => {
    return notes
      .filter((n) => n.items.length > 0)
      .map((note) => {
        const task = tasks.find((t) => t.id === note.taskId);
        const topic = task ? topics.find((tp) => tp.id === task.topicId) : undefined;
        return { note, task, topic };
      })
      .filter((entry) => entry.task)
      .sort((a, b) => new Date(b.note.updatedAt).getTime() - new Date(a.note.updatedAt).getTime());
  }, [notes, tasks, topics]);

  return (
    <View style={styles.container}>
      <FlatList
        data={enrichedNotes}
        keyExtractor={(item) => item.note.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No checklists yet — add one from any task's detail screen.</Text>
        }
        renderItem={({ item }) => {
          const doneCount = item.note.items.filter((i) => i.done).length;
          return (
            <Pressable
              style={styles.noteCard}
              onPress={() => router.push(`/task/${item.task!.id}`)}>
              <View style={[styles.colorBand, { backgroundColor: item.topic?.color ?? '#888' }]} />
              <View style={styles.noteContent}>
                <Text style={styles.noteMeta}>
                  {item.topic?.name ?? 'Unknown topic'} · {item.task!.name} · {doneCount}/{item.note.items.length} done
                </Text>
                {item.note.items.slice(0, 3).map((noteItem) => (
                  <Text
                    key={noteItem.id}
                    style={[styles.noteText, noteItem.done && styles.noteTextDone]}
                    numberOfLines={1}>
                    {noteItem.done ? '✓ ' : '• '}{noteItem.text}
                  </Text>
                ))}
                <Text style={styles.noteDate}>{formatDate(item.note.updatedAt)}</Text>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16 },
  noteCard: {
    flexDirection: 'row',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: 'rgba(128,128,128,0.08)',
  },
  colorBand: { width: 5 },
  noteContent: { flex: 1, padding: 14 },
  noteMeta: { fontSize: 12, opacity: 0.6, marginBottom: 6 },
  noteText: { fontSize: 13, lineHeight: 19 },
  noteTextDone: { textDecorationLine: 'line-through', opacity: 0.5 },
  noteDate: { fontSize: 11, opacity: 0.5, marginTop: 8 },
  emptyText: { textAlign: 'center', opacity: 0.5, marginTop: 40 },
});