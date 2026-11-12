import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { Host, Icon } from '@expo/ui';
import { useFocusEffect } from 'expo-router';
import { pronunciationEngine } from '../pronunciation';
import { colors } from '../theme';

export default function PronunciationButton({ text, language }: { text: string; language: string }) {
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(false);
  const request = useRef(0);

  const stop = useCallback(() => {
    request.current++;
    void pronunciationEngine.stop().catch((err) => console.warn('Не удалось остановить озвучивание:', err));
  }, []);

  useFocusEffect(useCallback(() => {
    setPlaying(false);
    return () => { stop(); };
  }, [stop]));
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') { stop(); setPlaying(false); }
    });
    return () => { subscription.remove(); stop(); };
  }, [stop]);

  async function play() {
    const current = ++request.current;
    setError(false);
    setPlaying(true);
    try {
      await pronunciationEngine.speak(text, language, {
        onStart: () => { if (current === request.current) setPlaying(true); },
        onDone: () => { if (current === request.current) setPlaying(false); },
        onError: () => { if (current === request.current) { setPlaying(false); setError(true); } },
      });
    } catch (err) {
      console.warn('Не удалось озвучить слово:', err);
      if (current === request.current) { setPlaying(false); setError(true); }
    }
  }

  return <View style={styles.container}>
    <View style={styles.answerRow}><Text style={styles.answer}>{text}</Text>
    <Pressable onPress={() => { void play(); }} accessibilityRole="button"
      accessibilityLabel={`Прослушать произношение: ${text}`}
      accessibilityHint="Повторное нажатие воспроизведёт слово заново"
      accessibilityState={{ busy: playing }}
      style={({ pressed }) => [styles.button, playing && styles.playing, pressed && styles.pressed]}>
      <Host matchContents pointerEvents="none"><Icon name={playing ? 'speaker.wave.3.fill' : 'speaker.wave.2'} size={22} color={colors.primaryDark} /></Host>
    </Pressable>
    </View>
    {error && <Text style={styles.error} accessibilityLiveRegion="polite">Не удалось озвучить слово. Проверьте доступность голоса и попробуйте снова.</Text>}
  </View>;
}

const styles = StyleSheet.create({
  container: { alignItems: 'flex-start' },
  answerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  answer: { color: colors.primaryDark, fontSize: 27, fontWeight: '700', flexShrink: 1 },
  button: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.softBlue, alignItems: 'center', justifyContent: 'center' },
  playing: { backgroundColor: colors.peach },
  pressed: { opacity: 0.7 },
  error: { color: colors.danger, marginTop: 8, lineHeight: 20 },
});
