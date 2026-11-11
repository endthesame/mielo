import { Stack } from 'expo-router/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { colors } from '../theme';
import { useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { getDatabase } from '../database/database';

void SplashScreen.preventAutoHideAsync().catch((error) => console.warn('Не удалось удержать заставку:', error));

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    getDatabase().catch((error) => console.error('Не удалось подготовить базу:', error)).finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);
  if (!ready) return null;
  return <GestureHandlerRootView style={{ flex: 1 }} onLayout={() => { void SplashScreen.hideAsync().catch((error) => console.warn('Не удалось скрыть заставку:', error)); }}><Stack screenOptions={{ headerTintColor: colors.primaryDark, contentStyle: { backgroundColor: colors.background } }}>
    <Stack.Screen name="index" options={{ headerShown: false }} />
    <Stack.Screen name="decks/index" options={{ title: 'Мои колоды' }} />
    <Stack.Screen name="decks/[id]/index" options={{ title: 'Колода' }} />
    <Stack.Screen name="decks/[id]/review" options={{ title: 'Повторение' }} />
    <Stack.Screen name="settings" options={{ title: 'Настройки' }} />
    <Stack.Screen name="debug/speech" options={{ title: 'Отладка' }} />
  </Stack></GestureHandlerRootView>;
}
