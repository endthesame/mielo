const { test } = require('node:test');
const assert = require('node:assert/strict');
const { matchLiveAnswer } = require('../src/review/live-match.ts');
const { LiveTranscriber } = require('../src/speech/live-transcriber.ts');

const audio = (length, sample) => new Int16Array(length).fill(sample).buffer;
const flush = () => new Promise((resolve) => setImmediate(resolve));

test('точное и ограниченное нечёткое совпадение без совпадения по началу слова', () => {
  assert.equal(matchLiveAnswer('  食べる。 ', ['食べる', 'たべる']), 'exact');
  assert.equal(matchLiveAnswer('たべる', ['食べる', 'たべる']), 'exact');
  assert.equal(matchLiveAnswer('heloo', ['hello']), 'fuzzy');
  assert.equal(matchLiveAnswer('hell', ['hello']), null);
  assert.equal(matchLiveAnswer('사과', ['사과']), 'exact');
  assert.equal(matchLiveAnswer('사가', ['사과']), null);
  assert.equal(matchLiveAnswer('...', ['hello']), null);
});

test('тишина не запускает распознавание и одновременно работает только один запрос', async () => {
  let time = 1000, calls = 0, resolve;
  const results = [];
  const session = new LiveTranscriber(() => { calls++; return new Promise((done) => { resolve = done; }); }, (text) => results.push(text), assert.fail, () => time);
  session.pushAudio(audio(16000, 0));
  assert.equal(calls, 0);
  session.pushAudio(audio(10000, 1000));
  assert.equal(calls, 1);
  time += 1000;
  session.pushAudio(audio(10000, 1000));
  assert.equal(calls, 1);
  resolve(' 안녕 ');
  await flush();
  assert.deepEqual(results, ['안녕']);
  await session.close();
});

test('поздний результат сохраняется после паузы, но не после закрытия', async () => {
  let time = 1000, resolve;
  const results = [];
  const session = new LiveTranscriber(() => new Promise((done) => { resolve = done; }), (text) => results.push(text), assert.fail, () => time);
  session.pushAudio(audio(10000, 1000));
  time += 2000;
  session.pushAudio(audio(1600, 0));
  resolve('猫');
  await flush();
  assert.deepEqual(results, ['猫']);
  time += 1000;
  session.pushAudio(audio(10000, 1000));
  const closing = session.close();
  resolve('犬');
  await closing;
  assert.deepEqual(results, ['猫']);
});

test('результат старого высказывания не применяется к новому', async () => {
  let time = 1000, resolve;
  const results = [];
  const session = new LiveTranscriber(() => new Promise((done) => { resolve = done; }), (text) => results.push(text), assert.fail, () => time);
  session.pushAudio(audio(10000, 1000));
  time += 2000;
  session.pushAudio(audio(1600, 0));
  time += 100;
  session.pushAudio(audio(1600, 1000));
  resolve('старый ответ');
  await flush();
  assert.deepEqual(results, []);
  await session.close();
});
