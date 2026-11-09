import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { Deck, DeckRepository } from './deck';
import { colors, spacing, radius, fontSize } from '../theme';
import Button from '../components/Button';
import { Host, Icon, Picker } from '@expo/ui';
import { languageName, languages, normalizeLanguageCode } from '../languages/languages';

export default function DecksScreen({ repository, onOpenDeck }: { repository: DeckRepository; onOpenDeck: (deck: Deck) => void }) {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [dueCounts, setDueCounts] = useState<Record<string, number>>({});
  const [wordCounts, setWordCounts] = useState<Record<string, number>>({});
  const [name, setName] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [language, setLanguage] = useState('ko');
  const [customLanguage, setCustomLanguage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savingRef = useRef(false);

  useEffect(() => {
    let active = true;
    repository.list().then(async (items) => {
      const now = new Date();
      const counts = await Promise.all(items.map(async (deck) => {
        const [due, words] = await Promise.all([repository.countDue(deck.id, now), repository.countWords(deck.id)]);
        return { id: deck.id, due, words };
      }));
      if (active) {
        setDecks(items);
        setDueCounts(Object.fromEntries(counts.map(({ id, due }) => [id, due])));
        setWordCounts(Object.fromEntries(counts.map(({ id, words }) => [id, words])));
      }
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
    const targetLanguage = language === 'other' ? normalizeLanguageCode(customLanguage) : language;
    if (!editingId && !targetLanguage) {
      setError('Введите код языка из двух или трёх латинских букв.');
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      const deck = editingId ? await repository.rename(editingId, name) : await repository.create({ name, targetLanguage: targetLanguage!, translationLanguage: 'ru' });
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
      <Text style={styles.title}>Мои колоды</Text>
      <Text style={styles.intro}>Слова, к которым хочется возвращаться.</Text>
      {!formOpen && <Button title="＋  Создать колоду" onPress={() => setFormOpen(true)} style={styles.createButton} />}
      {formOpen && <View style={styles.form}><Text style={styles.label}>{editingId ? 'Переименовать колоду' : 'Новая колода'}</Text>
      <TextInput style={styles.input} placeholder="Название колоды" value={name} onChangeText={setName} editable={!saving} />
      {!editingId && <><Text style={styles.label}>Язык изучения</Text>
      <View style={styles.picker}><Host matchContents colorScheme="light"><Picker selectedValue={language} onValueChange={setLanguage} enabled={!saving}>
        {languages.map((item) => <Picker.Item key={item.code} label={item.name} value={item.code} />)}
        <Picker.Item label="Другой язык (указать код)" value="other" />
      </Picker></Host></View>
      {language === 'other' && <><Text style={styles.label}>Код языка</Text><Text style={styles.hint}>Введите двухбуквенный код ISO 639-1, а если его нет — трёхбуквенный код ISO 639-3.</Text><TextInput style={styles.input} value={customLanguage} onChangeText={setCustomLanguage} autoCapitalize="none" autoCorrect={false} placeholder="Например, sco" maxLength={3} editable={!saving} /></>}
      <Text style={styles.hint}>Язык перевода: русский</Text></>}
      <Button title={saving ? 'Сохраняем…' : editingId ? 'Сохранить название' : 'Создать колоду'} onPress={createDeck} disabled={loading} busy={saving} style={styles.createButton} />
      <Pressable style={({ pressed }) => ({ opacity: saving ? 0.45 : pressed ? 0.7 : 1, minHeight: 44, justifyContent: 'center' })} accessibilityRole="button" onPress={() => { setEditingId(null); setName(''); setError(null); setFormOpen(false); }} disabled={saving}><Text style={styles.link}>Отменить</Text></Pressable></View>}
      {error && <Text style={styles.error}>{error}</Text>}
      {loading ? <Text style={styles.hint}>Загружаем колоды…</Text> : decks.length === 0 ? (
        <View style={styles.empty}><View style={styles.emptyMark}><Host matchContents pointerEvents="none"><Icon name="rectangle.stack" color={colors.primaryDark} size={27} /></Host></View><Text style={styles.emptyTitle}>Здесь появятся ваши колоды</Text><Text style={styles.hint}>Создайте первую и добавьте слова для изучения.</Text></View>
      ) : !formOpen && decks.map((deck) => (
        <View key={deck.id} style={styles.deckCard}>
          <Pressable style={({ pressed }) => pressed && styles.pressed} onPress={() => onOpenDeck(deck)} accessibilityRole="button" accessibilityLabel={`Открыть колоду ${deck.name}. Всего слов: ${wordCounts[deck.id] ?? 0}. К повторению: ${dueCounts[deck.id] ?? 0}`}>
            <View style={styles.deckHeader}><View style={styles.deckMark}><Host matchContents pointerEvents="none"><Icon name="rectangle.stack" size={19} color={colors.primaryDark} /></Host></View><Text style={styles.deckLanguage}>{languageName(deck.targetLanguage).toLocaleUpperCase()}</Text></View>
            <Text style={styles.deck}>{deck.name}</Text>
            <View style={styles.stats}>
              <Text style={styles.dueText}>Всего слов: {wordCounts[deck.id] ?? 0}</Text>
              <View style={styles.dueRow}><View style={styles.dueDot} /><Text style={styles.dueText}>К повторению: {dueCounts[deck.id] ?? 0}</Text></View>
            </View>
          </Pressable>
          <View style={styles.actions}>
            <Pressable style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={`Переименовать колоду ${deck.name}`} disabled={saving} onPress={() => { setEditingId(deck.id); setFormOpen(true); setName(deck.name); setError(null); }}><Host matchContents pointerEvents="none"><Icon name="pencil" size={18} color={colors.muted} /></Host></Pressable>
            <Pressable style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={`Удалить колоду ${deck.name}`} disabled={saving} onPress={() => confirmRemove(deck)}><Host matchContents pointerEvents="none"><Icon name="trash" size={18} color={colors.muted} /></Host></Pressable>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.screen },
  title: { color: colors.text, fontSize: 34, fontWeight: '800', marginTop: 8 }, intro: { color: colors.muted, fontSize: 16, marginTop: 8, marginBottom: 24 },
  form: { backgroundColor: colors.surface, padding: 20, borderRadius: 20, marginBottom: 20 },
  label: { color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 8 },
  input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: radius.input, padding: 14, marginBottom: 20, fontSize: fontSize.body, color: colors.text },
  picker: { backgroundColor: colors.background, borderRadius: 14, padding: 8 },
  hint: { color: colors.muted, marginVertical: 8, fontSize: 14 },
  createButton: { marginBottom: spacing.lg }, error: { color: colors.danger, marginVertical: 8 },
  deckCard: { backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.lg, marginBottom: 12, borderBottomWidth: 3, borderBottomColor: colors.border },
  deckHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingRight: 96 }, deckMark: { backgroundColor: colors.softBlue, width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  deckLanguage: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1, flexShrink: 1 }, deck: { color: colors.text, fontSize: 21, fontWeight: '700', marginTop: 14 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 20, rowGap: 8, marginTop: 10 },
  dueRow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, dueDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.orange }, dueText: { color: colors.muted, fontSize: 14 },
  actions: { position: 'absolute', right: 12, top: 12, flexDirection: 'row' }, iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, pressed: { opacity: 0.55 }, link: { color: colors.primaryDark, paddingVertical: 10, fontWeight: '600' },
  empty: { backgroundColor: colors.surface, borderRadius: 20, padding: 24, marginTop: 8 }, emptyMark: { width: 52, height: 52, backgroundColor: colors.peach, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 16 }, emptyTitle: { color: colors.text, fontWeight: '700', fontSize: 19 },
});
