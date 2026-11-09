import { useEffect } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { interpolate, Extrapolation, ReduceMotion, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { Host, Icon } from '@expo/ui';
import { colors } from '../theme';
import type { RecallChoice } from './review-flow';

type Props = { cue: string; image?: string; revealed: boolean; answer: string; reading: string | null; note: string | null; example: string | null; onReveal: () => void; onRecall: (choice: RecallChoice) => void };

export default function SwipeCard({ cue, image, revealed, answer, reading, note, example, onReveal, onRecall }: Props) {
  const x = useSharedValue(0);
  useEffect(() => { x.set(0); }, [cue, revealed, x]);
  const pan = Gesture.Pan().enabled(!revealed).activeOffsetX([-12, 12]).failOffsetY([-12, 12])
    .onUpdate((event) => { x.set(event.translationX); })
    .onEnd((event) => {
      const projected = event.translationX + event.velocityX * 0.15;
      if (Math.abs(projected) > 95) scheduleOnRN(onRecall, projected < 0 ? 'remembered' : 'not-remembered');
      x.set(withSpring(0, { duration: 400, dampingRatio: 0.8, velocity: event.velocityX, reduceMotion: ReduceMotion.System }));
    });
  const movement = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }, { rotate: `${x.get() / 35}deg` }] }));
  const left = useAnimatedStyle(() => ({ opacity: interpolate(x.get(), [-90, -10, 0], [1, 0.2, 0], Extrapolation.CLAMP) }));
  const right = useAnimatedStyle(() => ({ opacity: interpolate(x.get(), [0, 10, 90], [0, 0.2, 1], Extrapolation.CLAMP) }));
  return <View>
    <GestureDetector gesture={pan}><Animated.View style={[styles.card, movement]}>
      <Animated.View pointerEvents="none" style={[styles.overlay, styles.known, left]}><Text style={styles.knownText}>ВСПОМНИЛ</Text></Animated.View>
      <Animated.View pointerEvents="none" style={[styles.overlay, styles.unknown, right]}><Text style={styles.unknownText}>НЕ ВСПОМНИЛ</Text></Animated.View>
      <Pressable onPress={onReveal} disabled={revealed} accessibilityRole="button" accessibilityLabel={`Подсказка: ${cue}. Показать ответ`} style={styles.content}>
        <View style={styles.mark} /><Text style={styles.label}>ВСПОМНИТЕ СЛОВО</Text>
        {image && <Image source={{ uri: image }} style={styles.image} resizeMode="contain" />}
        <Text style={styles.cue}>{cue}</Text>
        {revealed ? <View><Text style={styles.answer}>{answer}</Text>{reading && <Text style={styles.detail}>{reading}</Text>}{note && <Text style={styles.detail}>{note}</Text>}{example && <Text style={styles.detail}>Пример: {example}</Text>}</View> : <Text style={styles.hint}>Нажмите, чтобы увидеть ответ</Text>}
      </Pressable>
    </Animated.View></GestureDetector>
    {!revealed && <View style={styles.actions}>
      <Pressable accessibilityRole="button" accessibilityLabel="Вспомнил" onPress={() => onRecall('remembered')} style={({ pressed }) => [styles.action, pressed && styles.pressed]}><Host matchContents pointerEvents="none"><Icon name="checkmark" size={20} color={colors.primaryDark} /></Host></Pressable>
      <Text style={styles.actionText}>← Вспомнил   ·   Не вспомнил →</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Не вспомнил" onPress={() => onRecall('not-remembered')} style={({ pressed }) => [styles.action, { backgroundColor: colors.peach }, pressed && styles.pressed]}><Host matchContents pointerEvents="none"><Icon name="xmark" size={20} color="#88310D" /></Host></Pressable>
    </View>}
  </View>;
}
const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 24, marginVertical: 12, minHeight: 210, overflow: 'hidden', borderBottomWidth: 4, borderBottomColor: colors.border },
  content: { padding: 24, flexGrow: 1, justifyContent: 'center', minHeight: 210 }, mark: { width: 30, height: 4, borderRadius: 2, backgroundColor: colors.orange, marginBottom: 16 },
  label: { color: colors.primaryDark, fontSize: 11, letterSpacing: 1.2, fontWeight: '700' }, cue: { color: colors.text, fontSize: 30, fontWeight: '700', marginVertical: 24 }, hint: { color: colors.muted, fontSize: 14 }, image: { width: '100%', height: 150, marginVertical: 8 },
  answer: { color: colors.primaryDark, fontSize: 27, fontWeight: '700' }, detail: { color: colors.muted, fontSize: 16, lineHeight: 22, marginTop: 8 },
  overlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 1, justifyContent: 'flex-start', alignItems: 'flex-end', padding: 22 }, known: { backgroundColor: '#E0E7FF' }, unknown: { backgroundColor: '#FFEDD5' }, knownText: { color: colors.primaryDark, fontWeight: '800' }, unknownText: { color: '#88310D', fontWeight: '800' },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }, action: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.softBlue, justifyContent: 'center', alignItems: 'center' }, actionText: { color: colors.muted, fontSize: 13, flexShrink: 1, textAlign: 'center' },
  pressed: { opacity: 0.7 },
});
