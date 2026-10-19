import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, typography } from '../theme';

type Props = {
  kicker: string;
  title: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function SectionHeader({ kicker, title, actionLabel = 'Бүгдийг харах →', onAction }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <Text style={typography.kicker}>{kicker}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
      {onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  copy: { flex: 1, paddingRight: 12 },
  title: { color: '#fff', fontSize: 18, lineHeight: 28, fontFamily: 'Rubik-Medium', marginTop: 4 },
  action: { color: colors.muted, fontSize: 12, lineHeight: 16, fontFamily: 'Rubik-Medium' },
});
