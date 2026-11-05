import type { SpeechCapabilities } from './speech-engine';

export function supportsLiveLanguage(capabilities: SpeechCapabilities, language: string): boolean {
  return capabilities.liveTranscription && capabilities.supportedLanguages.includes(language);
}
