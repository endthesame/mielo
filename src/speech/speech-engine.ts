// Application language codes are independent of the recognition engine.
export type SpeechLanguage = string;

export type SpeechCapabilities = {
  supportedLanguages: readonly SpeechLanguage[];
  liveTranscription: boolean;
};

export interface LiveSpeechSession {
  pushAudio(data: ArrayBuffer): void;
  close(): Promise<void>;
}

export interface SpeechEngine {
  getCapabilities(): SpeechCapabilities;
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
