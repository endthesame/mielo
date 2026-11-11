import { useState } from 'react';
import { ScrollView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import SettingsScreen from '../settings/SettingsScreen';
import { usePreventRemove } from 'expo-router/react-navigation';

export default function SettingsRoute() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  usePreventRemove(busy, () => {});
  return <><Stack.Screen options={{ gestureEnabled: !busy, headerBackVisible: !busy }} /><ScrollView><SettingsScreen onBusyChange={setBusy} onOpenDebug={() => router.push('/debug/speech')} /></ScrollView></>;
}
