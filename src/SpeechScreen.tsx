import { useRef, useState } from 'react';
import {
  RecordingPresets,
  IOSOutputFormat,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioRecorder,
} from 'expo-audio';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { speechEngine, type SpeechLanguage } from './speech';

const recordingOptions = {
  ...RecordingPresets.HIGH_QUALITY,
  extension: '.wav',
  sampleRate: 16000,
  numberOfChannels: 1,
  ios: {
    ...RecordingPresets.HIGH_QUALITY.ios,
    extension: '.wav',
    outputFormat: IOSOutputFormat.LINEARPCM,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
};

export default function SpeechScreen() {
  const recorder = useAudioRecorder(recordingOptions);
  const player = useAudioPlayer();
  const [isRecording, setIsRecording] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [language, setLanguage] = useState<SpeechLanguage>('ko');
  const [transcription, setTranscription] = useState<string | null>(null);
  const [message, setMessage] = useState('Нажмите кнопку и произнесите слово.');
  const actionInProgress = useRef(false);

  async function toggleRecording() {
    if (actionInProgress.current) return;
    actionInProgress.current = true;
    setIsBusy(true);

    try {
      if (isRecording) {
        await recorder.stop();
        setIsRecording(false);
        const uri = recorder.uri;
        setRecordingUri(uri);
        setMessage(uri ? 'Запись готова. Её можно прослушать.' : 'Не удалось сохранить запись.');
        return;
      }

      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setMessage('Нет доступа к микрофону. Разрешите его в настройках устройства.');
        return;
      }

      player.pause();
      setRecordingUri(null);
      setTranscription(null);
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsRecording(true);
      setMessage('Идёт запись. Произнесите слово.');
    } catch {
      setMessage('Не удалось выполнить запись. Попробуйте ещё раз.');
    } finally {
      actionInProgress.current = false;
      setIsBusy(false);
    }
  }

  async function recognizeRecording() {
    if (!recordingUri || actionInProgress.current) return;
    actionInProgress.current = true;
    setIsBusy(true);
    setTranscription(null);
    try {
      const result = await speechEngine.transcribe(recordingUri, language, setMessage);
      setTranscription(result || 'Речь не распознана.');
      setMessage('Распознавание завершено.');
    } catch (error) {
      console.error('Speech recognition failed:', error);
      setMessage(error instanceof Error ? error.message : 'Произошла ошибка распознавания. Попробуйте ещё раз.');
    } finally {
      actionInProgress.current = false;
      setIsBusy(false);
    }
  }

  async function playRecording() {
    if (!recordingUri || actionInProgress.current) return;
    actionInProgress.current = true;
    setIsBusy(true);

    try {
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      player.replace(recordingUri);
      player.play();
    } catch {
      setMessage('Не удалось воспроизвести запись.');
    } finally {
      actionInProgress.current = false;
      setIsBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mielo</Text>
      <Text style={styles.subtitle}>Проверка записи голоса</Text>
      <View style={styles.languages}>
        {(['ko', 'ja'] as const).map((item) => (
          <Pressable key={item} disabled={isBusy || isRecording} onPress={() => { setLanguage(item); setTranscription(null); }}
            accessibilityRole="button" accessibilityState={{ selected: language === item, disabled: isBusy || isRecording }}>
            <Text style={[styles.language, language === item && styles.selectedLanguage]}>
              {item === 'ko' ? 'Корейский' : 'Японский'}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.message} accessibilityLiveRegion="polite">{message}</Text>
      <Pressable style={styles.button} onPress={toggleRecording} disabled={isBusy}>
        <Text style={styles.buttonText}>{isRecording ? 'Остановить запись' : 'Начать запись'}</Text>
      </Pressable>
      {recordingUri && !isRecording && (
        <>
          <Pressable style={styles.secondaryButton} onPress={playRecording} disabled={isBusy}>
            <Text style={styles.secondaryButtonText}>Прослушать запись</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={recognizeRecording} disabled={isBusy}>
            <Text style={styles.secondaryButtonText}>Распознать слово</Text>
          </Pressable>
        </>
      )}
      {transcription !== null && <Text style={styles.result}>Результат: {transcription}</Text>}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: { fontSize: 32, fontWeight: '700' },
  subtitle: { marginTop: 8, fontSize: 16, color: '#555' },
  languages: { flexDirection: 'row', gap: 20, marginTop: 24 },
  language: { color: '#555', padding: 8 },
  selectedLanguage: { color: '#111', fontWeight: '700', textDecorationLine: 'underline' },
  result: { marginTop: 20, fontSize: 18, textAlign: 'center' },
  message: { marginTop: 32, marginBottom: 20, textAlign: 'center', color: '#444' },
  button: { backgroundColor: '#333', borderRadius: 10, paddingVertical: 14, paddingHorizontal: 20 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  secondaryButton: { marginTop: 16, padding: 12 },
  secondaryButtonText: { color: '#333', fontWeight: '600', fontSize: 16 },
});
