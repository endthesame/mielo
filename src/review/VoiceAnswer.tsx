import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { requestRecordingPermissionsAsync, setAudioModeAsync, useAudioStream } from 'expo-audio';
import { speechEngine, type SpeechLanguage } from '../speech';
import type { LiveSpeechSession } from '../speech/speech-engine';
import { normalizeAnswer } from './evaluate-answer';
import { matchLiveAnswer } from './live-match';

type Props = {
  language: SpeechLanguage;
  variants: (string | null)[];
  onResult: (text: string) => void;
  onMatch: (text: string, kind: 'exact' | 'fuzzy') => void;
};

type Phase = 'idle' | 'preparing' | 'listening' | 'stopping';

export default function VoiceAnswer({ language, variants, onResult, onMatch }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [message, setMessage] = useState('');
  const alive = useRef(false);
  const generation = useRef(0);
  const session = useRef<LiveSpeechSession | null>(null);
  const pending = useRef<Promise<void> | null>(null);
  const initializing = useRef(false);
  const matched = useRef(false);
  const lastCandidate = useRef('');
  const callbacks = useRef({ variants, onResult, onMatch });
  callbacks.current = { variants, onResult, onMatch };
  const stopRef = useRef<() => void>(() => {});

  const { stream } = useAudioStream({
    sampleRate: 16000, channels: 1, encoding: 'int16',
    onBuffer: (buffer) => {
      if (buffer.sampleRate !== 16000 || buffer.channels !== 1) {
        if (alive.current) setMessage('Формат микрофона не поддерживается. Можно ответить вручную.');
        stopRef.current();
        return;
      }
      session.current?.pushAudio(buffer.data);
    },
  });

  const stop = useCallback(() => {
    generation.current++;
    try { if (stream.isStreaming) stream.stop(); }
    catch (error) { console.warn('Не удалось остановить микрофон:', error); }
    const current = session.current;
    session.current = null;
    if (current) {
      if (alive.current) setPhase('stopping');
      const closing = current.close().catch((error) => console.warn('Не удалось освободить модель:', error));
      pending.current = closing;
      void closing.finally(() => {
        if (pending.current === closing) pending.current = null;
        if (alive.current && !matched.current) setPhase('idle');
      });
    } else if (alive.current) setPhase(initializing.current ? 'stopping' : 'idle');
  }, [stream]);
  stopRef.current = stop;

  const start = useCallback(async () => {
    if (initializing.current || AppState.currentState !== 'active') return;
    initializing.current = true;
    const attempt = ++generation.current;
    matched.current = false;
    lastCandidate.current = '';
    setPhase('preparing'); setMessage('Подготавливаем микрофон…');
    try {
      if (pending.current) await pending.current;
      if (!alive.current || attempt !== generation.current) return;
      const permission = await requestRecordingPermissionsAsync();
      if (!alive.current || attempt !== generation.current) return;
      if (!permission.granted) { setMessage('Нет доступа к микрофону. Можно ответить вручную.'); setPhase('idle'); return; }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      if (!alive.current || attempt !== generation.current) return;
      const created = await speechEngine.startLive(language, (text) => {
        if (!alive.current || attempt !== generation.current || matched.current) return;
        callbacks.current.onResult(text);
        const kind = matchLiveAnswer(text, callbacks.current.variants);
        const normalized = normalizeAnswer(text);
        // Для нечёткого совпадения ждём два одинаковых результата.
        const candidate = kind ? `${kind}:${normalized}` : '';
        const accepted = kind === 'exact' || (candidate !== '' && lastCandidate.current === candidate);
        lastCandidate.current = candidate;
        if (accepted && kind) {
          matched.current = true;
          stopRef.current();
          callbacks.current.onMatch(text, kind);
        }
      }, (error) => {
        console.error('Live transcription failed:', error);
        if (alive.current && attempt === generation.current) {
          setMessage('Не удалось распознать речь. Попробуйте ещё раз или ответьте вручную.');
          stopRef.current();
        }
      }, (status) => { if (alive.current && attempt === generation.current) setMessage(status); });
      if (!alive.current || attempt !== generation.current) { await created.close(); return; }
      session.current = created;
      await stream.start();
      if (!alive.current || attempt !== generation.current) {
        if (stream.isStreaming) stream.stop();
        if (session.current === created) session.current = null;
        await created.close();
        return;
      }
      setPhase('listening'); setMessage('Слушаю…');
    } catch (error) {
      console.error('Failed to start live speech:', error);
      if (alive.current && attempt === generation.current) {
        setMessage('Не удалось запустить микрофон. Попробуйте ещё раз или ответьте вручную.');
        stopRef.current();
      }
    } finally {
      initializing.current = false;
      if (alive.current && attempt !== generation.current && !pending.current && !matched.current) setPhase('idle');
    }
  }, [language, stream]);

  useEffect(() => {
    alive.current = true;
    void start();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        if (alive.current) setMessage('Прослушивание остановлено.');
        stopRef.current();
      }
    });
    return () => { alive.current = false; subscription.remove(); stopRef.current(); };
  }, [start]);

  return <View>
    <Pressable disabled={phase === 'stopping'} onPress={() => {
      if (phase === 'idle') void start();
      else { setMessage('Прослушивание остановлено.'); stop(); }
    }} style={styles.button} accessibilityRole="button">
      <Text>{phase === 'preparing' ? 'Отменить подготовку' : phase === 'listening' ? 'Остановить прослушивание' : phase === 'stopping' ? 'Останавливаем…' : 'Начать прослушивание'}</Text>
    </Pressable>
    {message ? <Text style={styles.message}>{message}</Text> : null}
  </View>;
}
const styles = StyleSheet.create({ button: { backgroundColor: '#eee', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 12 }, message: { color: '#555', marginBottom: 12 } });
