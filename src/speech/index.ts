import type { SpeechEngine } from './speech-engine';
import { whisperEngine } from './whisper-engine';

// Здесь выбираем движок, который использует приложение.
export const speechEngine: SpeechEngine = whisperEngine;
export type { SpeechLanguage } from './speech-engine';
