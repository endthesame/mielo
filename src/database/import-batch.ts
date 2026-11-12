import type { SQLiteDatabase, SQLiteStatement } from 'expo-sqlite';
import { createEmptyCard } from 'ts-fsrs';
import { importWordKey, MAX_IMPORT_ROWS, type ImportRow } from '../vocabulary/import/parse-import';

// Called inside a transaction. Recheck the deck and duplicates immediately before writing.
export async function insertImportBatch(tx: SQLiteDatabase, deckId: string, rows: ImportRow[], createId: () => string, now: Date): Promise<{ added: number; skipped: number }> {
  if (!deckId || rows.length === 0 || rows.length > MAX_IMPORT_ROWS) throw new Error('Недопустимое количество записей.');
  const deck = await tx.getFirstAsync<{ id: string }>('SELECT id FROM decks WHERE id = ? AND deleted_at IS NULL', deckId);
  if (!deck) throw new Error('Колода не найдена.');
  const existing = await tx.getAllAsync<{ text: string }>('SELECT text FROM vocabulary_items WHERE deck_id = ? AND deleted_at IS NULL', deckId);
  const seen = new Set(existing.map((item) => importWordKey(item.text)));
  const statements: SQLiteStatement[] = [];
  let added = 0, skipped = 0;
  try {
    const wordStatement = await tx.prepareAsync(`INSERT INTO vocabulary_items
      (id, deck_id, text, translation, reading, meaning_note, accepted_answers, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    statements.push(wordStatement);
    const cardStatement = await tx.prepareAsync(`INSERT INTO learning_cards
      (id, vocabulary_id, exercise_type, cue_mode, enabled, created_at) VALUES (?, ?, ?, ?, ?, ?)`);
    statements.push(cardStatement);
    const stateStatement = await tx.prepareAsync('INSERT INTO review_states (card_id, fsrs_version, state_json, due_at) VALUES (?, ?, ?, ?)');
    statements.push(stateStatement);
    const timestamp = now.toISOString();
    const state = JSON.stringify(createEmptyCard(now));
    for (const row of rows) {
      const text = row.text.trim(), translation = row.translation.trim();
      if (!text || !translation) throw new Error(`Строка ${row.line}: слово и перевод обязательны.`);
      const key = importWordKey(text);
      if (seen.has(key)) { skipped++; continue; }
      seen.add(key);
      const wordId = createId(), cardId = createId();
      await wordStatement.executeAsync(wordId, deckId, text, translation, row.reading.trim() || null, row.meaningNote.trim() || null, '[]', timestamp, timestamp);
      await cardStatement.executeAsync(cardId, wordId, 'cue_to_speech', 'image_or_translation', 1, timestamp);
      await stateStatement.executeAsync(cardId, 'ts-fsrs@5.4.2', state, timestamp);
      added++;
    }
  } finally {
    for (const statement of statements.reverse()) await statement.finalizeAsync();
  }
  return { added, skipped };
}
