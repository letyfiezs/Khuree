import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';

export function BrandMark() {
  return (
    <View style={styles.brand}>
      <Text style={styles.brandRed}>Х</Text>
      <Text style={styles.brandText}>ҮРЭЭ</Text>
    </View>
  );
}

export function ScreenHeader({
  onSearch,
  trailing,
}: {
  onSearch?: () => void;
  trailing?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <BrandMark />
      <View style={styles.actions}>
        {onSearch ? (
          <Pressable onPress={onSearch} style={styles.icon} accessibilityLabel="Хайх">
            <Text style={styles.iconText}>⌕</Text>
          </Pressable>
        ) : null}
        {trailing}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 18,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 20,
  },
  brand: { flexDirection: 'row', alignItems: 'center' },
  brandRed: { color: colors.red, fontSize: 24, lineHeight: 32, fontFamily: 'Rubik-Bold', letterSpacing: -1 },
  brandText: { color: '#fff', fontSize: 18, lineHeight: 28, fontFamily: 'Rubik-Bold', letterSpacing: 3, marginLeft: 8 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#191919',
    borderWidth: 1,
    borderColor: '#383838',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { color: '#fff', fontSize: 18, lineHeight: 28, fontFamily: 'Rubik-Medium' },
});
