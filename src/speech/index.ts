import type { SpeechEngine } from './speech-engine';
import { whisperEngine } from './whisper-engine';

// Select the recognition engine used by the application.
export const speechEngine: SpeechEngine = whisperEngine;
export type { SpeechLanguage } from './speech-engine';
export { supportsLiveLanguage } from './capabilities';
