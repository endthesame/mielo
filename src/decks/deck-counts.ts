import type { Deck, DeckRepository } from './deck';

export type DeckCounts = { due: number | null; words: number | null };

// Ошибка одного счётчика не скрывает ни колоды, ни остальные значения.
export async function loadDeckCounts(repository: DeckRepository, decks: Deck[], now: Date): Promise<Record<string, DeckCounts>> {
  const entries = await Promise.all(decks.map(async (deck) => {
    const [due, words] = await Promise.allSettled([
      repository.countDue(deck.id, now),
      repository.countWords(deck.id),
    ]);
    if (due.status === 'rejected') console.error('Failed to load due count:', due.reason);
    if (words.status === 'rejected') console.error('Failed to load word count:', words.reason);
    return [deck.id, {
      due: due.status === 'fulfilled' ? due.value : null,
      words: words.status === 'fulfilled' ? words.value : null,
    }] as const;
  }));
  return Object.fromEntries(entries);
}
