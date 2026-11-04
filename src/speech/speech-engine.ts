export type SpeechLanguage = 'ko' | 'ja';

export interface LiveSpeechSession {
  pushAudio(data: ArrayBuffer): void;
  close(): Promise<void>;
}

export interface SpeechEngine {
  transcribe(
    audioUri: string,
    language: SpeechLanguage,
    onStatus: (message: string) => void,
  ): Promise<string>;
  startLive(
    language: SpeechLanguage,
    onText: (text: string) => void,
    onError: (error: unknown) => void,
    onStatus: (message: string) => void,
  ): Promise<LiveSpeechSession>;
}
