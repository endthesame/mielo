import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { deleteWhisperModel, isWhisperModelDownloaded, prepareWhisperModel } from '../speech/whisper-engine';
import { Host, Switch } from '@expo/ui';
import { colors } from '../theme';
import { getVoiceEnabled, setVoiceEnabled } from './settings-repository';


export default function SettingsScreen({ onBusyChange, onOpenDebug }: { onBusyChange: (busy: boolean) => void; onOpenDebug: () => void }) {
  const [enabled, setEnabled] = useState(true);
  const [downloaded, setDownloaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    let active = true;
    getVoiceEnabled().then((value) => { if (active) setEnabled(value); }).catch((err) => { console.error(err); if (active) setMessage('Не удалось загрузить настройки.'); });
    setDownloaded(isWhisperModelDownloaded());
    return () => { active = false; };
  }, []);
  async function changeVoice(value: boolean) {
    setBusy(true); onBusyChange(true);
    try { await setVoiceEnabled(value); setEnabled(value); setMessage(''); }
    catch (err) { console.error(err); setMessage('Не удалось сохранить настройку.'); }
    finally { setBusy(false); onBusyChange(false); }
  }
  async function loadModel() {
    setBusy(true); onBusyChange(true);
    try { await prepareWhisperModel(setMessage); setDownloaded(true); setMessage('Модель готова.'); }
    catch (err) { console.error(err); setMessage('Не удалось загрузить модель. Проверьте подключение и повторите попытку.'); }
    finally { setBusy(false); onBusyChange(false); }
  }
  function confirmDelete() {
    Alert.alert('Удалить модель?', 'Для голосового распознавания её потребуется загрузить снова.', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: () => {
        try { deleteWhisperModel(); setDownloaded(false); setMessage('Модель удалена.'); }
        catch (err) { console.error(err); setMessage('Не удалось удалить модель.'); }
      } },
    ]);
  }
  return <View style={styles.container}>
    <Text style={styles.title}>Настройки</Text>
    <View style={styles.row}><Host matchContents seedColor={colors.primary} colorScheme="light"><Switch label="Голосовой ответ" value={enabled} onValueChange={changeVoice} disabled={busy} /></Host></View>
    <Text style={styles.heading}>Whisper Tiny Multilingual</Text>
    <Text>{downloaded ? 'Модель загружена (около 75 МБ).' : 'Модель ещё не загружена (около 75 МБ).'}</Text>
    <Pressable onPress={loadModel} disabled={busy}><Text style={styles.link}>{downloaded ? 'Проверить модель' : 'Загрузить модель'}</Text></Pressable>
    {downloaded && <Pressable onPress={confirmDelete} disabled={busy}><Text style={styles.link}>Удалить модель</Text></Pressable>}
    {message ? <Text style={styles.message}>{message}</Text> : null}
    {__DEV__ && <Pressable onPress={onOpenDebug} disabled={busy}><Text style={styles.link}>Проверка распознавания →</Text></Pressable>}
  </View>;
}
const styles = StyleSheet.create({ container: { padding: 24 }, title: { color: colors.text, fontSize: 32, fontWeight: '800', marginBottom: 24 },
  row: { padding: 16, backgroundColor: colors.surface, borderRadius: 18 }, heading: { color: colors.text, fontSize: 20, fontWeight: '700', marginTop: 28, marginBottom: 10 },
  link: { color: colors.primaryDark, fontWeight: '600', paddingVertical: 14 }, message: { color: colors.muted, marginVertical: 8 } });
