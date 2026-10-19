import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii, usePalette } from '../../theme';

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
};

export function Checkbox({ checked, onChange, label, disabled }: Props) {
  const palette = usePalette();
  return (
    <Pressable
      disabled={disabled}
      onPress={() => onChange(!checked)}
      style={styles.row}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
    >
      <View
        style={[
          styles.box,
          {
            borderColor: disabled ? colors.textDisabled : checked ? palette.brand : colors.border,
            backgroundColor: checked && !disabled ? palette.brand : 'transparent',
          },
        ]}
      >
        {checked ? <View style={styles.check} /> : null}
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
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    width: 10,
    height: 6,
    marginTop: -2,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: colors.textDark,
    transform: [{ rotate: '-45deg' }],
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
  },
});
