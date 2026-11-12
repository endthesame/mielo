export type PronunciationEvents = {
  onStart: () => void;
  onDone: () => void;
  onError: () => void;
};

// Синтез речи отделён от распознавания и от конкретного поставщика голоса.
export interface PronunciationEngine {
  speak(text: string, language: string, events: PronunciationEvents): Promise<void>;
  stop(): Promise<void>;
}
