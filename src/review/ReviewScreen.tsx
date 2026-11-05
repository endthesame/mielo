import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Rating, type Grade } from 'ts-fsrs';
import type { Deck } from '../decks/deck';
import type { DueCard, ReviewRepository } from './review';
import VoiceAnswer from './VoiceAnswer';
import { matchesAnswer } from './evaluate-answer';
import { matchLiveAnswer } from './live-match';
import { imageUri } from '../media/media-store';
import { getVoiceEnabled } from '../settings/settings-repository';
import { speechEngine, supportsLiveLanguage } from '../speech';
import { colors } from '../theme';
import { initialReviewFlow, reviewFlowReducer, type RecallChoice } from './review-flow';

const ratings: { title: string; value: Grade }[] = [
  { title: 'Снова', value: Rating.Again }, { title: 'Трудно', value: Rating.Hard },
  { title: 'Хорошо', value: Rating.Good }, { title: 'Легко', value: Rating.Easy },
];

export default function ReviewScreen({ deck, repository, onClose }: { deck: Deck; repository: ReviewRepository; onClose: () => void }) {
  const [queue, setQueue] = useState<DueCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [flow, dispatch] = useReducer(reviewFlowReducer, initialReviewFlow);
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const busy = useRef(false);
  const revealLocked = useRef(false);
  const load = useCallback(async () => {
    try { setQueue(await repository.getDueCards(deck.id, new Date())); setError(null); }
    catch (err) { console.error('Failed to load reviews:', err); setError('Не удалось загрузить карточки.'); }
    finally { setLoading(false); }
  }, [deck.id, repository]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { getVoiceEnabled().then(setVoiceEnabled).catch((err) => console.error('Failed to read voice settings:', err)); }, []);
  const card = queue[0];
  const voiceSupported = supportsLiveLanguage(speechEngine.getCapabilities(), deck.targetLanguage);
  function selfAssess(choice: RecallChoice) {
    if (revealLocked.current) return;
    revealLocked.current = true;
    setAnswer('');
    dispatch({ type: 'self-assessment', choice });
  }
  function showAnswer() {
    if (revealLocked.current) return;
    revealLocked.current = true;
    dispatch({ type: 'show-answer' });
  }
  function resetAnswer() {
    revealLocked.current = false;
    dispatch({ type: 'reset' });
  }
  async function submit(rating: Grade) {
    if (!card || !flow.revealed || busy.current) return;
    busy.current = true; setSaving(true); setError(null);
    try {
      await repository.submitReview(card, rating, new Date());
      setQueue((current) => current.slice(1)); setAnswer(''); resetAnswer();
    } catch (err) { console.error('Failed to submit review:', err); setError('Не удалось сохранить оценку. Обновите очередь и попробуйте ещё раз.'); }
    finally { busy.current = false; setSaving(false); }
  }
  return <View style={styles.container}>
    <Pressable onPress={onClose} disabled={saving}><Text style={styles.link}>← Вернуться к колоде</Text></Pressable>
    <Text style={styles.title}>Повторение · {deck.name}</Text>
    {loading ? <Text>Загружаем…</Text> : !card ? <><View style={styles.card}><Text style={styles.cue}>На сегодня всё</Text><Text style={styles.hint}>Карточек к повторению сейчас нет.</Text></View><Pressable onPress={load}><Text style={styles.link}>Обновить</Text></Pressable></> : <>
      <Text style={styles.hint}>Осталось в этой сессии: {queue.length}</Text>
      <View style={styles.card}><View style={styles.accentMark} /><Text style={styles.cardLabel}>ВСПОМНИТЕ СЛОВО</Text>{card.imageName && <Image source={{ uri: imageUri(card.imageName) }} style={styles.image} resizeMode="contain" />}
      <Text style={styles.cue}>{card.translation}</Text></View>
      {!flow.revealed ? <>
        {voiceEnabled && !voiceSupported && <Text style={styles.hint}>Текущая модель не поддерживает голосовой ответ на этом языке. Вы можете ответить текстом или отметить, вспомнили ли слово.</Text>}
        {voiceEnabled && voiceSupported && <VoiceAnswer key={card.cardId}
          language={deck.targetLanguage} variants={[card.text, card.reading, ...(JSON.parse(card.acceptedAnswers) as string[])]}
          onResult={(text) => { if (!revealLocked.current) setAnswer(text); }} onMatch={(text, kind) => {
            if (revealLocked.current) return;
            revealLocked.current = true;
            setAnswer(text);
            dispatch({ type: 'speech-match', kind });
          }} />}
        <TextInput style={styles.input} placeholder="Ваш ответ (необязательно)" value={answer} onChangeText={setAnswer} />
        <Pressable style={styles.button} onPress={showAnswer}><Text style={styles.buttonText}>Показать ответ</Text></Pressable>
        <View style={styles.selfActions}>
          <Pressable style={styles.selfButton} accessibilityRole="button" onPress={() => selfAssess('remembered')}><Text>Вспомнил</Text></Pressable>
          <Pressable style={styles.selfButton} accessibilityRole="button" onPress={() => selfAssess('not-remembered')}><Text>Не вспомнил</Text></Pressable>
        </View>
      </> : <>
        {flow.recall && <Text style={styles.hint}>{flow.recall === 'remembered' ? 'Вы отметили, что вспомнили слово.' : 'Вы отметили, что не вспомнили слово.'}</Text>}
        {flow.automaticMatch && <Text style={styles.hint}>{flow.automaticMatch === 'exact' ? 'Ответ совпал.' : 'Похоже, ответ верный. Проверьте распознавание.'}</Text>}
        {answer.trim() !== '' && <><Text style={styles.hint}>Распознанный или введённый ответ — можно исправить:</Text>
          <TextInput style={styles.input} value={answer} onChangeText={(value) => { setAnswer(value); dispatch({ type: 'edit-answer' }); }} /></>}
        {answer.trim() !== '' && <Text style={styles.hint}>{matchesAnswer(answer, card.text, card.reading, JSON.parse(card.acceptedAnswers) as string[]) ? 'Совпадает с одним из допустимых ответов.' : matchLiveAnswer(answer, [card.text, card.reading, ...(JSON.parse(card.acceptedAnswers) as string[])]) === 'fuzzy' ? 'Ответ похож на допустимый — проверьте его.' : 'Автоматического совпадения нет — проверьте ответ самостоятельно.'}</Text>}
        <Text style={styles.answer}>{card.text}</Text>
        {card.reading && <Text style={styles.hint}>{card.reading}</Text>}
        <Text style={styles.hint}>Как хорошо вы вспомнили слово?</Text>
        <Pressable onPress={resetAnswer} disabled={saving}><Text style={styles.link}>Повторить ответ</Text></Pressable>
        <View style={styles.ratings}>{ratings.map((rating) => <Pressable key={rating.value} style={styles.rating} disabled={saving} onPress={() => submit(rating.value)}><Text style={styles.ratingText}>{rating.title}</Text></Pressable>)}</View>
      </>}
    </>}
    {error && <><Text style={styles.error}>{error}</Text><Pressable onPress={load}><Text style={styles.link}>Обновить очередь</Text></Pressable></>}
  </View>;
}

