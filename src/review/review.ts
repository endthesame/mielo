import type { Grade } from 'ts-fsrs';

export type DueCard = {
  cardId: string;
  text: string;
  translation: string;
  reading: string | null;
  stateJson: string;
  imageName: string | null;
  acceptedAnswers: string;
};

export interface ReviewRepository {
  getDueCards(deckId: string, now: Date): Promise<DueCard[]>;
  submitReview(card: DueCard, rating: Grade, now: Date): Promise<void>;
}
