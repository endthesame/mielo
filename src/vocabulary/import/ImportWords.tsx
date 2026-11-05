import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { File } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { Buffer } from 'buffer';
import type { VocabularyRepository } from '../vocabulary';
import { colors } from '../../theme';
import { MAX_IMPORT_BYTES, parseImport, type ImportDelimiter, type ImportPreview } from './parse-import';

type Props = {
  deckId: string;
  existingWords: string[];
  repository: VocabularyRepository;
  onComplete: () => Promise<void>;
  onClose: () => void;
};

const delimiters: { value: ImportDelimiter; label: string }[] = [
  { value: ';', label: 'Точка с запятой' },
  { value: ',', label: 'Запятая' },
  { value: '\t', label: 'Табуляция' },
];

export default function ImportWords({ deckId, existingWords, repository, onComplete, onClose }: Props) {
  const [text, setText] = useState('');
  const [delimiter, setDelimiter] = useState<ImportDelimiter>(';');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState(false);
  const locked = useRef(false);

  async function chooseFile() {
    if (locked.current) return;
    locked.current = true; setBusy(true); setMessage(''); setPreview(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!/\.(csv|txt|tsv)$/i.test(asset.name)) throw new Error('Выберите файл CSV, TXT или TSV.');
      if (asset.size != null && asset.size > MAX_IMPORT_BYTES) throw new Error('Файл больше 5 МиБ.');
      const file = new File(asset.uri);
      if (!file.exists || file.size == null) throw new Error('Не удалось прочитать файл.');
      if (file.size > MAX_IMPORT_BYTES) throw new Error('Файл больше 5 МиБ.');
      const value = await file.text();
      if (value.includes('\uFFFD')) throw new Error('Файл должен быть в кодировке UTF-8.');
      setText(value);
      setCompleted(false);
      setMessage(`Файл «${asset.name}» загружен. Проверьте разделитель.`);
    } catch (error) {
      console.error('Failed to read import file:', error);
      setMessage(error instanceof Error ? error.message : 'Не удалось открыть файл.');
    } finally { locked.current = false; setBusy(false); }
  }

  function check() {
    if (locked.current) return;
    try {
      const result = parseImport(text, delimiter, existingWords);
      setPreview(result); setMessage('');
    } catch (error) {
      setPreview(null);
      setMessage(error instanceof Error ? error.message : 'Не удалось разобрать текст.');
    }
  }

  async function apply() {
    if (locked.current || !preview || preview.errors.length > 0 || preview.rows.length === 0) return;
    locked.current = true; setBusy(true); setMessage('Добавляем слова…');
    try {
      const result = await repository.importBatch(deckId, preview.rows);
      setPreview(null); setText(''); setCompleted(true);
      setMessage(`Добавлено: ${result.added}. Пропущено дубликатов: ${preview.duplicateCount + result.skipped}.`);
      try { await onComplete(); }
      catch (error) { console.error('Failed to refresh vocabulary:', error); setMessage(`Добавлено: ${result.added}. Не удалось обновить список — откройте колоду заново.`); }
    } catch (error) {
      console.error('Failed to import words:', error);
      setMessage('Не удалось сохранить импорт. Изменения не применены.');
    } finally { locked.current = false; setBusy(false); }
  }

  return <View style={styles.container}>
    <Pressable onPress={onClose} disabled={busy} accessibilityRole="button"><Text style={styles.link}>← Вернуться к колоде</Text></Pressable>
    <Text style={styles.title}>Массовое добавление</Text>
    <Text style={styles.hint}>Формат без заголовка: слово; перевод; чтение; комментарий. Первые два поля обязательны. Не более 5000 записей и 5 МиБ, UTF-8.</Text>
    <Text style={styles.example}>食べる;есть;たべる;о приёме пищи{'\n'}猫;кошка;ねこ;</Text>
    <Pressable onPress={chooseFile} disabled={busy} accessibilityRole="button"><Text style={styles.link}>Выбрать CSV, TXT или TSV</Text></Pressable>
    <Text style={styles.label}>Разделитель</Text>
    <View style={styles.delimiters}>{delimiters.map((item) => <Pressable key={item.value} disabled={busy} accessibilityRole="button"
      accessibilityState={{ selected: delimiter === item.value }} onPress={() => { setDelimiter(item.value); setPreview(null); setMessage(''); }}>
      <Text style={[styles.choice, delimiter === item.value && styles.selected]}>{item.label}</Text>
    </Pressable>)}</View>
    <Text style={styles.label}>Текст для импорта</Text><TextInput style={styles.input} multiline textAlignVertical="top" placeholder="Вставьте текст здесь" value={text} editable={!busy}
      onChangeText={(value) => {
        setPreview(null); setCompleted(false);
        if (Buffer.byteLength(value, 'utf8') > MAX_IMPORT_BYTES) { setMessage('Текст больше 5 МиБ.'); return; }
        setText(value); setMessage('');
      }} />
    <Pressable style={styles.button} onPress={check} disabled={busy || completed} accessibilityRole="button"><Text style={styles.buttonText}>Проверить</Text></Pressable>
    {message ? <Text style={styles.message} accessibilityLiveRegion="polite">{message}</Text> : null}
    {preview && <View>
      <Text style={styles.label}>Проверено записей: {preview.totalRows}</Text>
      <Text>К добавлению: {preview.rows.length} · Дубликаты: {preview.duplicateCount} · Ошибки: {preview.errors.length}</Text>
      <Text style={styles.hint}>Дубликаты по написанию в этой колоде и в тексте пропускаются.</Text>
      {preview.duplicates.slice(0, 5).map((duplicate) => <Text key={`duplicate-${duplicate.line}`} style={styles.hint}>Дубликат, строка {duplicate.line}: {duplicate.text}</Text>)}
      {preview.duplicates.length > 5 && <Text style={styles.hint}>Показаны первые 5 из {preview.duplicates.length} дубликатов.</Text>}
      {preview.errors.slice(0, 20).map((error, index) => <Text key={`${error.line}-${index}`} style={styles.error}>Строка {error.line}: {error.message}</Text>)}
      {preview.errors.length > 20 && <Text style={styles.error}>Показаны первые 20 ошибок из {preview.errors.length}.</Text>}
      {preview.rows.slice(0, 5).map((row) => <Text key={row.line} style={styles.example}>Строка {row.line}: {row.text} — {row.translation}{row.reading ? ` (${row.reading})` : ''}</Text>)}
      {preview.rows.length > 5 && <Text style={styles.hint}>Показаны первые 5 из {preview.rows.length} записей.</Text>}
      {preview.errors.length > 0 && <Text style={styles.error}>Исправьте все ошибки и проверьте текст ещё раз.</Text>}
      <Pressable style={styles.button} onPress={apply} disabled={busy || preview.errors.length > 0 || preview.rows.length === 0} accessibilityRole="button"
        accessibilityState={{ disabled: busy || preview.errors.length > 0 || preview.rows.length === 0 }}>
        <Text style={styles.buttonText}>{busy ? 'Добавляем…' : 'Добавить в колоду'}</Text>
      </Pressable>
    </View>}
  </View>;
}
const styles = StyleSheet.create({
  container: { padding: 24 }, title: { color: colors.text, fontSize: 30, fontWeight: '800', marginVertical: 18 },
  label: { color: colors.text, fontSize: 16, fontWeight: '700', marginVertical: 10 }, hint: { color: colors.muted, marginVertical: 8, lineHeight: 21 },
  link: { color: colors.primaryDark, fontWeight: '700', paddingVertical: 14 }, example: { marginVertical: 4, color: colors.muted },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 14, minHeight: 140, marginVertical: 12, fontSize: 16 },
  delimiters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, choice: { paddingVertical: 12, paddingHorizontal: 12, color: colors.muted, backgroundColor: colors.surface, borderRadius: 12 },
  selected: { fontWeight: '700', color: colors.primaryDark, backgroundColor: colors.softBlue },
  button: { backgroundColor: colors.primary, borderBottomWidth: 4, borderBottomColor: colors.primaryDark, borderRadius: 16, padding: 16, alignItems: 'center', marginVertical: 12 },
  buttonText: { color: colors.surface, fontWeight: '700', fontSize: 16 }, message: { color: colors.muted, marginVertical: 10 }, error: { color: colors.danger, marginVertical: 4 },
});
