import { colors } from '../theme';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { examplesRepository, type Example } from '../database/examples-repository';

export type ExampleDraft = { text: string; translation: string };

export default function Examples({ wordId, draft, revision, onDraftChange, onSaved, onChanged }: { wordId: string; draft: ExampleDraft; revision: number; onDraftChange: (draft: ExampleDraft) => void; onSaved: (saved: ExampleDraft) => void; onChanged: () => void }) {
  const [examples, setExamples] = useState<Example[]>([]);
  const { text, translation } = draft;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    void examplesRepository.list(wordId)
      .then((items) => { if (active) setExamples(items); })
      .catch((err) => { console.error(err); if (active) setError('Не удалось загрузить примеры.'); });
    return () => { active = false; };
  }, [wordId, revision]);
  async function add() {
    if (busy) return;
    if (!text.trim()) { setError('Введите текст примера.'); return; }
    setBusy(true); setError('');
    try {
      const example = await examplesRepository.create(wordId, text, translation);
      setExamples((items) => [...items, example]); onSaved({ text, translation });
    } catch (err) { console.error(err); setError('Не удалось сохранить пример.'); }
    finally { setBusy(false); }
  }
  function remove(example: Example) {
    Alert.alert('Удалить пример?', example.text, [{ text: 'Отмена', style: 'cancel' }, { text: 'Удалить', style: 'destructive', onPress: async () => {
      if (busy) return;
      setBusy(true);
      try { await examplesRepository.remove(wordId, example.id); setExamples((items) => items.filter((item) => item.id !== example.id)); onChanged(); }
      catch (err) { console.error(err); setError('Не удалось удалить пример.'); }
      finally { setBusy(false); }
    } }]);
  }
  return <View style={styles.container}>
    <Text style={styles.heading}>Примеры</Text>
    {examples.map((example) => <View key={example.id} style={styles.example}>
      <Text>{example.text}</Text>{example.translation && <Text style={styles.hint}>{example.translation}</Text>}
      <Pressable style={({ pressed }) => ({ opacity: busy ? 0.45 : pressed ? 0.7 : 1, minHeight: 44, justifyContent: 'center' })} accessibilityRole="button" onPress={() => remove(example)} disabled={busy}><Text style={styles.link}>Удалить пример</Text></Pressable>
    </View>)}
    <TextInput style={styles.input} placeholder="Пример употребления" value={text} onChangeText={(value) => onDraftChange({ ...draft, text: value })} editable={!busy} />
    <TextInput style={styles.input} placeholder="Перевод примера (необязательно)" value={translation} onChangeText={(value) => onDraftChange({ ...draft, translation: value })} editable={!busy} />
    <Pressable style={({ pressed }) => ({ opacity: busy ? 0.45 : pressed ? 0.7 : 1, minHeight: 44, justifyContent: 'center' })} accessibilityRole="button" onPress={add} disabled={busy}><Text style={styles.link}>Добавить пример</Text></Pressable>
    {error ? <Text style={styles.error}>{error}</Text> : null}
  </View>;
}
const styles = StyleSheet.create({ container: { padding: 12, backgroundColor: colors.background, marginTop: 8 }, heading: { fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 10, marginVertical: 4 },
  example: { marginVertical: 6 }, hint: { color: colors.muted }, link: { color: colors.primaryDark, paddingVertical: 8 }, error: { color: colors.danger } });