const styles = StyleSheet.create({
  container: { padding: 24 }, title: { color: colors.text, fontSize: 27, fontWeight: '800', marginVertical: 20 },
  link: { color: colors.primaryDark, paddingVertical: 12, fontWeight: '600' }, hint: { color: colors.muted, marginVertical: 12, lineHeight: 21 },
  card: { backgroundColor: colors.surface, borderRadius: 24, padding: 24, minHeight: 190, justifyContent: 'center', marginVertical: 12, borderBottomWidth: 4, borderBottomColor: colors.border },
  accentMark: { width: 30, height: 4, borderRadius: 2, backgroundColor: colors.orange, marginBottom: 16 }, cardLabel: { color: colors.primaryDark, fontSize: 11, letterSpacing: 1.2, fontWeight: '700' }, cue: { color: colors.text, fontSize: 30, fontWeight: '700', marginVertical: 24 }, answer: { color: colors.text, fontSize: 28, fontWeight: '700', marginTop: 12 },
  input: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 16, fontSize: 16 },
  button: { backgroundColor: colors.primary, borderBottomColor: colors.primaryDark, borderBottomWidth: 4, padding: 16, borderRadius: 16, alignItems: 'center' },
  buttonText: { color: colors.surface, fontWeight: '700', fontSize: 16 }, ratings: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  selfActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 }, selfButton: { flexGrow: 1, padding: 16, backgroundColor: colors.softBlue, borderRadius: 14, alignItems: 'center' },
  rating: { flexBasis: '44%', flexGrow: 1, minHeight: 48, padding: 16, backgroundColor: colors.softBlue, borderRadius: 14, alignItems: 'center' }, ratingText: { color: colors.primaryDark, fontWeight: '700' },
  error: { color: colors.danger, marginTop: 16 }, image: { width: '100%', height: 160, marginVertical: 8 },
});
