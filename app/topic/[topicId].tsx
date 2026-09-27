import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, StyleSheet, TextInput } from 'react-native';

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
  const topics = useTaskStore((state) => state.topics);
  const allTasks = useTaskStore((state) => state.tasks);
  const allSessions = useTaskStore((state) => state.sessions);
  const addTask = useTaskStore((state) => state.addTask);
  const updateTask = useTaskStore((state) => state.updateTask);
  const toggleTaskPinned = useTaskStore((state) => state.toggleTaskPinned);
  const deleteTask = useTaskStore((state) => state.deleteTask);
  const moveTasks = useTaskStore((state) => state.moveTasks);
  const copyTasks = useTaskStore((state) => state.copyTasks);

  const textColor = useThemeColor({}, 'text');
  const placeholderColor = useThemeColor({}, 'tabIconDefault');

  const [newTaskName, setNewTaskName] = useState('');
  const [selectedMode, setSelectedMode] = useState<TimerMode>('simple');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [transferMode, setTransferMode] = useState<'move' | 'copy' | null>(null);

  const tasks = useMemo(
    () => allTasks
      .filter((t) => t.topicId === topicId)
      .sort((a, b) => Number(b.pinned) - Number(a.pinned)),
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

  const selectionActive = selectedIds.size > 0;
  const destinationTopics = topics.filter((item) => item.id !== topicId);

  const toggleSelection = (taskId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const cancelSelection = () => {
    setSelectedIds(new Set());
    setTransferMode(null);
  };

  const openTransfer = (mode: 'move' | 'copy') => {
    if (destinationTopics.length === 0) {
      Alert.alert('No destination topic', 'Create another topic before moving or copying tasks.');
      return;
    }
    setTransferMode(mode);
  };

  const completeTransfer = (destinationTopicId: string, mode: 'move' | 'copy') => {
    const taskIds = Array.from(selectedIds);
    if (mode === 'move') moveTasks(taskIds, destinationTopicId);
    if (mode === 'copy') copyTasks(taskIds, destinationTopicId);
    cancelSelection();
  };

  const confirmTransfer = (destinationTopicId: string) => {
    const destination = destinationTopics.find((item) => item.id === destinationTopicId);
    const mode = transferMode;
    if (!destination || !mode) return;

    setTransferMode(null);
    const action = mode === 'move' ? 'Move' : 'Copy';
    Alert.alert(
      `${action} ${selectedIds.size === 1 ? 'task' : 'tasks'}?`,
      `${action} ${selectedIds.size} selected ${selectedIds.size === 1 ? 'task' : 'tasks'} to "${destination.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action,
          onPress: () => completeTransfer(destinationTopicId, mode),
        },
      ]
    );
  };

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

      {selectionActive && (
        <View style={styles.selectionBar}>
          <Text style={styles.selectionCount}>{selectedIds.size} selected</Text>
          <Pressable style={styles.selectionAction} onPress={() => openTransfer('move')}>
            <FontAwesome name="arrow-right" size={14} color="#fff" />
            <Text style={styles.selectionActionText}>Move</Text>
          </Pressable>
          <Pressable style={styles.selectionAction} onPress={() => openTransfer('copy')}>
            <FontAwesome name="copy" size={14} color="#fff" />
            <Text style={styles.selectionActionText}>Copy</Text>
          </Pressable>
          <Pressable onPress={cancelSelection} style={styles.selectionCancel}>
            <FontAwesome name="close" size={18} color="#fff" />
          </Pressable>
        </View>
      )}

      {!selectionActive && <View style={styles.addSection}>
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
      </View>}

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
            <View style={[styles.taskCard, selectedIds.has(item.id) && styles.taskCardSelected]}>
              <Pressable
                style={styles.taskContent}
                onPress={() => selectionActive ? toggleSelection(item.id) : router.push(`/task/${item.id}`)}
                onLongPress={() => toggleSelection(item.id)}>
                {selectionActive && (
                  <FontAwesome
                    name={selectedIds.has(item.id) ? 'check-circle' : 'circle-o'}
                    size={20}
                    color={selectedIds.has(item.id) ? '#4F46E5' : textColor}
                    style={styles.selectionIcon}
                  />
                )}
                <Text style={styles.taskName}>{item.name}</Text>
                <Text style={styles.taskMeta}>
                  {item.timerMode === 'pomodoro' ? 'Pomodoro' : 'Simple'} · {formatDuration(taskSeconds)}
                </Text>
              </Pressable>
              {!selectionActive && <View style={[styles.statusBadge, statusStyles[item.status]]}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>}
              {!selectionActive && <Pressable
                onPress={() => toggleTaskPinned(item.id)}
                style={styles.iconButton}
                accessibilityLabel={item.pinned ? 'Unpin task' : 'Pin task'}>
                <FontAwesome name="thumb-tack" size={15} color={item.pinned ? '#F59E0B' : textColor} />
              </Pressable>}
              {!selectionActive && <Pressable onPress={() => startEditing(item.id, item.name)} style={styles.iconButton}>
                <FontAwesome name="pencil" size={15} color={textColor} />
              </Pressable>}
              {!selectionActive && <Pressable onPress={() => confirmDelete(item.id, item.name)} style={styles.iconButton}>
                <FontAwesome name="trash" size={15} color="#EF4444" />
              </Pressable>}
            </View>
          );
        }}
      />

      <Modal
        visible={transferMode !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setTransferMode(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setTransferMode(null)}>
          <Pressable style={styles.destinationCard} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.destinationTitle}>
              {transferMode === 'move' ? 'Move' : 'Copy'} {selectedIds.size}{' '}
              {selectedIds.size === 1 ? 'task' : 'tasks'} to
            </Text>
            {destinationTopics.map((destination) => (
              <Pressable
                key={destination.id}
                style={styles.destinationRow}
                onPress={() => confirmTransfer(destination.id)}>
                <View style={[styles.destinationDot, { backgroundColor: destination.color }]} />
                <Text style={styles.destinationName}>{destination.name}</Text>
                <FontAwesome name="chevron-right" size={13} color={textColor} />
              </Pressable>
            ))}
            <Pressable style={styles.destinationCancel} onPress={() => setTransferMode(null)}>
              <Text style={styles.destinationCancelText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
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
  taskCardSelected: { borderWidth: 2, borderColor: '#4F46E5', padding: 12 },
  selectionIcon: { marginBottom: 6 },
  selectionBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 12,
    padding: 10, borderRadius: 10, backgroundColor: '#312E81',
  },
  selectionCount: { flex: 1, color: '#fff', fontWeight: '700' },
  selectionAction: {
    flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#4F46E5',
    borderRadius: 7, paddingHorizontal: 10, paddingVertical: 8,
  },
  selectionActionText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  selectionCancel: { padding: 7 },
  modalBackdrop: {
    flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.55)',
  },
  destinationCard: { borderRadius: 14, padding: 18, backgroundColor: '#fff' },
  destinationTitle: { color: '#111827', fontSize: 18, fontWeight: '700', marginBottom: 12 },
  destinationRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#D1D5DB',
  },
  destinationDot: { width: 12, height: 12, borderRadius: 6 },
  destinationName: { flex: 1, color: '#111827', fontSize: 15, fontWeight: '600' },
  destinationCancel: { alignItems: 'center', paddingTop: 16 },
  destinationCancelText: { color: '#4F46E5', fontWeight: '700' },
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
