import { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, Pressable } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { deckRepository } from './src/database/deck-repository';
import DecksScreen from './src/decks/DecksScreen';
import SpeechScreen from './src/SpeechScreen';
import { vocabularyRepository } from './src/database/vocabulary-repository';
import type { Deck } from './src/decks/deck';
import VocabularyScreen from './src/vocabulary/VocabularyScreen';
import ReviewScreen from './src/review/ReviewScreen';
import { reviewRepository } from './src/review/review-repository';
import SettingsScreen from './src/settings/SettingsScreen';

export default function App() {
  const [screen, setScreen] = useState<'decks' | 'speech' | 'settings'>('decks');
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [settingsBusy, setSettingsBusy] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <Pressable style={styles.switch} disabled={settingsBusy} onPress={() => {
        if (reviewing) setReviewing(false);
        else if (selectedDeck) setSelectedDeck(null);
        else setScreen(screen === 'decks' ? 'speech' : 'decks');
      }}>
        <Text>{screen !== 'decks' || selectedDeck ? '← Мои колоды' : 'Проверить распознавание →'}</Text>
      </Pressable>
      {screen === 'decks' && !selectedDeck && <Pressable style={styles.switch} onPress={() => setScreen('settings')}><Text>Настройки</Text></Pressable>}
      {screen === 'decks' ? (
        <ScrollView keyboardShouldPersistTaps="handled">
          {selectedDeck ? reviewing ? <ReviewScreen deck={selectedDeck} repository={reviewRepository} onClose={() => setReviewing(false)} /> :
            <VocabularyScreen key={selectedDeck.id} deck={selectedDeck} repository={vocabularyRepository} onReview={() => setReviewing(true)} /> :
            <DecksScreen repository={deckRepository} onOpenDeck={setSelectedDeck} />}
        </ScrollView>
      ) : screen === 'speech' ? <SpeechScreen /> : <ScrollView><SettingsScreen onBusyChange={setSettingsBusy} /></ScrollView>}
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  switch: { alignSelf: 'flex-end', padding: 16 },
});
