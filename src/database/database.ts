import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import { Directory, File, Paths } from 'expo-file-system';

const DATABASE_VERSION = 7;

async function migrate(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA foreign_keys = ON');
  await db.withExclusiveTransactionAsync(async (transaction) => {
    const row = await transaction.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
    const version = row?.user_version ?? 0;
    if (version > DATABASE_VERSION) {
      throw new Error('База создана более новой версией приложения.');
    }
    if (version === 0) {
      await transaction.execAsync(`
        CREATE TABLE decks (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL CHECK (length(trim(name)) > 0),
          target_language TEXT NOT NULL CHECK (length(trim(target_language)) > 0),
          translation_language TEXT NOT NULL CHECK (length(trim(translation_language)) > 0),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          deleted_at TEXT
        );
        PRAGMA user_version = 1;
      `);
    }
    if (version < 2) {
      await transaction.execAsync(`
        CREATE TABLE vocabulary_items (
          id TEXT PRIMARY KEY NOT NULL,
          deck_id TEXT NOT NULL REFERENCES decks(id),
          text TEXT NOT NULL CHECK (length(trim(text)) > 0),
          translation TEXT NOT NULL CHECK (length(trim(translation)) > 0),
          reading TEXT,
          meaning_note TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          deleted_at TEXT
        );
        CREATE INDEX vocabulary_deck_idx ON vocabulary_items(deck_id, deleted_at);
        CREATE TABLE learning_cards (
          id TEXT PRIMARY KEY NOT NULL,
          vocabulary_id TEXT NOT NULL REFERENCES vocabulary_items(id),
          exercise_type TEXT NOT NULL,
          cue_mode TEXT NOT NULL,
          enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
          created_at TEXT NOT NULL,
          deleted_at TEXT
        );
        CREATE UNIQUE INDEX active_card_per_word ON learning_cards(vocabulary_id, exercise_type) WHERE deleted_at IS NULL;
        CREATE TABLE review_states (
          card_id TEXT PRIMARY KEY NOT NULL REFERENCES learning_cards(id),
          fsrs_version TEXT NOT NULL,
          state_json TEXT NOT NULL,
          due_at TEXT NOT NULL
        );
        PRAGMA user_version = 2;
      `);
    }
    if (version < 3) {
      await transaction.execAsync(`
        CREATE TABLE review_logs (
          id TEXT PRIMARY KEY NOT NULL,
          card_id TEXT NOT NULL REFERENCES learning_cards(id),
          rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 4),
          reviewed_at TEXT NOT NULL,
          fsrs_version TEXT NOT NULL,
          parameters_json TEXT NOT NULL,
          before_json TEXT NOT NULL,
          after_json TEXT NOT NULL,
          log_json TEXT NOT NULL
        );
        CREATE INDEX review_logs_card_idx ON review_logs(card_id, reviewed_at);
        CREATE INDEX review_states_due_idx ON review_states(due_at);
        PRAGMA user_version = 3;
      `);
    }
    if (version < 4) {
      await transaction.execAsync(`
        CREATE TABLE examples (
          id TEXT PRIMARY KEY NOT NULL,
          vocabulary_id TEXT NOT NULL REFERENCES vocabulary_items(id),
          text TEXT NOT NULL CHECK (length(trim(text)) > 0),
          translation TEXT,
          source_type TEXT NOT NULL DEFAULT 'manual',
          source_title TEXT,
          source_url TEXT,
          timestamp_ms INTEGER
        );
        CREATE INDEX examples_vocabulary_idx ON examples(vocabulary_id);
        PRAGMA user_version = 4;
      `);
    }
    if (version < 5) {
      await transaction.execAsync(`
        CREATE TABLE media_assets (
          id TEXT PRIMARY KEY NOT NULL,
          kind TEXT NOT NULL CHECK (kind = 'image'),
          local_uri TEXT NOT NULL UNIQUE,
          mime_type TEXT,
          source_type TEXT NOT NULL DEFAULT 'manual',
          created_at TEXT NOT NULL
        );
        CREATE TABLE vocabulary_media (
          vocabulary_id TEXT NOT NULL REFERENCES vocabulary_items(id),
          media_id TEXT NOT NULL REFERENCES media_assets(id),
          sort_order INTEGER NOT NULL DEFAULT 0,
          PRIMARY KEY (vocabulary_id, media_id)
        );
        CREATE UNIQUE INDEX one_image_per_word ON vocabulary_media(vocabulary_id);
        PRAGMA user_version = 5;
      `);
    }
    if (version < 6) {
      await transaction.execAsync(`
        CREATE TABLE settings (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);
        PRAGMA user_version = 6;
      `);
    }
    if (version < 7) {
      await transaction.execAsync(`
        ALTER TABLE vocabulary_items ADD COLUMN accepted_answers TEXT NOT NULL DEFAULT '[]';
        PRAGMA user_version = 7;
      `);
    }
  });
}

// Удаляем только созданные приложением файлы, не связанные ни с одним объектом БД.
// Это завершает очистку, если приложение было закрыто между изменением БД и файла.
async function removeUnreferencedImages(db: SQLiteDatabase): Promise<void> {
  const directory = new Directory(Paths.document, 'media', 'images');
  if (!directory.exists) return;
  const rows = await db.getAllAsync<{ local_uri: string }>('SELECT local_uri FROM media_assets');
  const referenced = new Set(rows.map((row) => row.local_uri));
  for (const entry of directory.list()) {
    if (entry instanceof File && /^[a-f0-9-]{36}\.(jpg|png|webp|heic)$/i.test(entry.name) && !referenced.has(entry.name)) {
      try { entry.delete(); } catch (error) { console.warn('Не удалось очистить изображение:', error); }
    }
  }
}

let databasePromise: Promise<SQLiteDatabase> | undefined;

export function getDatabase(): Promise<SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = (async () => {
      const db = await openDatabaseAsync('mielo.db');
      try {
        await migrate(db);
        try { await removeUnreferencedImages(db); }
        catch (error) { console.warn('Не удалось очистить неиспользуемые изображения:', error); }
        return db;
      } catch (error) {
        await db.closeAsync();
        throw error;
      }
    })().catch((error) => {
      databasePromise = undefined;
      throw error;
    });
  }
  return databasePromise;
}
