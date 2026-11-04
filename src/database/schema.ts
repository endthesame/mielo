import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const decks = sqliteTable('decks', {
  id: text('id').primaryKey().notNull(),
  name: text('name').notNull(),
  targetLanguage: text('target_language').notNull(),
  translationLanguage: text('translation_language').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
});

export const vocabularyItems = sqliteTable('vocabulary_items', {
  id: text('id').primaryKey().notNull(),
  deckId: text('deck_id').notNull().references(() => decks.id),
  text: text('text').notNull(),
  translation: text('translation').notNull(),
  reading: text('reading'),
  meaningNote: text('meaning_note'),
  acceptedAnswers: text('accepted_answers', { mode: 'json' }).$type<string[]>().notNull().default([]),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
});
