const { test } = require('node:test');
const assert = require('node:assert/strict');
const { initialReviewFlow, reviewFlowReducer } = require('../src/review/review-flow.ts');

test('оба варианта самооценки показывают ответ без выбора оценки FSRS', () => {
  for (const choice of ['remembered', 'not-remembered']) {
    const result = reviewFlowReducer(initialReviewFlow, { type: 'self-assessment', choice });
    assert.equal(result.revealed, true);
    assert.equal(result.recall, choice);
    assert.equal(result.automaticMatch, null);
    assert.equal('rating' in result, false);
  }
});

test('запоздавшее голосовое совпадение не меняет решение пользователя', () => {
  const result = reviewFlowReducer(initialReviewFlow, { type: 'self-assessment', choice: 'not-remembered' });
  assert.deepEqual(reviewFlowReducer(result, { type: 'speech-match', kind: 'exact' }), result);
});

test('повтор ответа сбрасывает состояние карточки', () => {
  const revealed = reviewFlowReducer(initialReviewFlow, { type: 'self-assessment', choice: 'remembered' });
  assert.deepEqual(reviewFlowReducer(revealed, { type: 'reset' }), initialReviewFlow);
});
