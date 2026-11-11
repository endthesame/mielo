const test = require('node:test');
const assert = require('node:assert/strict');
const { loadDeckCounts } = require('../src/decks/deck-counts.ts');

test('ошибка счётчика одной колоды не скрывает другие значения', async () => {
  const originalError = console.error;
  console.error = () => {};
  try {
    const now = new Date('2026-01-01T00:00:00Z');
    const repository = {
      countDue: async (id, time) => {
        assert.equal(time, now);
        if (id === 'a') throw new Error('Ошибка счётчика');
        return 0;
      },
      countWords: async (id) => {
        if (id === 'b') throw new Error('Ошибка счётчика');
        return 5;
      },
    };
    const result = await loadDeckCounts(repository, [{ id: 'a' }, { id: 'b' }], now);
    assert.deepEqual(result, { a: { due: null, words: 5 }, b: { due: 0, words: null } });
  } finally {
    console.error = originalError;
  }
});
