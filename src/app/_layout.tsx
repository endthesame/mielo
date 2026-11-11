import { Stack } from 'expo-router/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { colors } from '../theme';

export default function RootLayout() {
  return <GestureHandlerRootView style={{ flex: 1 }}><Stack screenOptions={{ headerTintColor: colors.primaryDark, contentStyle: { backgroundColor: colors.background } }}>
    <Stack.Screen name="index" options={{ headerShown: false }} />
    <Stack.Screen name="decks/index" options={{ title: 'Мои колоды' }} />
    <Stack.Screen name="decks/[id]/index" options={{ title: 'Колода' }} />
    <Stack.Screen name="decks/[id]/review" options={{ title: 'Повторение' }} />
    <Stack.Screen name="settings" options={{ title: 'Настройки' }} />
    <Stack.Screen name="debug/speech" options={{ title: 'Отладка' }} />
  </Stack></GestureHandlerRootView>;
}
