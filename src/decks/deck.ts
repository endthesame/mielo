export type Deck = {
  id: string;
  name: string;
  targetLanguage: string;
  translationLanguage: string;
  createdAt: string;
  updatedAt: string;
};

export type NewDeck = {
  name: string;
  targetLanguage: string;
  translationLanguage: string;
};

export interface DeckRepository {
  getById(id: string): Promise<Deck | null>;
  list(): Promise<Deck[]>;
  create(input: NewDeck): Promise<Deck>;
  rename(id: string, name: string): Promise<Deck>;
  remove(id: string): Promise<void>;
  countDue(id: string, now: Date): Promise<number>;
  countWords(id: string): Promise<number>;
}
