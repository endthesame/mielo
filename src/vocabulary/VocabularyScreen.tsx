import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { Deck } from '../decks/deck';
import type { VocabularyItem, VocabularyRepository } from './vocabulary';
import Examples from './Examples';
import WordImage from '../media/WordImage';
import ImportWords from './import/ImportWords';
import { colors } from '../theme';

export default function VocabularyScreen({ deck, repository, onReview }: { deck: Deck; repository: VocabularyRepository; onReview: () => void }) {
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [text, setText] = useState('');
  const [translation, setTranslation] = useState('');
  const [reading, setReading] = useState('');
  const [note, setNote] = useState('');
  const [alternatives, setAlternatives] = useState('');
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(50);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [examplesFor, setExamplesFor] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savingRef = useRef(false);

  useEffect(() => {
    let active = true;
    repository.listByDeck(deck.id).then((result) => {
      if (active) setItems(result);
    }).catch((err) => {
      console.error('Failed to load vocabulary:', err);
      if (active) setError('Не удалось загрузить слова.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [deck.id, repository]);

  async function createWord() {
    if (savingRef.current || loading) return;
    if (!text.trim() || !translation.trim()) {
      setError('Введите слово и перевод.');
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      const input = { text, translation, reading, meaningNote: note, acceptedAnswers: alternatives.split('\n').map((value) => value.trim()).filter(Boolean) };
      const item = editingId ? await repository.update(editingId, input) : await repository.create({ deckId: deck.id, ...input });
      setItems((current) => editingId ? current.map((previous) => previous.id === item.id ? item : previous) : [...current, item]);
      setText(''); setTranslation(''); setReading(''); setNote(''); setAlternatives('');
      setEditingId(null); setFormOpen(false);
    } catch (err) {
      console.error('Failed to save vocabulary:', err);
      setError('Не удалось сохранить слово. Попробуйте ещё раз.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  function edit(item: VocabularyItem) {
    setEditingId(item.id); setFormOpen(true);
    setText(item.text); setTranslation(item.translation); setReading(item.reading ?? ''); setNote(item.meaningNote ?? '');
    setAlternatives(item.acceptedAnswers.join('\n'));
    setError(null);
  }

  function confirmRemove(item: VocabularyItem) {
    Alert.alert('Удалить слово?', `«${item.text}» и его карточка будут удалены.`, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: async () => {
        if (savingRef.current) return;
        savingRef.current = true;
        setSaving(true);
        try {
          await repository.remove(item.id);
          setItems((current) => current.filter((word) => word.id !== item.id));
          if (editingId === item.id) { setEditingId(null); setText(''); setTranslation(''); setReading(''); setNote(''); setAlternatives(''); }
          setError(null);
        } catch (err) {
          console.error('Failed to remove vocabulary:', err);
          setError('Не удалось удалить слово. Попробуйте ещё раз.');
        } finally { savingRef.current = false; setSaving(false); }
      } },
    ]);
  }

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleItems = items.filter((item) => [item.text, item.translation, item.reading, item.meaningNote]
    .some((value) => value?.toLocaleLowerCase().includes(normalizedQuery)));

  if (importOpen) return <ImportWords deckId={deck.id} existingWords={items.map((item) => item.text)} repository={repository}
    onComplete={async () => { setItems(await repository.listByDeck(deck.id)); }} onClose={() => setImportOpen(false)} />;

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>{deck.targetLanguage === 'ko' ? 'КОРЕЙСКИЙ' : 'ЯПОНСКИЙ'}</Text>
      <Text style={styles.title}>{deck.name}</Text>
      <View style={styles.hero}><Text style={styles.heroLabel}>ВАШИ ПОВТОРЕНИЯ</Text><Text style={styles.heroTitle}>Пора освежить слова?</Text><Text style={styles.hint}>Продолжите учиться в своём темпе.</Text>
      <Pressable style={styles.button} onPress={onReview}><Text style={styles.buttonText}>Начать повторение</Text></Pressable></View>
      <Pressable style={styles.importButton} onPress={() => setImportOpen(true)} disabled={loading || saving} accessibilityRole="button"><Text style={styles.action}>Импортировать слова</Text></Pressable>
      {!formOpen && <Pressable style={styles.importButton} onPress={() => setFormOpen(true)}><Text style={styles.action}>＋ Добавить слово</Text></Pressable>}
      {formOpen && <View style={styles.form}><Text style={styles.label}>{editingId ? 'Редактировать слово' : 'Добавить слово'}</Text>
      <Text style={styles.fieldLabel}>Слово *</Text><TextInput style={styles.input} placeholder="Слово или выражение *" value={text} onChangeText={setText} editable={!saving} />
      <Text style={styles.fieldLabel}>Перевод *</Text><TextInput style={styles.input} placeholder="Перевод *" value={translation} onChangeText={setTranslation} editable={!saving} />
      <Text style={styles.fieldLabel}>Чтение</Text><TextInput style={styles.input} placeholder="Чтение (необязательно)" value={reading} onChangeText={setReading} editable={!saving} />
      <Text style={styles.fieldLabel}>Комментарий</Text><TextInput style={styles.input} placeholder="Комментарий (необязательно)" value={note} onChangeText={setNote} editable={!saving} />
      <Text style={styles.fieldLabel}>Другие допустимые ответы</Text><TextInput style={styles.input} placeholder="Другие допустимые ответы — по одному на строку" value={alternatives} onChangeText={setAlternatives} editable={!saving} multiline />
      <Pressable style={styles.button} onPress={createWord} disabled={saving || loading} accessibilityRole="button">
        <Text style={styles.buttonText}>{saving ? 'Сохраняем…' : editingId ? 'Сохранить изменения' : 'Добавить слово'}</Text>
      </Pressable>
      <Pressable onPress={() => { setEditingId(null); setText(''); setTranslation(''); setReading(''); setNote(''); setAlternatives(''); setError(null); setFormOpen(false); }} disabled={saving}><Text style={styles.action}>Отменить</Text></Pressable></View>}
      {error && <Text style={styles.error}>{error}</Text>}
      <Text style={styles.label}>Слова</Text>
      <TextInput style={styles.input} placeholder="Поиск по словам" value={query} onChangeText={(value) => { setQuery(value); setVisibleCount(50); }} />
      {loading ? <Text style={styles.hint}>Загружаем…</Text> : items.length === 0 ? <Text style={styles.hint}>В колоде пока нет слов.</Text> : visibleItems.length === 0 ? <Text style={styles.hint}>Ничего не найдено.</Text> : visibleItems.slice(0, visibleCount).map((item) => (
        <View style={styles.word} key={item.id}>
          <Text style={styles.wordText}>{item.text} — {item.translation}</Text>
          {item.reading && <Text style={styles.hint}>{item.reading}</Text>}
          {item.meaningNote && <Text style={styles.hint}>{item.meaningNote}</Text>}
          <View style={styles.actions}>
            <Pressable onPress={() => edit(item)} disabled={saving}><Text style={styles.action}>Изменить</Text></Pressable>
            <Pressable onPress={() => confirmRemove(item)} disabled={saving}><Text style={styles.action}>Удалить</Text></Pressable>
            <Pressable onPress={() => setExamplesFor(examplesFor === item.id ? null : item.id)}><Text style={styles.action}>Материалы</Text></Pressable>
          </View>
          {examplesFor === item.id && <><WordImage wordId={item.id} /><Examples wordId={item.id} /></>}
        </View>
      ))}
      {!loading && visibleItems.length > visibleCount && <Pressable onPress={() => setVisibleCount((count) => count + 50)} accessibilityRole="button">
        <Text style={styles.action}>Показать ещё · показано {visibleCount} из {visibleItems.length}</Text>
      </Pressable>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24 }, eyebrow: { fontSize: 11, color: colors.primaryDark, letterSpacing: 1.2, fontWeight: '700' },
  title: { fontSize: 32, color: colors.text, fontWeight: '800', marginTop: 8, marginBottom: 24 },
  hero: { backgroundColor: colors.softBlue, borderRadius: 20, padding: 20, marginBottom: 16 },
  heroLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: colors.primaryDark }, heroTitle: { color: colors.text, fontSize: 21, fontWeight: '700', marginTop: 10 },
  form: { backgroundColor: colors.surface, borderRadius: 20, padding: 20, marginBottom: 24 },
  label: { color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: 12, marginTop: 12 }, fieldLabel: { color: colors.muted, fontSize: 14, fontWeight: '600', marginBottom: 6 },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 14, marginBottom: 14, fontSize: 16, color: colors.text },
  button: { backgroundColor: colors.primary, borderBottomColor: colors.primaryDark, borderBottomWidth: 4, borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 12 },
  buttonText: { color: colors.surface, fontWeight: '700', fontSize: 16 }, error: { color: colors.danger, marginBottom: 12 },
  importButton: { padding: 14, backgroundColor: colors.surface, borderRadius: 16, alignItems: 'center', marginBottom: 10 },
  hint: { color: colors.muted, marginVertical: 6, lineHeight: 20 }, word: { padding: 18, borderRadius: 18, backgroundColor: colors.surface, marginBottom: 10 },
  wordText: { fontSize: 17, color: colors.text, fontWeight: '600' }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, marginTop: 10 }, action: { color: colors.primaryDark, fontWeight: '600', paddingVertical: 8 },
});
