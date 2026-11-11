import { SafeAreaView, ScrollView, StyleSheet, Text, Pressable, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { colors } from '../theme';

export default function WelcomeScreen() {
  const router = useRouter();
  return <SafeAreaView style={styles.welcome}>
    <StatusBar style="light" />
    <ScrollView contentContainerStyle={styles.welcomeContent}>
      <Text style={styles.brand}>mielo.</Text>
      <View style={styles.intro}><Text style={styles.eyebrow}>ВАШЕ ПРОСТРАНСТВО ДЛЯ СЛОВ</Text>
        <Text style={styles.headline}>Слова, которые остаются с вами.</Text>
        <Text style={styles.subtitle}>Вспоминайте, произносите и повторяйте в своём темпе.</Text>
      </View>
      <View style={styles.art} accessible={false}>
        <View style={styles.backCard} /><View style={styles.frontCard}>
          <Text style={styles.cardSmall}>СЛОВО ЗА СЛОВОМ</Text><Text style={styles.cardWord}>안녕하세요</Text>
          <View style={styles.cardLine} /><Text style={styles.cardTranslation}>здравствуйте</Text>
        </View><View style={styles.orangeDot} />
      </View>
      <Pressable accessibilityRole="button" onPress={() => router.push('/decks')} style={({ pressed }) => [styles.start, pressed && { opacity: 0.8 }]}><Text style={styles.startText}>Мои колоды  →</Text></Pressable>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  navigation: { paddingHorizontal: 24, minHeight: 52, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  navLink: { color: colors.primaryDark, fontSize: 15, fontWeight: '600', paddingVertical: 12 },
  welcome: { flex: 1, backgroundColor: colors.primary },
  welcomeContent: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 18, paddingBottom: 24 },
  brand: { color: colors.surface, fontSize: 29, fontWeight: '800', letterSpacing: -1 },
  intro: { marginTop: 58 }, eyebrow: { color: '#CCD5FF', fontSize: 11, letterSpacing: 1.5, fontWeight: '700', marginBottom: 16 },
  headline: { color: colors.surface, fontSize: 42, lineHeight: 47, fontWeight: '800', letterSpacing: -1.2 },
  subtitle: { color: '#E0E7FF', fontSize: 17, lineHeight: 25, marginTop: 18, maxWidth: 310 },
  art: { height: 250, justifyContent: 'center', alignItems: 'center', marginVertical: 20 },
  backCard: { position: 'absolute', width: 215, height: 150, borderRadius: 22, backgroundColor: '#AAB9FF', transform: [{ rotate: '-12deg' }, { translateX: -18 }] },
  frontCard: { width: 220, height: 152, borderRadius: 22, backgroundColor: colors.surface, padding: 22, transform: [{ rotate: '8deg' }] },
  cardSmall: { fontSize: 9, letterSpacing: 1.2, color: colors.muted, fontWeight: '700' },
  cardWord: { fontSize: 25, fontWeight: '700', color: colors.text, marginTop: 17 },
  cardLine: { width: 30, height: 4, borderRadius: 2, backgroundColor: colors.orange, marginTop: 10, marginBottom: 8 },
  cardTranslation: { fontSize: 13, color: colors.muted },
  orangeDot: { width: 25, height: 25, borderRadius: 13, backgroundColor: colors.orange, position: 'absolute', right: 36, top: 26 },
  start: { backgroundColor: colors.surface, borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 'auto', borderBottomWidth: 4, borderBottomColor: '#C9D2FF' },
  startText: { fontSize: 17, fontWeight: '700', color: colors.primaryDark },
});
