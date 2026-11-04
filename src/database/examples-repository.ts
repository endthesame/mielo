import { randomUUID } from 'expo-crypto';
import { getDatabase } from './database';

export type Example = { id: string; text: string; translation: string | null };
export const examplesRepository = {
  async list(wordId: string): Promise<Example[]> {
    const db = await getDatabase();
    return db.getAllAsync<Example>('SELECT id, text, translation FROM examples WHERE vocabulary_id = ? ORDER BY rowid', wordId);
  },
  async create(wordId: string, text: string, translation: string): Promise<Example> {
    const value = text.trim();
    if (!value) throw new Error('Введите текст примера.');
    const example = { id: randomUUID(), text: value, translation: translation.trim() || null };
    const db = await getDatabase();
    const result = await db.runAsync(`INSERT INTO examples (id, vocabulary_id, text, translation)
      SELECT ?, id, ?, ? FROM vocabulary_items WHERE id = ? AND deleted_at IS NULL`, example.id, example.text, example.translation, wordId);
    if (result.changes !== 1) throw new Error('Слово не найдено.');
    return example;
  },
  async remove(wordId: string, id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM examples WHERE id = ? AND vocabulary_id = ?', id, wordId);
  },
};
