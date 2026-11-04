const { test } = require('node:test');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const { readFileSync } = require('node:fs');
const { parseImport, MAX_IMPORT_BYTES } = require('../src/vocabulary/import/parse-import.ts');
const { insertImportBatch } = require('../src/database/import-batch.ts');

function makeDb() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  const source = readFileSync('src/database/database.ts', 'utf8');
  for (const match of source.matchAll(/await transaction\.execAsync\(`([\s\S]*?)`\);/g)) db.exec(match[1]);
  db.prepare('INSERT INTO decks VALUES (?, ?, ?, ?, ?, ?, ?)').run('d', 'Колода', 'ko', 'ru', 't', 't', null);
  return db;
}
function adapter(db, failOnCard = false) {
  let cardCount = 0;
  return {
    getFirstAsync: async (sql, ...params) => db.prepare(sql).get(...params) ?? null,
    getAllAsync: async (sql, ...params) => db.prepare(sql).all(...params),
    prepareAsync: async (sql) => {
      const statement = db.prepare(sql);
      return { executeAsync: async (...params) => {
        if (sql.includes('INSERT INTO learning_cards') && ++cardCount === failOnCard) throw new Error('ошибка записи карточки');
        return statement.run(...params);
      }, finalizeAsync: async () => {} };
    },
  };
}
function ids() { let n = 0; return () => `id-${++n}`; }
const now = new Date('2026-01-01T00:00:00.000Z');

test('CSV с BOM, кавычками, разделителем и переносами в полях', () => {
  const data = '\uFEFF"사과";"яблоко; фрукт";;"строка 1\nстрока 2"\r\n猫;кошка;ねこ;"он сказал ""да"""';
  const preview = parseImport(data, ';', []);
  assert.equal(preview.errors.length, 0);
  assert.equal(preview.rows[0].translation, 'яблоко; фрукт');
  assert.equal(preview.rows[0].meaningNote, 'строка 1\nстрока 2');
  assert.equal(preview.rows[1].line, 3);
  assert.equal(preview.rows[1].meaningNote, 'он сказал "да"');
});

test('разделители, ошибки, пустые строки и дубликаты с нормализацией', () => {
  const result = parseImport('ＣＡＴ,кот\ncat,кошка\n\nDOG,собака\nбез перевода,\nслишком,много,полей,ещё,одно', ',', ['dog']);
  assert.equal(result.totalRows, 5);
  assert.equal(result.rows.length, 1);
  assert.equal(result.duplicateCount, 2);
  assert.deepEqual(result.duplicates.map((item) => item.line), [2, 4]);
  assert.deepEqual(result.errors.map((error) => error.line), [5, 6]);
  assert.equal(parseImport('猫\tкошка\tねこ', '\t', []).rows[0].reading, 'ねこ');
  assert.equal(parseImport('a;b\n"bad;text', ';', []).errors[0].line, 2);
});

test('ограничения по размеру и числу записей', () => {
  assert.equal(parseImport(Array(5000).fill('a;b').join('\n'), ';', []).totalRows, 5000);
  assert.throws(() => parseImport(Array(5001).fill('a;b').join('\n'), ';', []), /5000/);
  assert.throws(() => parseImport('x'.repeat(MAX_IMPORT_BYTES + 1), ';', []), /5 МиБ/);
  assert.throws(() => parseImport('\n\n', ';', []), /Нет данных/);
  assert.throws(() => parseImport('a\0;b\0', ';', []), /UTF-8/);
});

test('импорт создаёт карточки и состояния и повторно проверяет дубликаты', async () => {
  const db = makeDb();
  const rows = parseImport('사과;яблоко\n猫;кошка;ねこ', ';', []).rows;
  const tx = adapter(db); const generate = ids();
  db.exec('BEGIN');
  assert.deepEqual(await insertImportBatch(tx, 'd', rows, generate, now), { added: 2, skipped: 0 });
  db.exec('COMMIT');
  db.exec('BEGIN');
  assert.deepEqual(await insertImportBatch(tx, 'd', rows, generate, now), { added: 0, skipped: 2 });
  db.exec('COMMIT');
  assert.equal(db.prepare('SELECT count(*) AS n FROM vocabulary_items').get().n, 2);
  assert.equal(db.prepare('SELECT count(*) AS n FROM learning_cards').get().n, 2);
  assert.equal(db.prepare('SELECT count(*) AS n FROM review_states').get().n, 2);
  assert.equal(db.prepare('SELECT due_at FROM review_states LIMIT 1').get().due_at, now.toISOString());
  db.close();
});

test('ошибка при создании карточки откатывает весь пакет', async () => {
  const db = makeDb();
  db.exec('BEGIN');
  await assert.rejects(insertImportBatch(adapter(db, 2), 'd', parseImport('사과;яблоко\n猫;кошка', ';', []).rows, ids(), now));
  db.exec('ROLLBACK');
  assert.equal(db.prepare('SELECT count(*) AS n FROM vocabulary_items').get().n, 0);
  assert.equal(db.prepare('SELECT count(*) AS n FROM learning_cards').get().n, 0);
  db.close();
});

test('предельный пакет создаёт 5000 слов с карточками и состояниями', async () => {
  const db = makeDb();
  const rows = parseImport(Array.from({ length: 5000 }, (_, i) => `word${i};перевод${i}`).join('\n'), ';', []).rows;
  db.exec('BEGIN');
  const result = await insertImportBatch(adapter(db), 'd', rows, ids(), now);
  db.exec('COMMIT');
  assert.deepEqual(result, { added: 5000, skipped: 0 });
  assert.equal(db.prepare('SELECT count(*) AS n FROM vocabulary_items').get().n, 5000);
  assert.equal(db.prepare('SELECT count(*) AS n FROM learning_cards').get().n, 5000);
  assert.equal(db.prepare('SELECT count(*) AS n FROM review_states').get().n, 5000);
  db.close();
});
