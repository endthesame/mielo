import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Button from '../components/Button';

export default function NotFound() {
  const router = useRouter();
  return <View style={{ padding: 24 }}><Text>Экран не найден.</Text><Button title="Мои колоды" variant="text" onPress={() => router.replace('/decks')} /></View>;
}
