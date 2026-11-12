import type { ImportRow } from './import/parse-import';

export type VocabularyItem = {
  id: string;
  deckId: string;
  text: string;
  translation: string;
  reading: string | null;
  meaningNote: string | null;
  acceptedAnswers: string[];
  createdAt: string;
  updatedAt: string;
};

export type NewVocabularyItem = Pick<VocabularyItem, 'deckId' | 'text' | 'translation'> & {
  reading?: string;
  meaningNote?: string;
  acceptedAnswers?: string[];
};
export type UpdateVocabularyItem = Omit<NewVocabularyItem, 'deckId'>;

export interface VocabularyRepository {
  listByDeck(deckId: string): Promise<VocabularyItem[]>;
  // The word, card, and initial review state are saved together.
  create(input: NewVocabularyItem): Promise<VocabularyItem>;
  update(id: string, input: UpdateVocabularyItem): Promise<VocabularyItem>;
  remove(id: string): Promise<void>;
  importBatch(deckId: string, rows: ImportRow[]): Promise<{ added: number; skipped: number }>;
}
