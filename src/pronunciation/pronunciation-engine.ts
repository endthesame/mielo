export type PronunciationEvents = {
  onStart: () => void;
  onDone: () => void;
  onError: () => void;
};

// Speech synthesis is independent of recognition and the voice provider.
export interface PronunciationEngine {
  speak(text: string, language: string, events: PronunciationEvents): Promise<void>;
  stop(): Promise<void>;
}
