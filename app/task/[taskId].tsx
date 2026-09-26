import FontAwesome from '@expo/vector-icons/FontAwesome';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Crypto from 'expo-crypto';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, View, useThemeColor } from '@/components/Themed';
import { scheduleRemindersForTask } from '@/services/scheduling';
import { useTaskStore } from '@/store/useTaskStore';
import { NoteItem, ScheduleFrequency } from '@/types';
import { formatDuration } from '@/utils/time';

import { useRef } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function TaskDetailScreen() {
  const { taskId } = useLocalSearchParams<{ taskId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const allTasks = useTaskStore((state) => state.tasks);
  const allSessions = useTaskStore((state) => state.sessions);
  const allNotes = useTaskStore((state) => state.notes);
  const activeTimer = useTaskStore((state) => state.activeTimer);
  const updateTaskStatus = useTaskStore((state) => state.updateTaskStatus);
  const updateTaskSchedule = useTaskStore((state) => state.updateTaskSchedule);
  const addNote = useTaskStore((state) => state.addNote);
  const updateNote = useTaskStore((state) => state.updateNote);

  const listRef = useRef<FlatList>(null);

  const textColor = useThemeColor({}, 'text');
  const placeholderColor = useThemeColor({}, 'tabIconDefault');

  const task = useMemo(() => allTasks.find((t) => t.id === taskId), [allTasks, taskId]);

  const sessions = useMemo(
    () =>
      allSessions
        .filter((s) => s.taskId === taskId)
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()),
    [allSessions, taskId]
  );

  const totalSeconds = useMemo(
    () => sessions.reduce((sum, s) => sum + s.durationSeconds, 0),
    [sessions]
  );

  const existingNote = useMemo(() => allNotes.find((n) => n.taskId === taskId), [allNotes, taskId]);

  // --- Checklist (note) local draft state — nothing persists until Save ---
  const [draftItems, setDraftItems] = useState<NoteItem[]>(existingNote?.items ?? []);
  const [newItemText, setNewItemText] = useState('');

  useEffect(() => {
    setDraftItems(existingNote?.items ?? []);
  }, [existingNote?.id]);

  const addDraftItem = () => {
    const trimmed = newItemText.trim();
    if (!trimmed) return;
    const newItems = [...draftItems, { id: Crypto.randomUUID(), text: trimmed, done: false }];
    setDraftItems(newItems);
    setNewItemText('');
    saveChecklist(newItems); // pass new items directly — state hasn't updated yet
  };


  const toggleDraftItem = (id: string) => {
    const newItems = draftItems.map((i) => (i.id === id ? { ...i, done: !i.done } : i));
    setDraftItems(newItems);
    saveChecklist(newItems);
  };


  const removeDraftItem = (id: string) => {
    const newItems = draftItems.filter((i) => i.id !== id);
    setDraftItems(newItems);
    saveChecklist(newItems);
  };

  const allDone = draftItems.length > 0 && draftItems.every((i) => i.done);
  const toggleAll = () => {
    const newItems = draftItems.map((i) => ({ ...i, done: !allDone }));
    setDraftItems(newItems);
    saveChecklist(newItems);
  };

  const saveChecklist = (items: NoteItem[]) => {
    if (existingNote) {
      updateNote(existingNote.id, items);
    } else if (items.length > 0) {
      addNote(task!.id, items);
    }
  };
  // --- end checklist state ---

  // --- Scheduling / reminder local state ---
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [draftFrequency, setDraftFrequency] = useState<ScheduleFrequency | 'none'>(
    task?.schedule?.frequency ?? 'none'
  );
  const [draftTime, setDraftTime] = useState(() => {
    if (task?.schedule?.scheduledTime) {
      const [h, m] = task.schedule.scheduledTime.split(':').map(Number);
      const d = new Date();
      d.setHours(h, m, 0, 0);
      return d;
    }
    return new Date();
  });
  const [draftDate, setDraftDate] = useState(
    task?.schedule?.scheduledDate ? new Date(task.schedule.scheduledDate) : new Date()
  );
  const [draftDays, setDraftDays] = useState<number[]>(task?.schedule?.daysOfWeek ?? []);

  const toggleDay = (day: number) => {
    setDraftDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  };

  const handleSaveSchedule = () => {
    if (!task) return;

    if (draftFrequency === 'none') {
      updateTaskSchedule(task.id, null);
      scheduleRemindersForTask({ ...task, schedule: null });
      return;
    }

    const hh = draftTime.getHours().toString().padStart(2, '0');
    const mm = draftTime.getMinutes().toString().padStart(2, '0');

    const newSchedule = {
      frequency: draftFrequency,
      scheduledTime: `${hh}:${mm}`,
      daysOfWeek: draftFrequency === 'weekly' ? draftDays : null,
      scheduledDate: draftFrequency === 'once' ? draftDate.toISOString() : null,
    };

    updateTaskSchedule(task.id, newSchedule);
    scheduleRemindersForTask({ ...task, schedule: newSchedule });
  };
  // --- end scheduling state ---

  if (!task) {
    return (
      <View style={styles.container}>
        <Text>Task not found</Text>
      </View>
    );
  }

  const handleMarkComplete = () => {
    updateTaskStatus(task.id, task.status === 'completed' ? 'current' : 'completed');
  };

  const isThisTaskRunning = activeTimer?.taskId === task.id;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: task.name }} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View>
              <View style={styles.headerCard}>
                <Text style={styles.headerTitle}>{task.name}</Text>
                <Text style={styles.headerMeta}>
                  {task.timerMode === 'pomodoro' ? 'Pomodoro' : 'Simple'} · {formatDuration(totalSeconds)} total
                </Text>
                <View style={[styles.statusBadge, statusStyles[task.status]]}>
                  <Text style={styles.statusText}>{task.status}</Text>
                </View>
                {isThisTaskRunning && (
                  <View style={styles.runningBadge}>
                    <Text style={styles.runningBadgeText}>Timer running</Text>
                  </View>
                )}
              </View>
              <View style={styles.actionsRow}>
                <Pressable
                  style={styles.startButton}
                  onPress={() => router.push(`/timer/${task.id}`)}>
                  <Text style={styles.startButtonText}>
                    {isThisTaskRunning ? 'View Timer' : 'Start Timer'}
                  </Text>
                </Pressable>
                <Pressable style={styles.completeButton} onPress={handleMarkComplete}>
                  <Text style={styles.completeButtonText}>
                    {task.status === 'completed' ? 'Reopen' : 'Mark Complete'}
                  </Text>
                </Pressable>
              </View>
              <View style={styles.noteSection}>
                <View style={styles.checklistHeaderRow}>
                  <Text style={styles.sectionTitle}>Checklist</Text>
                  {draftItems.length > 0 && (
                    <Pressable onPress={toggleAll}>
                      <Text style={styles.toggleAllText}>{allDone ? 'Reset All' : 'Check All'}</Text>
                    </Pressable>
                  )}
                </View>
                {draftItems.map((item) => (
                  <View key={item.id} style={styles.checklistRow}>
                    <Pressable onPress={() => toggleDraftItem(item.id)} style={styles.checkbox}>
                      <FontAwesome
                        name={item.done ? 'check-square' : 'square-o'}
                        size={20}
                        color={item.done ? '#22C55E' : textColor}
                      />
                    </Pressable>
                    <Text style={[styles.checklistText, item.done && styles.checklistTextDone]}>
                      {item.text}
                    </Text>
                    <Pressable onPress={() => removeDraftItem(item.id)} style={styles.checklistDelete}>
                      <FontAwesome name="close" size={16} color="#EF4444" />
                    </Pressable>
                  </View>
                ))}
                <View style={styles.addItemRow}>
                  <TextInput
                    style={[styles.addItemInput, { color: textColor }]}
                    placeholder="Add checklist item..."
                    placeholderTextColor={placeholderColor}
                    value={newItemText}
                    onChangeText={setNewItemText}
                    onSubmitEditing={addDraftItem}
                    returnKeyType="done"
                    onFocus={() => {
                      // Give the keyboard a moment to open and the list to resize before
                      // scrolling, otherwise we scroll against the pre-keyboard layout
                      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 250);
                    }}

                  />
                  <Pressable style={styles.addItemButton} onPress={addDraftItem}>
                    <FontAwesome name="plus" size={16} color="#fff" />
                  </Pressable>
                </View>
              </View>
              <View style={styles.scheduleSection}>
                <Text style={styles.sectionTitle}>Reminder</Text>
                <View style={styles.freqRow}>
                  {(['none', 'daily', 'weekly', 'once'] as const).map((freq) => (
                    <Pressable
                      key={freq}
                      style={[styles.freqButton, draftFrequency === freq && styles.freqButtonActive]}
                      onPress={() => setDraftFrequency(freq)}>
                      <Text style={draftFrequency === freq ? styles.freqTextActive : styles.freqText}>
                        {freq === 'none' ? 'None' : freq[0].toUpperCase() + freq.slice(1)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {draftFrequency !== 'none' && (
                  <>
                    <Pressable style={styles.pickerButton} onPress={() => setShowTimePicker(true)}>
                      <Text style={styles.pickerButtonText}>
                        Time: {draftTime.getHours().toString().padStart(2, '0')}:
                        {draftTime.getMinutes().toString().padStart(2, '0')}
                      </Text>
                    </Pressable>
                    {showTimePicker && (
                      <DateTimePicker
                        value={draftTime}
                        mode="time"
                        onChange={(_, selected) => {
                          setShowTimePicker(false);
                          if (selected) setDraftTime(selected);
                        }}
                      />
                    )}
                    {draftFrequency === 'weekly' && (
                      <View style={styles.dayRow}>
                        {DAY_LABELS.map((label, index) => (
                          <Pressable
                            key={label}
                            style={[styles.dayChip, draftDays.includes(index) && styles.dayChipActive]}
                            onPress={() => toggleDay(index)}>
                            <Text style={draftDays.includes(index) ? styles.dayTextActive : styles.dayText}>
                              {label}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                    {draftFrequency === 'once' && (
                      <>
                        <Pressable style={styles.pickerButton} onPress={() => setShowDatePicker(true)}>
                          <Text style={styles.pickerButtonText}>
                            Date: {draftDate.toLocaleDateString()}
                          </Text>
                        </Pressable>
                        {showDatePicker && (
                          <DateTimePicker
                            value={draftDate}
                            mode="date"
                            minimumDate={new Date()}
                            onChange={(_, selected) => {
                              setShowDatePicker(false);
                              if (selected) setDraftDate(selected);
                            }}
                          />
                        )}
                      </>
                    )}
                  </>
                )}
                <Pressable style={styles.saveScheduleButton} onPress={handleSaveSchedule}>
                  <Text style={styles.saveScheduleButtonText}>Save Reminder</Text>
                </Pressable>
              </View>
              <Text style={styles.sectionTitle}>Session History</Text>
            </View>
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No sessions yet — start the timer to log one.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.sessionRow}>
              <Text style={styles.sessionDate}>{formatDateTime(item.startTime)}</Text>
              <View style={styles.sessionRight}>
                <Text style={styles.sessionDuration}>{formatDuration(item.durationSeconds)}</Text>
                {!item.stoppedManually && item.endTime && (
                  <Text style={styles.sessionAutoTag}>auto-completed</Text>
                )}
              </View>
            </View>
          )}
        />
      </KeyboardAvoidingView>
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
  list: { padding: 16 },
  headerCard: {
    padding: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(128,128,128,0.08)',
    gap: 6,
  },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  headerMeta: { fontSize: 13, opacity: 0.6 },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  runningBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#4F46E5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
  },
  runningBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  startButton: {
    flex: 1,
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  startButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  completeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#4F46E5',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  completeButtonText: { color: '#4F46E5', fontWeight: '700', fontSize: 15 },
  noteSection: { marginTop: 24 },
  checklistHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  toggleAllText: { color: '#4F46E5', fontSize: 13, fontWeight: '600' },
  checklistRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  checkbox: { padding: 2 },
  checklistText: { flex: 1, fontSize: 14 },
  checklistTextDone: { textDecorationLine: 'line-through', opacity: 0.5 },
  checklistDelete: { padding: 4 },
  addItemRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  addItemInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  addItemButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleSection: { marginTop: 24 },
  freqRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  freqButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  freqButtonActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  freqText: { fontSize: 13 },
  freqTextActive: { fontSize: 13, color: '#fff', fontWeight: '600' },
  pickerButton: {
    borderWidth: 1,
    borderColor: '#4F46E5',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  pickerButtonText: { color: '#4F46E5', fontWeight: '600', fontSize: 13 },
  dayRow: { flexDirection: 'row', gap: 6, marginBottom: 12, flexWrap: 'wrap' },
  dayChip: {
    width: 44,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  dayText: { fontSize: 12 },
  dayTextActive: { fontSize: 12, color: '#fff', fontWeight: '600' },
  saveScheduleButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  saveScheduleButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.3)',
  },
  sessionDate: { fontSize: 13, opacity: 0.7 },
  sessionRight: { alignItems: 'flex-end' },
  sessionDuration: { fontSize: 14, fontWeight: '600' },
  sessionAutoTag: { fontSize: 10, opacity: 0.5, marginTop: 2 },
  emptyText: { textAlign: 'center', opacity: 0.5, marginTop: 24, marginBottom: 24 },
});