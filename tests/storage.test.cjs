const { test } = require('node:test');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const { readFileSync } = require('node:fs');
const { createEmptyCard, fsrs, generatorParameters, Rating } = require('ts-fsrs');

const source = readFileSync('src/database/database.ts', 'utf8');
const migrations = [...source.matchAll(/await transaction\.execAsync\(`([\s\S]*?)`\);/g)].map((match) => match[1]);
function migratedThrough(version) {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  for (const migration of migrations.slice(0, version)) db.exec(migration);
  return db;
}
test('миграции сохраняют существующие колоды и создают новые таблицы', () => {
  const db = migratedThrough(2);
  db.prepare('INSERT INTO decks VALUES (?, ?, ?, ?, ?, ?, ?)').run('d', 'Японский', 'ja', 'ru', 't', 't', null);
  for (const migration of migrations.slice(2)) db.exec(migration);
  assert.equal(db.prepare('SELECT name FROM decks WHERE id = ?').get('d').name, 'Японский');
  assert.equal(db.prepare('PRAGMA user_version').get().user_version, migrations.length);
  assert.ok(db.prepare("SELECT name FROM sqlite_master WHERE name = 'review_logs'").get());
  db.close();
});
test('неполное создание слова откатывается', () => {
  const db = migratedThrough(migrations.length);
  db.prepare('INSERT INTO decks VALUES (?, ?, ?, ?, ?, ?, ?)').run('d', 'Колода', 'ko', 'ru', 't', 't', null);
  db.exec('BEGIN');
  db.prepare('INSERT INTO vocabulary_items (id, deck_id, text, translation, reading, meaning_note, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run('w', 'd', '사과', 'яблоко', null, null, 't', 't', null);
  db.prepare('INSERT INTO learning_cards VALUES (?, ?, ?, ?, ?, ?, ?)').run('c', 'w', 'cue_to_speech', 'image_or_translation', 1, 't', null);
  assert.throws(() => db.prepare('INSERT INTO review_states VALUES (?, ?, ?, ?)').run('c', null, '{}', 't'));
  db.exec('ROLLBACK');
  assert.equal(db.prepare('SELECT count(*) AS count FROM vocabulary_items').get().count, 0);
  assert.equal(db.prepare('SELECT count(*) AS count FROM learning_cards').get().count, 0);
  db.close();
});
test('Again планируется раньше Good для новой карточки', () => {
  const now = new Date('2026-01-01T00:00:00Z');
  const scheduler = fsrs(generatorParameters({ enable_fuzz: false, enable_short_term: true, learning_steps: ['1m', '10m'], relearning_steps: ['10m'] }));
  const card = createEmptyCard(now);
  assert.ok(scheduler.next(card, now, Rating.Again).card.due < scheduler.next(card, now, Rating.Good).card.due);
});
test('сопоставление ответов учитывает чтение и не угадывает похожие слова', async () => {
  const { matchesAnswer } = await import('../src/review/evaluate-answer.ts');
  assert.equal(matchesAnswer('  たべる。 ', '食べる', 'たべる'), true);
  assert.equal(matchesAnswer('たべない', '食べる', 'たべる'), false);
  assert.equal(matchesAnswer('...', '食べる', 'たべる'), false);
});
test('двойная отправка одного состояния не должна перезаписать повторение', () => {
  const db = migratedThrough(migrations.length);
  db.prepare('INSERT INTO decks VALUES (?, ?, ?, ?, ?, ?, ?)').run('d', 'Колода', 'ko', 'ru', 't', 't', null);
  db.prepare('INSERT INTO vocabulary_items (id, deck_id, text, translation, reading, meaning_note, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run('w', 'd', '사과', 'яблоко', null, null, 't', 't', null);
  db.prepare('INSERT INTO learning_cards VALUES (?, ?, ?, ?, ?, ?, ?)').run('c', 'w', 'cue_to_speech', 'image_or_translation', 1, 't', null);
  db.prepare('INSERT INTO review_states VALUES (?, ?, ?, ?)').run('c', 'v', 'before', 't');
  const update = db.prepare('UPDATE review_states SET state_json = ? WHERE card_id = ? AND state_json = ?');
  assert.equal(update.run('after', 'c', 'before').changes, 1);
  assert.equal(update.run('second', 'c', 'before').changes, 0);
  db.close();
});
