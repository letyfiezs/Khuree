import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, usePalette } from '../../theme';

type Props = {
  selected: boolean;
  onChange: () => void;
  label?: string;
  disabled?: boolean;
};

export function Radio({ selected, onChange, label, disabled }: Props) {
  const palette = usePalette();
  return (
    <Pressable
      disabled={disabled}
      onPress={onChange}
      style={styles.row}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
    >
      <View
        style={[
          styles.box,
          {
            borderColor: disabled ? colors.textDisabled : selected ? palette.brand : colors.border,
            backgroundColor: selected && !disabled ? palette.brand : 'transparent',
          },
        ]}
      >
        {selected ? <View style={styles.dot} /> : null}
      </View>
      {label ? <Text style={[styles.label, { color: disabled ? colors.textDisabled : palette.text }]}>{label}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  box: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textDark,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
  },
});
