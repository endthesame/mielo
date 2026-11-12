import * as Speech from 'expo-speech';
import type { PronunciationEngine, PronunciationEvents } from './pronunciation-engine';

export class ExpoPronunciationEngine implements PronunciationEngine {
  private generation = 0;

  async speak(text: string, language: string, events: PronunciationEvents): Promise<void> {
    const request = ++this.generation;
    await Speech.stop();
    if (request !== this.generation) return;
    const voices = await Speech.getAvailableVoicesAsync();
    if (request !== this.generation) return;

    // Decks use ISO language codes; system voices usually use BCP 47 (for example, ja-JP).
    const code = language.toLowerCase();
    const voice = voices.find((item) => item.language.toLowerCase() === code)
      ?? voices.find((item) => item.language.toLowerCase().split('-')[0] === code);
    if (!voice) throw new Error('No voice available for this language');

    Speech.speak(text, {
      language: voice.language,
      voice: voice.identifier,
      onStart: () => { if (request === this.generation) events.onStart(); },
      onDone: () => { if (request === this.generation) events.onDone(); },
      onStopped: () => { if (request === this.generation) events.onDone(); },
      onError: () => { if (request === this.generation) events.onError(); },
    });
  }

  async stop(): Promise<void> {
    this.generation++;
    await Speech.stop();
  }
}
