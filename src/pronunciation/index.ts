import { ExpoPronunciationEngine } from './expo-pronunciation-engine';
import type { PronunciationEngine } from './pronunciation-engine';

export const pronunciationEngine: PronunciationEngine = new ExpoPronunciationEngine();
