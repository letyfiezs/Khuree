import { StyleSheet, Text, View } from 'react-native';
import { Button } from './ui/Button';
import { colors, fonts } from '../theme';

export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return <Button block label={label} onPress={onPress} disabled={disabled} loading={loading} />;
}

export function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return <Text style={styles.error}>{message}</Text>;
}

export function EmptyState({ title }: { title: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  error: {
    color: colors.errorText,
    marginTop: 4,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { color: colors.dim, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
});
