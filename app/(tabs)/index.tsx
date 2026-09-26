import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, TextInput } from 'react-native';

import { Text, View, useThemeColor } from '@/components/Themed';
import { useTaskStore } from '@/store/useTaskStore';
import { generateTopicColor } from '@/utils/colors';
import { formatDuration } from '@/utils/time';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topics = useTaskStore((state) => state.topics);
  const addTopic = useTaskStore((state) => state.addTopic);
  const updateTopic = useTaskStore((state) => state.updateTopic);
  const deleteTopic = useTaskStore((state) => state.deleteTopic);
  const getTotalSecondsForTopic = useTaskStore((state) => state.getTotalSecondsForTopic);

  const textColor = useThemeColor({}, 'text');
  const placeholderColor = useThemeColor({}, 'tabIconDefault');

  const [newTopicName, setNewTopicName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleAddTopic = () => {
    const trimmed = newTopicName.trim();
    if (!trimmed) return;

    const color = generateTopicColor(topics.length);
    addTopic(trimmed, color);
    setNewTopicName('');
  };

  const startEditing = (topicId: string, currentName: string) => {
    setEditingId(topicId);
    setEditingName(currentName);
  };

  const saveEdit = () => {
    const trimmed = editingName.trim();
    if (editingId && trimmed) {
      updateTopic(editingId, trimmed);
    }
    setEditingId(null);
    setEditingName('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const confirmDelete = (topicId: string, name: string) => {
    Alert.alert(
      'Delete topic',
      `Delete "${name}" and all its tasks, sessions, and notes? This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteTopic(topicId) },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.addRow}>
        <TextInput
          style={[styles.input, { color: textColor }]}
          placeholder="New topic name"
          placeholderTextColor={placeholderColor}
          value={newTopicName}
          onChangeText={setNewTopicName}
          onSubmitEditing={handleAddTopic}
          returnKeyType="done"
        />
        <Pressable style={styles.addButton} onPress={handleAddTopic}>
          <Text style={styles.addButtonText}>Add</Text>
        </Pressable>
      </View>

      <FlatList
        data={topics}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No topics yet — add one above to get started.</Text>
        }
        renderItem={({ item }) => {
          const totalSeconds = getTotalSecondsForTopic(item.id);
          const isEditing = editingId === item.id;

          return (
            <View style={styles.topicCard}>
              <View style={[styles.colorBand, { backgroundColor: item.color }]} />

              {isEditing ? (
                <View style={styles.topicContent}>
                  <TextInput
                    style={[styles.editInput, { color: textColor }]}
                    value={editingName}
                    onChangeText={setEditingName}
                    autoFocus
                    onSubmitEditing={saveEdit}
                  />
                  <View style={styles.editActions}>
                    <Pressable onPress={saveEdit} style={styles.iconButton}>
                      <FontAwesome name="check" size={18} color="#22C55E" />
                    </Pressable>
                    <Pressable onPress={cancelEdit} style={styles.iconButton}>
                      <FontAwesome name="close" size={18} color="#EF4444" />
                    </Pressable>
                  </View>
                </View>
              ) : (
                <>
                  <Pressable
                    style={styles.topicContent}
                    onPress={() => router.push(`/topic/${item.id}`)}>
                    <Text style={styles.topicName}>{item.name}</Text>
                    <Text style={styles.topicHours}>{formatDuration(totalSeconds)}</Text>
                  </Pressable>
                  <View style={styles.cardActions}>
                    <Pressable onPress={() => startEditing(item.id, item.name)} style={styles.iconButton}>
                      <FontAwesome name="pencil" size={16} color={textColor} />
                    </Pressable>
                    <Pressable onPress={() => confirmDelete(item.id, item.name)} style={styles.iconButton}>
                      <FontAwesome name="trash" size={16} color="#EF4444" />
                    </Pressable>
                  </View>
                </>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  addRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
  },
  addButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  addButtonText: { color: '#fff', fontWeight: '600' },
  list: { padding: 16 },
  topicCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: 'rgba(128,128,128,0.08)',
  },
  colorBand: { width: 6, alignSelf: 'stretch' },
  topicContent: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: 'transparent',
  },
  topicName: { fontSize: 16, fontWeight: '600' },
  topicHours: { fontSize: 13, opacity: 0.6, marginTop: 4 },
  editInput: {
    borderWidth: 1,
    borderColor: '#4F46E5',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 15,
  },
  editActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cardActions: { flexDirection: 'row', gap: 4, paddingRight: 10, backgroundColor: 'transparent' },
  iconButton: { padding: 8 },
  emptyText: { textAlign: 'center', opacity: 0.5, marginTop: 40 },
});