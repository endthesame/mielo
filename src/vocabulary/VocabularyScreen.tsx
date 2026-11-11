import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { Deck } from '../decks/deck';
import type { VocabularyItem, VocabularyRepository } from './vocabulary';
import Examples, { type ExampleDraft } from './Examples';
import WordImage from '../media/WordImage';
import ImportWords from './import/ImportWords';
import { colors, spacing, radius, fontSize } from '../theme';
import Button from '../components/Button';
import { languageName } from '../languages/languages';

export default function VocabularyScreen({ deck, repository, onReview }: { deck: Deck; repository: VocabularyRepository; onReview: () => void }) {
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [text, setText] = useState('');
  const [translation, setTranslation] = useState('');
  const [reading, setReading] = useState('');
  const [note, setNote] = useState('');
  const [alternatives, setAlternatives] = useState('');
  const [query, setQuery] = useState('');
  const listRef = useRef<FlatList<VocabularyItem>>(null);
  const [drafts, setDrafts] = useState<Record<string, ExampleDraft>>({});
  const [exampleRevisions, setExampleRevisions] = useState<Record<string, number>>({});
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
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
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
          setDrafts((current) => { const next = { ...current }; delete next[item.id]; return next; });
          setExamplesFor((current) => current === item.id ? null : current);
          if (editingId === item.id) { setEditingId(null); setText(''); setTranslation(''); setReading(''); setNote(''); setAlternatives(''); }
          setError(null);
        } catch (err) {
          console.error('Failed to remove vocabulary:', err);
          setError('Не удалось удалить слово. Попробуйте ещё раз.');
        } finally { savingRef.current = false; setSaving(false); }
      } },
    ]);
  }

  const visibleItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return items.filter((item) => [item.text, item.translation, item.reading, item.meaningNote]
      .some((value) => value?.toLocaleLowerCase().includes(normalizedQuery)));
  }, [items, query]);

  return (
    <>
    <View style={{ flex: 1, display: importOpen ? 'none' : 'flex' }}>
    <FlatList ref={listRef} data={visibleItems} keyExtractor={(item) => item.id} contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" contentInsetAdjustmentBehavior="automatic"
      ListHeaderComponent={<View>
      <Text style={styles.title}>{deck.name}</Text>
      <Text style={styles.language}>{languageName(deck.targetLanguage)}</Text>
      <View style={styles.hero}><View style={styles.accentMark} /><Text style={styles.heroTitle}>Пора освежить слова?</Text><Text style={styles.hint}>Продолжите учиться в своём темпе.</Text>
      <Button title="Начать повторение" onPress={onReview} style={styles.mainButton} /></View>
      <Button title="Импортировать слова" variant="secondary" onPress={() => setImportOpen(true)} disabled={loading || saving} style={styles.secondaryButton} />
      {!formOpen && <Button title="＋ Добавить слово" variant="secondary" onPress={() => setFormOpen(true)} style={styles.secondaryButton} />}
      {formOpen && <View style={styles.form}><Text style={styles.label}>{editingId ? 'Редактировать слово' : 'Добавить слово'}</Text>
      <Text style={styles.fieldLabel}>Слово *</Text><TextInput style={styles.input} placeholder="Слово или выражение *" value={text} onChangeText={setText} editable={!saving} />
      <Text style={styles.fieldLabel}>Перевод *</Text><TextInput style={styles.input} placeholder="Перевод *" value={translation} onChangeText={setTranslation} editable={!saving} />
      <Text style={styles.fieldLabel}>Чтение</Text><TextInput style={styles.input} placeholder="Чтение (необязательно)" value={reading} onChangeText={setReading} editable={!saving} />
      <Text style={styles.fieldLabel}>Комментарий</Text><TextInput style={styles.input} placeholder="Комментарий (необязательно)" value={note} onChangeText={setNote} editable={!saving} />
      <Text style={styles.fieldLabel}>Другие допустимые ответы</Text><TextInput style={styles.input} placeholder="Другие допустимые ответы — по одному на строку" value={alternatives} onChangeText={setAlternatives} editable={!saving} multiline />
      <Button title={saving ? 'Сохраняем…' : editingId ? 'Сохранить изменения' : 'Добавить слово'} onPress={createWord} disabled={loading} busy={saving} style={styles.mainButton} />
      <Pressable style={({ pressed }) => ({ opacity: saving ? 0.45 : pressed ? 0.7 : 1, minHeight: 44, justifyContent: 'center' })} accessibilityRole="button" onPress={() => { setEditingId(null); setText(''); setTranslation(''); setReading(''); setNote(''); setAlternatives(''); setError(null); setFormOpen(false); }} disabled={saving}><Text style={styles.action}>Отменить</Text></Pressable></View>}
      {error && <Text style={styles.error}>{error}</Text>}
      <Text style={styles.label}>Слова</Text>
      <TextInput style={styles.input} placeholder="Поиск по словам" value={query} onChangeText={setQuery} />
      </View>}
      ListEmptyComponent={loading ? <Text style={styles.hint}>Загружаем…</Text> : items.length === 0 ? <Text style={styles.hint}>В колоде пока нет слов.</Text> : <Text style={styles.hint}>Ничего не найдено.</Text>}
      renderItem={({ item }) => (
        <View style={styles.word} key={item.id}>
          <Text style={styles.wordText}>{item.text} — {item.translation}</Text>
          {item.reading && <Text style={styles.hint}>{item.reading}</Text>}
          {item.meaningNote && <Text style={styles.hint}>{item.meaningNote}</Text>}
          <View style={styles.actions}>
            <Pressable style={({ pressed }) => ({ opacity: saving ? 0.45 : pressed ? 0.7 : 1, minHeight: 44, justifyContent: 'center' })} accessibilityRole="button" onPress={() => edit(item)} disabled={saving}><Text style={styles.action}>Изменить</Text></Pressable>
            <Pressable style={({ pressed }) => ({ opacity: saving ? 0.45 : pressed ? 0.7 : 1, minHeight: 44, justifyContent: 'center' })} accessibilityRole="button" onPress={() => confirmRemove(item)} disabled={saving}><Text style={styles.action}>Удалить</Text></Pressable>
            <Pressable style={({ pressed }) => ({ opacity: saving ? 0.45 : pressed ? 0.7 : 1, minHeight: 44, justifyContent: 'center' })} accessibilityRole="button" onPress={() => setExamplesFor(examplesFor === item.id ? null : item.id)}><Text style={styles.action}>Материалы</Text></Pressable>
          </View>
          {examplesFor === item.id && <><WordImage wordId={item.id} revision={exampleRevisions[item.id] ?? 0} onChanged={() => setExampleRevisions((current) => ({ ...current, [item.id]: (current[item.id] ?? 0) + 1 }))} /><Examples wordId={item.id} revision={exampleRevisions[item.id] ?? 0} onChanged={() => setExampleRevisions((current) => ({ ...current, [item.id]: (current[item.id] ?? 0) + 1 }))} draft={drafts[item.id] ?? { text: '', translation: '' }} onDraftChange={(draft) => setDrafts((current) => ({ ...current, [item.id]: draft }))} onSaved={(saved) => { setExampleRevisions((current) => ({ ...current, [item.id]: (current[item.id] ?? 0) + 1 })); setDrafts((current) => {
            const draft = current[item.id];
            if (!draft || draft.text !== saved.text || draft.translation !== saved.translation) return current;
            const next = { ...current }; delete next[item.id]; return next;
          }); }} /></>}
        </View>
      )} />
    </View>
    {importOpen && <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive"><ImportWords deckId={deck.id} existingWords={items.map((item) => item.text)} repository={repository}
      onComplete={async () => { setItems(await repository.listByDeck(deck.id)); }} onClose={() => setImportOpen(false)} /></ScrollView>}
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.screen },
  title: { fontSize: 32, color: colors.text, fontWeight: '800', marginTop: 8 }, language: { color: colors.muted, fontSize: 15, marginTop: 6, marginBottom: 24 },
  hero: { backgroundColor: colors.softBlue, borderRadius: radius.card, padding: spacing.lg, marginBottom: 16 },
  accentMark: { width: 30, height: 4, borderRadius: 2, backgroundColor: colors.orange, marginBottom: 14 }, heroTitle: { color: colors.text, fontSize: 21, fontWeight: '700' },
  form: { backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.lg, marginBottom: 24 },
  label: { color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: 12, marginTop: 12 }, fieldLabel: { color: colors.muted, fontSize: 14, fontWeight: '600', marginBottom: 6 },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.input, padding: 14, marginBottom: 14, fontSize: fontSize.body, color: colors.text },
  mainButton: { marginTop: spacing.sm },
  error: { color: colors.danger, marginBottom: 12 },
  secondaryButton: { marginBottom: 10 },
  hint: { color: colors.muted, marginVertical: 6, lineHeight: 20 }, word: { padding: 18, borderRadius: 18, backgroundColor: colors.surface, marginBottom: 10 },
  wordText: { fontSize: 17, color: colors.text, fontWeight: '600' }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, marginTop: 10 }, action: { color: colors.primaryDark, fontWeight: '600', paddingVertical: 8 },
});
