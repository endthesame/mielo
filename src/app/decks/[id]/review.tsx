import { ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useIsFocused } from 'expo-router/react-navigation';
import { useDeck } from '../../../navigation/use-deck';
import ReviewScreen from '../../../review/ReviewScreen';
import { reviewRepository } from '../../../review/review-repository';
import Button from '../../../components/Button';

export default function ReviewRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const focused = useIsFocused();
  const { deck, loading, error } = useDeck(id);
  if (!focused) return null;
  if (!deck) return <View style={{ padding: 24 }}><Text>{loading ? 'Загружаем колоду…' : error ? 'Не удалось загрузить колоду.' : 'Колода не найдена.'}</Text>{!loading && <Button title="Мои колоды" variant="text" onPress={() => router.replace('/decks')} />}</View>;
  return <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive"><ReviewScreen deck={deck} repository={reviewRepository} onClose={() => router.canGoBack() ? router.back() : router.replace({ pathname: '/decks/[id]', params: { id: deck.id } })} /></ScrollView>;
}
