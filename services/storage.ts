import { AppData, Note, NoteItem } from '@/types';
import * as Crypto from 'expo-crypto';
import { File, Paths } from 'expo-file-system';

const CURRENT_SCHEMA_VERSION = 2;

function getDataFile(): File {
  return new File(Paths.document, 'taskTrackerData.json');
}

function getEmptyData(): AppData {
  return {
    version: CURRENT_SCHEMA_VERSION,
    topics: [],
    tasks: [],
    sessions: [],
    notes: [],
    activeTimer: null,
  };
}

/**
 * v1 -> v2: notes were a single free-text `content` string; they are now a
 * `items: NoteItem[]` checklist. Each old note becomes a checklist whose
 * first (and only) item is the original text, unchecked. Notes already in
 * the new shape pass through untouched, so this is safe to run on every
 * load — no separate "has it migrated yet" flag needed.
 */
function migrateNotes(rawNotes: any[]): Note[] {
  if (!Array.isArray(rawNotes)) return [];

  return rawNotes.map((note) => {
    if (Array.isArray(note.items)) return note as Note;

    const text = typeof note.content === 'string' ? note.content.trim() : '';
    const items: NoteItem[] = text
      ? [{ id: Crypto.randomUUID(), text, done: false }]
      : [];

    return {
      id: note.id,
      taskId: note.taskId,
      items,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    };
  });
}

export async function loadData(): Promise<AppData> {
  try {
    const dataFile = getDataFile();

    if (!dataFile.exists) {
      const emptyData = getEmptyData();
      await saveData(emptyData);
      return emptyData;
    }

    const raw = dataFile.textSync();
    const parsed: any = JSON.parse(raw);

    const migrated: AppData = {
      version: CURRENT_SCHEMA_VERSION,
      topics: Array.isArray(parsed.topics) ? parsed.topics : [],
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      notes: migrateNotes(parsed.notes),
      activeTimer: parsed.activeTimer ?? null,
    };

    // Persist the migrated shape once, so the on-disk file stops being v1
    if (parsed.version !== CURRENT_SCHEMA_VERSION) {
      await saveData(migrated);
    }

    return migrated;
  } catch (error) {
    console.error('[storage] Failed to load data, falling back to empty state:', error);
    return getEmptyData();
  }
}

export async function saveData(data: AppData): Promise<void> {
  try {
    const dataFile = getDataFile();
    if (!dataFile.exists) {
      dataFile.create();
    }
    dataFile.write(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('[storage] Failed to save data:', error);
    throw error;
  }
}

export async function exportData(): Promise<string> {
  const data = await loadData();
  return JSON.stringify(data, null, 2);
}

export async function exportToShareableFile(): Promise<string> {
  const data = await loadData();
  const exportFile = new File(Paths.cache, `taskTracker-export-${Date.now()}.json`);
  if (exportFile.exists) exportFile.delete();
  exportFile.create();
  exportFile.write(JSON.stringify(data, null, 2));
  return exportFile.uri;
}

export async function importData(jsonString: string): Promise<AppData> {
  const parsed: any = JSON.parse(jsonString);

  if (
    !parsed ||
    !Array.isArray(parsed.topics) ||
    !Array.isArray(parsed.tasks) ||
    !Array.isArray(parsed.sessions) ||
    !Array.isArray(parsed.notes)
  ) {
    throw new Error('Invalid data format — missing required fields');
  }

  // Run imported files through the same migration, so an older exported
  // backup can still be imported into the current version
  const migrated: AppData = {
    version: CURRENT_SCHEMA_VERSION,
    topics: parsed.topics,
    tasks: parsed.tasks,
    sessions: parsed.sessions,
    notes: migrateNotes(parsed.notes),
    activeTimer: parsed.activeTimer ?? null,
  };

  await saveData(migrated);
  return migrated;
}

export async function importFromFile(uri: string): Promise<AppData> {
  const pickedFile = new File(uri);
  const raw = await pickedFile.text();
  return importData(raw);
}