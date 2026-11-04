import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { examplesRepository, type Example } from '../database/examples-repository';

export default function Examples({ wordId }: { wordId: string }) {
  const [examples, setExamples] = useState<Example[]>([]);
  const [text, setText] = useState('');
  const [translation, setTranslation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    void examplesRepository.list(wordId)
      .then((items) => { if (active) setExamples(items); })
      .catch((err) => { console.error(err); if (active) setError('Не удалось загрузить примеры.'); });
    return () => { active = false; };
  }, [wordId]);
  async function add() {
    if (busy) return;
    if (!text.trim()) { setError('Введите текст примера.'); return; }
    setBusy(true); setError('');
    try {
      const example = await examplesRepository.create(wordId, text, translation);
      setExamples((items) => [...items, example]); setText(''); setTranslation('');
    } catch (err) { console.error(err); setError('Не удалось сохранить пример.'); }
    finally { setBusy(false); }
  }
  function remove(example: Example) {
    Alert.alert('Удалить пример?', example.text, [{ text: 'Отмена', style: 'cancel' }, { text: 'Удалить', style: 'destructive', onPress: async () => {
      if (busy) return;
      setBusy(true);
      try { await examplesRepository.remove(wordId, example.id); setExamples((items) => items.filter((item) => item.id !== example.id)); }
      catch (err) { console.error(err); setError('Не удалось удалить пример.'); }
      finally { setBusy(false); }
    } }]);
  }
  return <View style={styles.container}>
    <Text style={styles.heading}>Примеры</Text>
    {examples.map((example) => <View key={example.id} style={styles.example}>
      <Text>{example.text}</Text>{example.translation && <Text style={styles.hint}>{example.translation}</Text>}
      <Pressable onPress={() => remove(example)} disabled={busy}><Text style={styles.link}>Удалить пример</Text></Pressable>
    </View>)}
    <TextInput style={styles.input} placeholder="Пример употребления" value={text} onChangeText={setText} editable={!busy} />
    <TextInput style={styles.input} placeholder="Перевод примера (необязательно)" value={translation} onChangeText={setTranslation} editable={!busy} />
    <Pressable onPress={add} disabled={busy}><Text style={styles.link}>Добавить пример</Text></Pressable>
    {error ? <Text style={styles.error}>{error}</Text> : null}
  </View>;
}
const styles = StyleSheet.create({ container: { padding: 12, backgroundColor: '#f5f5f5', marginTop: 8 }, heading: { fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#aaa', borderRadius: 8, padding: 10, marginVertical: 4 },
  example: { marginVertical: 6 }, hint: { color: '#555' }, link: { color: '#315bb2', paddingVertical: 8 }, error: { color: '#b00020' } });
