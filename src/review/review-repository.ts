import { randomUUID } from 'expo-crypto';
import type { CardInput, Grade } from 'ts-fsrs';
import { getDatabase } from '../database/database';
import { FSRS_PARAMETERS, FSRS_VERSION, scheduleReview } from './scheduler';

import type { DueCard, ReviewRepository } from './review';

export async function getDueCards(deckId: string, now: Date): Promise<DueCard[]> {
  const db = await getDatabase();
  return db.getAllAsync<DueCard>(`SELECT c.id AS cardId, v.text, v.translation, v.reading, v.accepted_answers AS acceptedAnswers, s.state_json AS stateJson, m.local_uri AS imageName
    FROM learning_cards c JOIN vocabulary_items v ON v.id = c.vocabulary_id
    JOIN decks d ON d.id = v.deck_id JOIN review_states s ON s.card_id = c.id
    LEFT JOIN vocabulary_media vm ON vm.vocabulary_id = v.id LEFT JOIN media_assets m ON m.id = vm.media_id
    WHERE d.id = ? AND d.deleted_at IS NULL AND v.deleted_at IS NULL AND c.deleted_at IS NULL
      AND c.enabled = 1 AND c.exercise_type = 'cue_to_speech' AND s.due_at <= ?
    ORDER BY s.due_at, c.created_at, c.id`, deckId, now.toISOString());
}

export async function submitReview(card: DueCard, rating: Grade, now: Date): Promise<void> {
  const db = await getDatabase();
  const { card: next, log } = scheduleReview(JSON.parse(card.stateJson) as CardInput, rating, now);
  await db.withExclusiveTransactionAsync(async (tx) => {
    const result = await tx.runAsync(`UPDATE review_states SET state_json = ?, due_at = ?, fsrs_version = ?
      WHERE card_id = ? AND state_json = ? AND EXISTS (
        SELECT 1 FROM learning_cards c JOIN vocabulary_items v ON v.id = c.vocabulary_id
        JOIN decks d ON d.id = v.deck_id WHERE c.id = review_states.card_id
        AND c.deleted_at IS NULL AND c.enabled = 1 AND v.deleted_at IS NULL AND d.deleted_at IS NULL
      )`, JSON.stringify(next), next.due.toISOString(), FSRS_VERSION, card.cardId, card.stateJson);
    if (result.changes !== 1) throw new Error('Карточка уже изменена или удалена.');
    await tx.runAsync(`INSERT INTO review_logs
      (id, card_id, rating, reviewed_at, fsrs_version, parameters_json, before_json, after_json, log_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, randomUUID(), card.cardId, rating, now.toISOString(), FSRS_VERSION,
      JSON.stringify(FSRS_PARAMETERS), card.stateJson, JSON.stringify(next), JSON.stringify(log));
  });
}

export const reviewRepository: ReviewRepository = { getDueCards, submitReview };
