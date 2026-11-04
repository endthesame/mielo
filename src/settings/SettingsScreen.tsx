import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { deleteWhisperModel, isWhisperModelDownloaded, prepareWhisperModel } from '../speech/whisper-engine';
import { getVoiceEnabled, setVoiceEnabled } from './settings-repository';


export default function SettingsScreen({ onBusyChange }: { onBusyChange: (busy: boolean) => void }) {
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
    <View style={styles.row}><Text>Голосовой ответ</Text><Switch value={enabled} onValueChange={changeVoice} disabled={busy} /></View>
    <Text style={styles.heading}>Whisper Tiny Multilingual</Text>
    <Text>{downloaded ? 'Модель загружена (около 75 МБ).' : 'Модель ещё не загружена (около 75 МБ).'}</Text>
    <Pressable onPress={loadModel} disabled={busy}><Text style={styles.link}>{downloaded ? 'Проверить модель' : 'Загрузить модель'}</Text></Pressable>
    {downloaded && <Pressable onPress={confirmDelete} disabled={busy}><Text style={styles.link}>Удалить модель</Text></Pressable>}
    {message ? <Text style={styles.message}>{message}</Text> : null}
  </View>;
}
const styles = StyleSheet.create({ container: { padding: 24 }, title: { fontSize: 28, fontWeight: '700', marginBottom: 24 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, heading: { fontSize: 18, fontWeight: '600', marginTop: 24, marginBottom: 8 },
  link: { color: '#315bb2', paddingVertical: 12 }, message: { color: '#555', marginVertical: 8 } });
