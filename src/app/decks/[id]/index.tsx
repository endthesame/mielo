import { Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDeck } from '../../../navigation/use-deck';
import VocabularyScreen from '../../../vocabulary/VocabularyScreen';
import { vocabularyRepository } from '../../../database/vocabulary-repository';
import Button from '../../../components/Button';

export default function DeckRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { deck, loading, error } = useDeck(id);
  if (!deck) return <View style={{ padding: 24 }}><Text>{loading ? 'Загружаем колоду…' : error ? 'Не удалось загрузить колоду.' : 'Колода не найдена.'}</Text>{!loading && <Button title="Мои колоды" variant="text" onPress={() => router.replace('/decks')} />}</View>;
  return <VocabularyScreen deck={deck} repository={vocabularyRepository} onReview={() => router.push({ pathname: '/decks/[id]/review', params: { id: deck.id } })} />;
}
