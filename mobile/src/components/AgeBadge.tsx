import { StyleSheet, Text, View } from 'react-native';
import { colors, radii } from '../theme';

export function AgeBadge({ age }: { age?: string }) {
  if (!age) return null;
  const adult = age === '18+';
  return (
    <View style={[styles.badge, adult && styles.adult]}>
      <Text style={styles.text}>{age}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    marginTop: 4,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  adult: { borderColor: colors.red },
  text: { color: colors.muted, fontSize: 12, lineHeight: 16, fontFamily: 'Rubik-Medium' },
});
