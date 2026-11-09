import { File, Paths } from 'expo-file-system';
import { initWhisper } from 'whisper.rn/index';
import type { SpeechEngine, SpeechLanguage } from './speech-engine';
import { LiveTranscriber } from './live-transcriber';
import { whisperTinyMultilingual } from './whisper-models';
import { createModelIntegrity } from './model-integrity';

const MODEL_URL = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/5359861c739e955e79d9a303bcbc70fb988958b1/ggml-tiny.bin';
const MODEL_SHA256 = 'be07e048e1e599ad46341c8d2a135645097a538221678b7acdd1b1919c6e1b21';
const MODEL_SIZE = 77691713;
const integrity = createModelIntegrity(MODEL_SIZE, MODEL_SHA256);

function whisperLanguage(language: SpeechLanguage): string {
  if (!whisperTinyMultilingual.supportedLanguages.includes(language)) {
    throw new Error('Текущая модель не поддерживает этот язык.');
  }
  return language === 'jv' ? 'jw' : language;
}

async function getModel(onStatus: (message: string) => void): Promise<File> {
  const model = new File(Paths.document, 'ggml-tiny.bin');
  const temporary = new File(Paths.cache, 'ggml-tiny-download.bin');

  onStatus('Проверяем модель…');
  if (await integrity.verify(model)) return model;
  integrity.clear();
  if (model.exists) model.delete();
  if (temporary.exists) temporary.delete();

  let moved = false;
  try {
    onStatus('Загружаем модель (около 75 МБ). Это может занять несколько минут…');
    try {
      await File.downloadFileAsync(MODEL_URL, temporary, {
        onProgress: ({ bytesWritten, totalBytes }) => {
          if (totalBytes > 0) onStatus(`Загрузка модели: ${Math.min(100, Math.round(bytesWritten / totalBytes * 100))}%`);
        },
      });
    } catch (error) {
      console.error('Model download failed:', error);
      throw new Error('Не удалось скачать модель. Проверьте доступ к интернету в симуляторе и повторите попытку.');
    }
    onStatus('Проверяем целостность модели…');
    if (!(await integrity.verify(temporary))) throw new Error('Модель скачана с ошибкой. Попробуйте ещё раз.');
    const verifiedTemporary = integrity.fingerprint(temporary);
    temporary.move(model);
    integrity.moved(verifiedTemporary, model);
    moved = true;
    return model;
  } finally {
    if (!moved && temporary.exists) temporary.delete();
  }
}

export async function prepareWhisperModel(onStatus: (message: string) => void): Promise<void> {
  await getModel(onStatus);
}

export function isWhisperModelDownloaded(): boolean {
  const model = new File(Paths.document, 'ggml-tiny.bin');
  return model.exists && model.size === MODEL_SIZE;
}

export function deleteWhisperModel(): void {
  integrity.clear();
  const model = new File(Paths.document, 'ggml-tiny.bin');
  if (model.exists) model.delete();
}

async function transcribeRecording(
  audioUri: string,
  language: SpeechLanguage,
  onStatus: (message: string) => void,
): Promise<string> {
  const modelLanguage = whisperLanguage(language);
  const model = await getModel(onStatus);
  onStatus('Загружаем модель в память…');
  let context;
  try {
    context = await initWhisper({ filePath: model.uri, useGpu: false });
  } catch (error) {
    console.error('Model initialization failed:', error);
    throw new Error('Не удалось запустить модель распознавания.');
  }
  try {
    onStatus('Распознаём запись…');
    const { result } = await context.transcribe(audioUri, { language: modelLanguage, translate: false }).promise.catch((error) => {
      console.error('Transcription failed:', error);
      throw new Error('Не удалось распознать запись. Попробуйте записать слово ещё раз.');
    });
    return result.trim();
  } finally {
    await context.release();
  }
}

export const whisperEngine: SpeechEngine = {
  getCapabilities: () => ({ supportedLanguages: whisperTinyMultilingual.supportedLanguages, liveTranscription: true }),
  transcribe: transcribeRecording,
  async startLive(language, onText, onError, onStatus) {
    const modelLanguage = whisperLanguage(language);
    const model = await getModel(onStatus);
    onStatus('Загружаем модель в память…');
    const context = await initWhisper({ filePath: model.uri, useGpu: false });
    const transcriber = new LiveTranscriber(async (audio) => {
      const { result } = await context.transcribeData(audio, { language: modelLanguage, translate: false }).promise;
      return result;
    }, onText, onError);
    let closing: Promise<void> | null = null;
    return {
      pushAudio: (audio) => transcriber.pushAudio(audio),
      close: () => {
        if (!closing) closing = (async () => { try { await transcriber.close(); } finally { await context.release(); } })();
        return closing;
      },
    };
  },
};
