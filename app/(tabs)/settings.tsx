import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';
import { exportToShareableFile, importFromFile } from '@/services/storage';
import { useTaskStore } from '@/store/useTaskStore';

export default function SettingsScreen() {
  const initialize = useTaskStore((state) => state.initialize);
  const wipeAllData = useTaskStore((state) => state.wipeAllData);
  const topics = useTaskStore((state) => state.topics);
  const tasks = useTaskStore((state) => state.tasks);

  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    setBusy(true);
    try {
      const fileUri = await exportToShareableFile();
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, { mimeType: 'application/json' });
      } else {
        Alert.alert('Export ready', `Saved to: ${fileUri}`);
      }
    } catch (error) {
      console.error('[settings] Export failed:', error);
      Alert.alert('Export failed', 'Something went wrong while exporting your data.');
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
      if (result.canceled) return;

      const fileUri = result.assets[0].uri;

      Alert.alert(
        'Import data',
        'This will replace all current data with the imported file. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Import',
            style: 'destructive',
            onPress: async () => {
              setBusy(true);
              try {
                await importFromFile(fileUri);
                await initialize(); // reload store's in-memory state from the freshly saved file
                Alert.alert('Import complete', 'Your data has been restored.');
              } catch (error) {
                console.error('[settings] Import failed:', error);
                Alert.alert('Import failed', 'That file could not be read as valid TaskTracker data.');
              } finally {
                setBusy(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('[settings] Document picker failed:', error);
    }
  };

  const handleWipe = () => {
    Alert.alert(
      'Wipe all data',
      'This deletes every topic, task, session, and note. This cannot be undone — consider exporting first.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Wipe Everything', style: 'destructive', onPress: () => wipeAllData() },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.statsCard}>
        <Text style={styles.statsText}>{topics.length} topics · {tasks.length} tasks</Text>
      </View>

      <Pressable style={styles.actionButton} onPress={handleExport} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionButtonText}>Export Data</Text>}
      </Pressable>

      <Pressable style={styles.actionButton} onPress={handleImport} disabled={busy}>
        <Text style={styles.actionButtonText}>Import Data</Text>
      </Pressable>

      <Pressable style={styles.dangerButton} onPress={handleWipe} disabled={busy}>
        <Text style={styles.dangerButtonText}>Wipe All Data</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  statsCard: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(128,128,128,0.08)',
    marginBottom: 12,
  },
  statsText: { fontSize: 14, opacity: 0.7 },
  actionButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  actionButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  dangerButton: {
    borderWidth: 2,
    borderColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  dangerButtonText: { color: '#EF4444', fontWeight: '700', fontSize: 15 },
});