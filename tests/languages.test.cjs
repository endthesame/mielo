const test = require('node:test');
const assert = require('node:assert/strict');
const { languages, languageName, normalizeLanguageCode } = require('../src/languages/languages.ts');
const { supportsLiveLanguage } = require('../src/speech/capabilities.ts');
const { whisperTinyMultilingual } = require('../src/speech/whisper-models.ts');

test('языки приложения не ограничиваются моделью и сохраняют стабильные коды', () => {
  assert.ok(languages.some(({ code }) => code === 'ko'));
  assert.ok(languages.some(({ code }) => code === 'ja'));
  assert.ok(languages.some(({ code }) => code === 'eo'));
  assert.equal(languageName('ko'), 'корейский');
  assert.equal(languageName('sco'), 'sco');
  assert.equal(normalizeLanguageCode(' SCO '), 'sco');
  assert.equal(normalizeLanguageCode('no!'), null);
  assert.equal(normalizeLanguageCode('abcd'), null);
});

test('доступность голосового режима определяется возможностями выбранного движка', () => {
  const tiny = { supportedLanguages: whisperTinyMultilingual.supportedLanguages, liveTranscription: true };
  assert.equal(supportsLiveLanguage(tiny, 'ko'), true);
  assert.equal(supportsLiveLanguage(tiny, 'en'), true);
  assert.equal(supportsLiveLanguage(tiny, 'jv'), true);
  assert.equal(supportsLiveLanguage(tiny, 'eo'), false);
  assert.equal(supportsLiveLanguage(tiny, 'yue'), false);
  assert.equal(supportsLiveLanguage({ supportedLanguages: ['eo'], liveTranscription: true }, 'eo'), true);
  assert.equal(supportsLiveLanguage({ supportedLanguages: ['eo'], liveTranscription: false }, 'eo'), false);
});
