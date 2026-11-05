import { randomUUID } from 'expo-crypto';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import type { Deck, DeckRepository, NewDeck } from '../decks/deck';
import { getDatabase } from './database';
import { decks } from './schema';
import { deleteImageFiles } from '../media/media-store';

export const deckRepository: DeckRepository = {
  async countWords(id) {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ count: number }>(`SELECT count(*) AS count FROM vocabulary_items v
      JOIN decks d ON d.id = v.deck_id WHERE d.id = ? AND d.deleted_at IS NULL AND v.deleted_at IS NULL`, id);
    return row?.count ?? 0;
  },
  async countDue(id, now) {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ count: number }>(`SELECT count(*) AS count FROM learning_cards c
      JOIN vocabulary_items v ON v.id = c.vocabulary_id JOIN review_states s ON s.card_id = c.id
      JOIN decks d ON d.id = v.deck_id WHERE d.id = ? AND d.deleted_at IS NULL AND v.deleted_at IS NULL
      AND c.deleted_at IS NULL AND c.enabled = 1 AND c.exercise_type = 'cue_to_speech' AND s.due_at <= ?`, id, now.toISOString());
    return row?.count ?? 0;
  },
  async list(): Promise<Deck[]> {
    const db = drizzle(await getDatabase());
    const rows = await db.select().from(decks).where(isNull(decks.deletedAt)).orderBy(asc(decks.createdAt));
    return rows.map(({ deletedAt: _deletedAt, ...deck }) => deck);
  },

  async create(input: NewDeck): Promise<Deck> {
    const name = input.name.trim();
    const targetLanguage = input.targetLanguage.trim();
    const translationLanguage = input.translationLanguage.trim();
    if (!name || !targetLanguage || !translationLanguage) {
      throw new Error('Укажите название и языки колоды.');
    }
    const now = new Date().toISOString();
    const deck: Deck = { id: randomUUID(), name, targetLanguage, translationLanguage, createdAt: now, updatedAt: now };
    const db = drizzle(await getDatabase());
    await db.insert(decks).values(deck);
    return deck;
  },
  async rename(id, name) {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Введите название колоды.');
    const db = drizzle(await getDatabase());
    const rows = await db.update(decks).set({ name: trimmed, updatedAt: new Date().toISOString() })
      .where(and(eq(decks.id, id), isNull(decks.deletedAt))).returning();
    if (!rows[0]) throw new Error('Колода не найдена.');
    const { deletedAt: _deletedAt, ...deck } = rows[0];
    return deck;
  },
  async remove(id) {
    const now = new Date().toISOString();
    const db = await getDatabase();
    let files: string[] = [];
    await db.withExclusiveTransactionAsync(async (tx) => {
      const result = await tx.runAsync('UPDATE decks SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL', now, now, id);
      if (result.changes !== 1) throw new Error('Колода не найдена.');
      await tx.runAsync('UPDATE learning_cards SET deleted_at = ?, enabled = 0 WHERE deleted_at IS NULL AND vocabulary_id IN (SELECT id FROM vocabulary_items WHERE deck_id = ? AND deleted_at IS NULL)', now, id);
      await tx.runAsync('UPDATE vocabulary_items SET deleted_at = ?, updated_at = ? WHERE deck_id = ? AND deleted_at IS NULL', now, now, id);
      const media = await tx.getAllAsync<{ id: string; local_uri: string }>(`SELECT m.id, m.local_uri FROM media_assets m
        JOIN vocabulary_media vm ON vm.media_id = m.id JOIN vocabulary_items v ON v.id = vm.vocabulary_id WHERE v.deck_id = ?`, id);
      files = media.map((item) => item.local_uri);
      await tx.runAsync('DELETE FROM vocabulary_media WHERE vocabulary_id IN (SELECT id FROM vocabulary_items WHERE deck_id = ?)', id);
      for (const item of media) await tx.runAsync('DELETE FROM media_assets WHERE id = ?', item.id);
      await tx.runAsync('DELETE FROM examples WHERE vocabulary_id IN (SELECT id FROM vocabulary_items WHERE deck_id = ?)', id);
    });
    deleteImageFiles(files);
  },
};
