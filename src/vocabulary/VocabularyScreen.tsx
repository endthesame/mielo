import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { Deck } from '../decks/deck';
import type { VocabularyItem, VocabularyRepository } from './vocabulary';
import Examples from './Examples';
import WordImage from '../media/WordImage';
import ImportWords from './import/ImportWords';

export default function VocabularyScreen({ deck, repository, onReview }: { deck: Deck; repository: VocabularyRepository; onReview: () => void }) {
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [text, setText] = useState('');
  const [translation, setTranslation] = useState('');
  const [reading, setReading] = useState('');
  const [note, setNote] = useState('');
  const [alternatives, setAlternatives] = useState('');
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(50);
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
      setEditingId(null);
    } catch (err) {
      console.error('Failed to save vocabulary:', err);
      setError('Не удалось сохранить слово. Попробуйте ещё раз.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  function edit(item: VocabularyItem) {
    setEditingId(item.id);
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
      <Text style={styles.title}>{deck.name}</Text>
      <Pressable style={styles.button} onPress={onReview}><Text style={styles.buttonText}>Начать повторение</Text></Pressable>
      <Pressable style={styles.importButton} onPress={() => setImportOpen(true)} disabled={loading || saving} accessibilityRole="button"><Text>Массовое добавление</Text></Pressable>
      <Text style={styles.label}>{editingId ? 'Редактировать слово' : 'Добавить слово'}</Text>
      <TextInput style={styles.input} placeholder="Слово или выражение *" value={text} onChangeText={setText} editable={!saving} />
      <TextInput style={styles.input} placeholder="Перевод *" value={translation} onChangeText={setTranslation} editable={!saving} />
      <TextInput style={styles.input} placeholder="Чтение (необязательно)" value={reading} onChangeText={setReading} editable={!saving} />
      <TextInput style={styles.input} placeholder="Комментарий (необязательно)" value={note} onChangeText={setNote} editable={!saving} />
      <TextInput style={styles.input} placeholder="Другие допустимые ответы — по одному на строку" value={alternatives} onChangeText={setAlternatives} editable={!saving} multiline />
      <Pressable style={styles.button} onPress={createWord} disabled={saving || loading} accessibilityRole="button">
        <Text style={styles.buttonText}>{saving ? 'Сохраняем…' : editingId ? 'Сохранить изменения' : 'Добавить слово'}</Text>
      </Pressable>
      {editingId && <Pressable onPress={() => { setEditingId(null); setText(''); setTranslation(''); setReading(''); setNote(''); setAlternatives(''); setError(null); }} disabled={saving}><Text style={styles.hint}>Отменить редактирование</Text></Pressable>}
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
  container: { padding: 24 }, title: { fontSize: 28, fontWeight: '700', marginBottom: 24 },
  label: { fontSize: 17, fontWeight: '600', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#aaa', borderRadius: 8, padding: 12, marginBottom: 12 },
  button: { backgroundColor: '#333', borderRadius: 8, padding: 14, alignItems: 'center', marginBottom: 24 },
  buttonText: { color: '#fff', fontWeight: '600' }, error: { color: '#b00020', marginBottom: 12 },
  importButton: { padding: 14, backgroundColor: '#eee', borderRadius: 8, alignItems: 'center', marginBottom: 24 },
  hint: { color: '#555', marginVertical: 4 }, word: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#ddd' },
  wordText: { fontSize: 17 },
  actions: { flexDirection: 'row', gap: 20, marginTop: 10 }, action: { color: '#555', paddingVertical: 6 },
});
