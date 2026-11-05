import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { Deck, DeckRepository } from './deck';
import { colors } from '../theme';

export default function DecksScreen({ repository, onOpenDeck }: { repository: DeckRepository; onOpenDeck: (deck: Deck) => void }) {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [dueCounts, setDueCounts] = useState<Record<string, number>>({});
  const [name, setName] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [language, setLanguage] = useState<'ko' | 'ja'>('ko');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savingRef = useRef(false);

  useEffect(() => {
    let active = true;
    repository.list().then(async (items) => {
      const counts = await Promise.all(items.map(async (deck) => [deck.id, await repository.countDue(deck.id, new Date())] as const));
      if (active) { setDecks(items); setDueCounts(Object.fromEntries(counts)); }
    }).catch((err) => {
      console.error('Failed to load decks:', err);
      if (active) setError('Не удалось открыть колоды. Перезапустите приложение.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [repository]);

  async function createDeck() {
    if (savingRef.current || loading) return;
    if (!name.trim()) {
      setError('Введите название колоды.');
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      const deck = editingId ? await repository.rename(editingId, name) : await repository.create({ name, targetLanguage: language, translationLanguage: 'ru' });
      setDecks((current) => editingId ? current.map((previous) => previous.id === deck.id ? deck : previous) : [...current, deck]);
      setName('');
      setEditingId(null);
      setFormOpen(false);
    } catch (err) {
      console.error('Failed to create deck:', err);
      setError('Не удалось сохранить колоду. Попробуйте ещё раз.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  function confirmRemove(deck: Deck) {
    Alert.alert('Удалить колоду?', `«${deck.name}» и все её слова будут удалены.`, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: async () => {
        if (savingRef.current) return;
        savingRef.current = true; setSaving(true);
        try {
          await repository.remove(deck.id);
          setDecks((current) => current.filter((item) => item.id !== deck.id));
          if (editingId === deck.id) { setEditingId(null); setName(''); }
          setError(null);
        } catch (err) { console.error('Failed to remove deck:', err); setError('Не удалось удалить колоду.'); }
        finally { savingRef.current = false; setSaving(false); }
      } },
    ]);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>ВАША КОЛЛЕКЦИЯ</Text>
      <Text style={styles.title}>Мои колоды</Text>
      <Text style={styles.intro}>Слова, к которым хочется возвращаться.</Text>
      {!formOpen && <Pressable style={styles.button} onPress={() => setFormOpen(true)} accessibilityRole="button"><Text style={styles.buttonText}>＋  Создать колоду</Text></Pressable>}
      {formOpen && <View style={styles.form}><Text style={styles.label}>{editingId ? 'Переименовать колоду' : 'Новая колода'}</Text>
      <TextInput style={styles.input} placeholder="Название колоды" value={name} onChangeText={setName} editable={!saving} />
      {!editingId && <><Text style={styles.label}>Язык изучения</Text>
      <View style={styles.languages}>
        {(['ko', 'ja'] as const).map((item) => (
          <Pressable key={item} onPress={() => setLanguage(item)} disabled={saving} accessibilityRole="button" accessibilityState={{ selected: language === item }}>
            <Text style={[styles.language, language === item && styles.selected]}>{item === 'ko' ? 'Корейский' : 'Японский'}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.hint}>Язык перевода: русский</Text></>}
      <Pressable style={styles.button} onPress={createDeck} disabled={saving || loading} accessibilityRole="button">
        <Text style={styles.buttonText}>{saving ? 'Сохраняем…' : editingId ? 'Сохранить название' : 'Создать колоду'}</Text>
      </Pressable>
      <Pressable onPress={() => { setEditingId(null); setName(''); setError(null); setFormOpen(false); }} disabled={saving}><Text style={styles.link}>Отменить</Text></Pressable></View>}
      {error && <Text style={styles.error}>{error}</Text>}
      {loading ? <Text style={styles.hint}>Загружаем колоды…</Text> : decks.length === 0 ? (
        <View style={styles.empty}><Text style={styles.emptyIcon}>▤</Text><Text style={styles.emptyTitle}>Здесь появятся ваши колоды</Text><Text style={styles.hint}>Создайте первую и добавьте слова для изучения.</Text></View>
      ) : decks.map((deck) => (
        <View key={deck.id} style={styles.deckCard}>
          <Pressable onPress={() => onOpenDeck(deck)} accessibilityRole="button"><Text style={styles.deckLanguage}>{deck.targetLanguage === 'ko' ? 'КОРЕЙСКИЙ' : 'ЯПОНСКИЙ'}</Text><Text style={styles.deck}>{deck.name}  →</Text><Text style={styles.hint}>К повторению: {dueCounts[deck.id] ?? 0}</Text></Pressable>
          <View style={styles.actions}>
            <Pressable disabled={saving} onPress={() => { setEditingId(deck.id); setFormOpen(true); setName(deck.name); setError(null); }}><Text style={styles.link}>Переименовать</Text></Pressable>
            <Pressable disabled={saving} onPress={() => confirmRemove(deck)}><Text style={styles.link}>Удалить</Text></Pressable>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24 }, eyebrow: { color: colors.primaryDark, fontWeight: '700', fontSize: 11, letterSpacing: 1.3 },
  title: { color: colors.text, fontSize: 34, fontWeight: '800', marginTop: 8 }, intro: { color: colors.muted, fontSize: 16, marginTop: 8, marginBottom: 24 },
  form: { backgroundColor: colors.surface, padding: 20, borderRadius: 20, marginBottom: 20 },
  label: { color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 8 },
  input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 14, marginBottom: 20, fontSize: 16, color: colors.text },
  languages: { flexDirection: 'row', gap: 12 }, language: { padding: 12, color: colors.muted, backgroundColor: colors.background, borderRadius: 12 },
  selected: { fontWeight: '700', color: colors.primaryDark, backgroundColor: colors.softBlue },
  hint: { color: colors.muted, marginVertical: 8, fontSize: 14 },
  button: { backgroundColor: colors.primary, borderBottomColor: colors.primaryDark, borderBottomWidth: 4, borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 20 },
  buttonText: { color: colors.surface, fontWeight: '700', fontSize: 16 }, error: { color: colors.danger, marginVertical: 8 },
  deckCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 20, marginBottom: 12, borderBottomWidth: 3, borderBottomColor: colors.border },
  deckLanguage: { color: colors.primaryDark, fontSize: 11, fontWeight: '700', letterSpacing: 1 }, deck: { color: colors.text, fontSize: 21, fontWeight: '700', marginTop: 10 },
  actions: { flexDirection: 'row', gap: 24 }, link: { color: colors.primaryDark, paddingVertical: 10, fontWeight: '600' },
  empty: { backgroundColor: colors.surface, borderRadius: 20, padding: 24, marginTop: 8 }, emptyIcon: { color: colors.primary, fontSize: 40, marginBottom: 8 }, emptyTitle: { color: colors.text, fontWeight: '700', fontSize: 19 },
});
