const test = require('node:test');
const assert = require('node:assert/strict');
const { createModelIntegrity } = require('../src/speech/model-integrity.ts');

function fakeFile() {
  return { uri: 'model', exists: true, size: 75, modificationTime: 1, hash: 'valid', calls: 0,
    async digest() { this.calls++; return this.hash; } };
}

test('проверка повторяется при изменении, удалении и отсутствии времени изменения', async () => {
  const integrity = createModelIntegrity(75, 'valid');
  const file = fakeFile();
  assert.equal(await integrity.verify(file), true);
  assert.equal(await integrity.verify(file), true);
  assert.equal(file.calls, 1);
  file.modificationTime = 2;
  file.hash = 'invalid';
  assert.equal(await integrity.verify(file), false);
  file.hash = 'valid';
  assert.equal(await integrity.verify(file), true);
  file.size = 74;
  assert.equal(await integrity.verify(file), false);
  file.size = 75; file.modificationTime = null;
  assert.equal(await integrity.verify(file), true);
  assert.equal(await integrity.verify(file), true);
  assert.equal(file.calls, 5);
});

test('удаление во время проверки не подтверждает устаревший результат', async () => {
  const integrity = createModelIntegrity(75, 'valid');
  const file = fakeFile();
  let complete;
  file.digest = () => new Promise((resolve) => { complete = resolve; });
  const pending = integrity.verify(file);
  integrity.clear();
  complete('valid');
  assert.equal(await pending, false);
});

test('проверенный файл после переноса сохраняет кэш только при совпадении метаданных', async () => {
  const integrity = createModelIntegrity(75, 'valid');
  const temp = fakeFile(); temp.uri = 'temp';
  assert.equal(await integrity.verify(temp), true);
  const saved = fakeFile();
  integrity.moved(integrity.fingerprint(temp), saved);
  assert.equal(await integrity.verify(saved), true);
  assert.equal(saved.calls, 0);
  saved.modificationTime = 3;
  assert.equal(await integrity.verify(saved), true);
  assert.equal(saved.calls, 1);
});
