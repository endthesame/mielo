import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { colors, fontSize, radius, spacing } from '../theme';

type Props = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'text';
  disabled?: boolean;
  busy?: boolean;
  style?: StyleProp<ViewStyle>;
};

export default function Button({ title, onPress, variant = 'primary', disabled = false, busy = false, style }: Props) {
  const inactive = disabled || busy;
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: inactive, busy }}
    disabled={inactive} onPress={onPress} style={({ pressed }) => [styles.base, styles[variant], style, inactive && styles.disabled, pressed && styles.pressed]}>
    <Text style={[styles.label, variant === 'primary' ? styles.primaryText : styles.otherText]}>{title}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  base: { minHeight: 48, borderRadius: radius.button, paddingHorizontal: spacing.md, paddingVertical: spacing.md, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: colors.primary, borderBottomWidth: 4, borderBottomColor: colors.primaryDark },
  secondary: { backgroundColor: colors.surface },
  text: { backgroundColor: 'transparent' },
  label: { fontSize: fontSize.body, fontWeight: '700', textAlign: 'center' },
  primaryText: { color: colors.surface }, otherText: { color: colors.primaryDark },
  disabled: { opacity: 0.45 }, pressed: { opacity: 0.7 },
});
