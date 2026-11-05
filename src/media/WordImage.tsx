import { colors } from '../theme';
import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { getImage, removeImage, replaceImage } from './media-store';

export default function WordImage({ wordId }: { wordId: string }) {
  const [uri, setUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    getImage(wordId).then((result) => { if (active) setUri(result); }).catch((err) => { console.error(err); if (active) setError('Не удалось загрузить изображение.'); });
    return () => { active = false; };
  }, [wordId]);
  async function choose() {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
      if (!result.canceled) setUri(await replaceImage(wordId, result.assets[0].uri, result.assets[0].mimeType));
    } catch (err) { console.error(err); setError('Не удалось сохранить изображение.'); }
    finally { setBusy(false); }
  }
  function confirmRemove() {
    Alert.alert('Удалить изображение?', '', [{ text: 'Отмена', style: 'cancel' }, { text: 'Удалить', style: 'destructive', onPress: async () => {
      setBusy(true);
      try { await removeImage(wordId); setUri(null); setError(''); }
      catch (err) { console.error(err); setError('Не удалось удалить изображение.'); }
      finally { setBusy(false); }
    } }]);
  }
  return <View style={styles.container}>
    {uri && <Image source={{ uri }} style={styles.image} resizeMode="contain" />}
    <Pressable disabled={busy} onPress={choose}><Text style={styles.link}>{uri ? 'Заменить изображение' : 'Добавить изображение'}</Text></Pressable>
    {uri && <Pressable disabled={busy} onPress={confirmRemove}><Text style={styles.link}>Удалить изображение</Text></Pressable>}
    {error ? <Text style={styles.error}>{error}</Text> : null}
  </View>;
}
const styles = StyleSheet.create({ container: { marginVertical: 8 }, image: { width: 160, height: 120 }, link: { color: colors.primaryDark, paddingVertical: 8 }, error: { color: colors.danger } });
