import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { Deck, DeckRepository } from './deck';

export default function DecksScreen({ repository, onOpenDeck }: { repository: DeckRepository; onOpenDeck: (deck: Deck) => void }) {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [dueCounts, setDueCounts] = useState<Record<string, number>>({});
  const [name, setName] = useState('');
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
      <Text style={styles.title}>Мои колоды</Text>
      <Text style={styles.label}>{editingId ? 'Переименовать колоду' : 'Новая колода'}</Text>
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
      {editingId && <Pressable onPress={() => { setEditingId(null); setName(''); setError(null); }} disabled={saving}><Text style={styles.hint}>Отменить</Text></Pressable>}
      {error && <Text style={styles.error}>{error}</Text>}
      {loading ? <Text style={styles.hint}>Загружаем колоды…</Text> : decks.length === 0 ? (
        <Text style={styles.hint}>Коллекция пока пуста.</Text>
      ) : decks.map((deck) => (
        <View key={deck.id}>
          <Pressable onPress={() => onOpenDeck(deck)} accessibilityRole="button"><Text style={styles.deck}>{deck.name} · {deck.targetLanguage === 'ko' ? 'корейский' : 'японский'} · к повторению: {dueCounts[deck.id] ?? 0} →</Text></Pressable>
          <View style={styles.actions}>
            <Pressable disabled={saving} onPress={() => { setEditingId(deck.id); setName(deck.name); setError(null); }}><Text>Переименовать</Text></Pressable>
            <Pressable disabled={saving} onPress={() => confirmRemove(deck)}><Text>Удалить</Text></Pressable>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 24 },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#aaa', borderRadius: 8, padding: 12, marginBottom: 20 },
  languages: { flexDirection: 'row', gap: 12 },
  language: { padding: 10, color: '#555' },
  selected: { fontWeight: '700', color: '#111', textDecorationLine: 'underline' },
  hint: { color: '#555', marginVertical: 12 },
  button: { backgroundColor: '#333', borderRadius: 8, padding: 14, alignItems: 'center', marginVertical: 12 },
  buttonText: { color: '#fff', fontWeight: '600' },
  error: { color: '#b00020', marginVertical: 8 },
  deck: { fontSize: 17, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#ddd' },
  actions: { flexDirection: 'row', gap: 24, paddingVertical: 10 },
});
