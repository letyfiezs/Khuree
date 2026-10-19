import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

export function PremiumBadge({ kind, age }: { kind?: string; age?: string }) {
  const label = age === '18+' ? '18+' : kind === 'series' ? 'ОЛОН АНГИТ' : 'HD';
  return (
    <View style={styles.tag}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    backgroundColor: '#000c',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  text: { color: colors.textDark, fontSize: 12, lineHeight: 16, fontFamily: 'Rubik-Bold' },
});
