import { useCallback, useState } from 'react';
import { ScrollView } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import DecksScreen from '../../decks/DecksScreen';
import { deckRepository } from '../../database/deck-repository';
import Button from '../../components/Button';

export default function DecksRoute() {
  const router = useRouter();
  const [revision, setRevision] = useState(0);
  useFocusEffect(useCallback(() => { setRevision((value) => value + 1); }, []));
  return <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
    <Button title="Настройки" variant="text" onPress={() => router.push('/settings')} />
    <DecksScreen key={revision} repository={deckRepository} onOpenDeck={(deck) => router.push({ pathname: '/decks/[id]', params: { id: deck.id } })} />
  </ScrollView>;
}
