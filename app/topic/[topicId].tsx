import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, TextInput } from 'react-native';

import { Text, View, useThemeColor } from '@/components/Themed';
import { useTaskStore } from '@/store/useTaskStore';
import { TimerMode } from '@/types';
import { formatDuration } from '@/utils/time';

import { useSafeAreaInsets } from 'react-native-safe-area-context';


const DEFAULT_POMODORO = { workMinutes: 25, breakMinutes: 5, cyclesBeforeLongBreak: 4 };

export default function TopicDetailScreen() {
  const { topicId } = useLocalSearchParams<{ topicId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const topic = useTaskStore((state) => state.topics.find((t) => t.id === topicId));
  const allTasks = useTaskStore((state) => state.tasks);
  const allSessions = useTaskStore((state) => state.sessions);
  const addTask = useTaskStore((state) => state.addTask);
  const updateTask = useTaskStore((state) => state.updateTask);
  const deleteTask = useTaskStore((state) => state.deleteTask);

  const textColor = useThemeColor({}, 'text');
  const placeholderColor = useThemeColor({}, 'tabIconDefault');

  const [newTaskName, setNewTaskName] = useState('');
  const [selectedMode, setSelectedMode] = useState<TimerMode>('simple');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const tasks = useMemo(
    () => allTasks.filter((t) => t.topicId === topicId),
    [allTasks, topicId]
  );

  const totalSeconds = useMemo(() => {
    const taskIds = tasks.map((t) => t.id);
    return allSessions
      .filter((s) => taskIds.includes(s.taskId))
      .reduce((sum, s) => sum + s.durationSeconds, 0);
  }, [tasks, allSessions]);

  const getTotalSecondsForTask = (taskId: string) =>
    allSessions.filter((s) => s.taskId === taskId).reduce((sum, s) => sum + s.durationSeconds, 0);

  if (!topic) {
    return (
      <View style={styles.container}>
        <Text>Topic not found</Text>
      </View>
    );
  }

  const handleAddTask = () => {
    const trimmed = newTaskName.trim();
    if (!trimmed) return;

    addTask({
      topicId: topic.id,
      name: trimmed,
      timerMode: selectedMode,
      pomodoroConfig: selectedMode === 'pomodoro' ? DEFAULT_POMODORO : null,
      schedule: null,
      expiryDate: null,
    });

    setNewTaskName('');
    setSelectedMode('simple');
  };

  const startEditing = (taskId: string, currentName: string) => {
    setEditingId(taskId);
    setEditingName(currentName);
  };

  const saveEdit = () => {
    const trimmed = editingName.trim();
    if (editingId && trimmed) {
      updateTask(editingId, trimmed);
    }
    setEditingId(null);
    setEditingName('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const confirmDelete = (taskId: string, name: string) => {
    Alert.alert(
      'Delete task',
      `Delete "${name}" and all its sessions and notes? This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteTask(taskId) },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: topic.name }} />

      <View style={[styles.header, { borderLeftColor: topic.color }]}>
        <Text style={styles.headerTitle}>{topic.name}</Text>
        <Text style={styles.headerSubtitle}>{formatDuration(totalSeconds)} total</Text>
      </View>

      <View style={styles.addSection}>
        <TextInput
          style={[styles.input, { color: textColor }]}
          placeholder="New task name"
          placeholderTextColor={placeholderColor}
          value={newTaskName}
          onChangeText={setNewTaskName}
          returnKeyType="done"
        />

        <View style={styles.modeRow}>
          <Pressable
            style={[styles.modeButton, selectedMode === 'simple' && styles.modeButtonActive]}
            onPress={() => setSelectedMode('simple')}>
            <Text style={selectedMode === 'simple' ? styles.modeTextActive : styles.modeText}>
              Simple
            </Text>
          </Pressable>
          <Pressable
            style={[styles.modeButton, selectedMode === 'pomodoro' && styles.modeButtonActive]}
            onPress={() => setSelectedMode('pomodoro')}>
            <Text style={selectedMode === 'pomodoro' ? styles.modeTextActive : styles.modeText}>
              Pomodoro
            </Text>
          </Pressable>

          <Pressable style={styles.addButton} onPress={handleAddTask}>
            <Text style={styles.addButtonText}>Add</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No tasks yet — add one above.</Text>
        }
        renderItem={({ item }) => {
          const taskSeconds = getTotalSecondsForTask(item.id);
          const isEditing = editingId === item.id;

          if (isEditing) {
            return (
              <View style={styles.taskCard}>
                <View style={styles.taskContent}>
                  <TextInput
                    style={[styles.editInput, { color: textColor }]}
                    value={editingName}
                    onChangeText={setEditingName}
                    autoFocus
                    onSubmitEditing={saveEdit}
                  />
                </View>
                <Pressable onPress={saveEdit} style={styles.iconButton}>
                  <FontAwesome name="check" size={18} color="#22C55E" />
                </Pressable>
                <Pressable onPress={cancelEdit} style={styles.iconButton}>
                  <FontAwesome name="close" size={18} color="#EF4444" />
                </Pressable>
              </View>
            );
          }

          return (
            <View style={styles.taskCard}>
              <Pressable
                style={styles.taskContent}
                onPress={() => router.push(`/task/${item.id}`)}>
                <Text style={styles.taskName}>{item.name}</Text>
                <Text style={styles.taskMeta}>
                  {item.timerMode === 'pomodoro' ? 'Pomodoro' : 'Simple'} · {formatDuration(taskSeconds)}
                </Text>
              </Pressable>
              <View style={[styles.statusBadge, statusStyles[item.status]]}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
              <Pressable onPress={() => startEditing(item.id, item.name)} style={styles.iconButton}>
                <FontAwesome name="pencil" size={15} color={textColor} />
              </Pressable>
              <Pressable onPress={() => confirmDelete(item.id, item.name)} style={styles.iconButton}>
                <FontAwesome name="trash" size={15} color="#EF4444" />
              </Pressable>
            </View>
          );
        }}
      />
    </View>
  );
}

const statusStyles = StyleSheet.create({
  current: { backgroundColor: '#4F46E533' },
  completed: { backgroundColor: '#22C55E33' },
  expired: { backgroundColor: '#EF444433' },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    padding: 16,
    borderLeftWidth: 5,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 6,
    backgroundColor: 'rgba(128,128,128,0.08)',
  },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  headerSubtitle: { fontSize: 13, opacity: 0.6, marginTop: 4 },
  addSection: { paddingHorizontal: 16, paddingTop: 16, gap: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
  },
  modeRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  modeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  modeButtonActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  modeText: { fontSize: 13 },
  modeTextActive: { fontSize: 13, color: '#fff', fontWeight: '600' },
  addButton: {
    marginLeft: 'auto',
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  addButtonText: { color: '#fff', fontWeight: '600' },
  list: { padding: 16 },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    backgroundColor: 'rgba(128,128,128,0.08)',
    gap: 4,
  },
  taskContent: { flex: 1 },
  taskName: { fontSize: 15, fontWeight: '600' },
  taskMeta: { fontSize: 12, opacity: 0.6, marginTop: 4 },
  editInput: {
    borderWidth: 1,
    borderColor: '#4F46E5',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 15,
  },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  iconButton: { padding: 6 },
  emptyText: { textAlign: 'center', opacity: 0.5, marginTop: 40 },
});