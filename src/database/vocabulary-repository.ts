import { randomUUID } from 'expo-crypto';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { createEmptyCard } from 'ts-fsrs';
import type { NewVocabularyItem, UpdateVocabularyItem, VocabularyItem, VocabularyRepository } from '../vocabulary/vocabulary';
import { getDatabase } from './database';
import { decks, vocabularyItems } from './schema';
import { deleteImageFiles } from '../media/media-store';
import { insertImportBatch } from './import-batch';

export const vocabularyRepository: VocabularyRepository = {
  async importBatch(deckId, rows) {
    const db = await getDatabase();
    let result = { added: 0, skipped: 0 };
    await db.withExclusiveTransactionAsync(async (tx) => { result = await insertImportBatch(tx, deckId, rows, randomUUID, new Date()); });
    return result;
  },
  async listByDeck(deckId) {
    const db = drizzle(await getDatabase());
    const rows = await db.select().from(vocabularyItems)
      .where(and(eq(vocabularyItems.deckId, deckId), isNull(vocabularyItems.deletedAt)))
      .orderBy(asc(vocabularyItems.createdAt), asc(vocabularyItems.id));
    return rows.map(({ deletedAt: _deletedAt, ...item }) => item);
  },

  async create(input: NewVocabularyItem): Promise<VocabularyItem> {
    const text = input.text.trim();
    const translation = input.translation.trim();
    if (!text || !translation || !input.deckId) throw new Error('Укажите слово и перевод.');

    const now = new Date();
    const timestamp = now.toISOString();
    const item: VocabularyItem = {
      id: randomUUID(), deckId: input.deckId, text, translation,
      reading: input.reading?.trim() || null, meaningNote: input.meaningNote?.trim() || null,
      acceptedAnswers: input.acceptedAnswers?.map((value) => value.trim()).filter(Boolean) ?? [],
      createdAt: timestamp, updatedAt: timestamp,
    };
    const cardId = randomUUID();
    const fsrsCard = createEmptyCard(now);
    const sqlite = await getDatabase();
    await sqlite.withExclusiveTransactionAsync(async (tx) => {
      const db = drizzle(tx);
      const deck = await db.select({ id: decks.id }).from(decks)
        .where(and(eq(decks.id, input.deckId), isNull(decks.deletedAt))).get();
      if (!deck) throw new Error('Колода не найдена.');
      await db.insert(vocabularyItems).values(item);
      await tx.runAsync(
        'INSERT INTO learning_cards (id, vocabulary_id, exercise_type, cue_mode, enabled, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        cardId, item.id, 'cue_to_speech', 'image_or_translation', 1, timestamp,
      );
      await tx.runAsync(
        'INSERT INTO review_states (card_id, fsrs_version, state_json, due_at) VALUES (?, ?, ?, ?)',
        cardId, 'ts-fsrs@5.4.2', JSON.stringify(fsrsCard), fsrsCard.due.toISOString(),
      );
    });
    return item;
  },

  async update(id: string, input: UpdateVocabularyItem): Promise<VocabularyItem> {
    const text = input.text.trim();
    const translation = input.translation.trim();
    if (!text || !translation) throw new Error('Укажите слово и перевод.');
    const db = drizzle(await getDatabase());
    const rows = await db.update(vocabularyItems).set({
      text, translation, reading: input.reading?.trim() || null,
      acceptedAnswers: input.acceptedAnswers?.map((value) => value.trim()).filter(Boolean) ?? [],
      meaningNote: input.meaningNote?.trim() || null, updatedAt: new Date().toISOString(),
    }).where(and(eq(vocabularyItems.id, id), isNull(vocabularyItems.deletedAt))).returning();
    if (!rows[0]) throw new Error('Слово не найдено.');
    const { deletedAt: _deletedAt, ...item } = rows[0];
    return item;
  },

  async remove(id: string): Promise<void> {
    const now = new Date().toISOString();
    const db = await getDatabase();
    let files: string[] = [];
    await db.withExclusiveTransactionAsync(async (tx) => {
      const result = await tx.runAsync(
        'UPDATE vocabulary_items SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL', now, now, id,
      );
      if (result.changes !== 1) throw new Error('Слово не найдено.');
      await tx.runAsync('UPDATE learning_cards SET deleted_at = ?, enabled = 0 WHERE vocabulary_id = ? AND deleted_at IS NULL', now, id);
      const media = await tx.getAllAsync<{ id: string; local_uri: string }>('SELECT m.id, m.local_uri FROM media_assets m JOIN vocabulary_media vm ON vm.media_id = m.id WHERE vm.vocabulary_id = ?', id);
      files = media.map((item) => item.local_uri);
      await tx.runAsync('DELETE FROM vocabulary_media WHERE vocabulary_id = ?', id);
      for (const item of media) await tx.runAsync('DELETE FROM media_assets WHERE id = ?', item.id);
      await tx.runAsync('DELETE FROM examples WHERE vocabulary_id = ?', id);
    });
    deleteImageFiles(files);
  },
};
