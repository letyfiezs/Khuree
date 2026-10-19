import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, controlFontSize, controlHeight, fonts, radii, type ControlSize, usePalette } from '../../theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: ControlSize;
  disabled?: boolean;
  loading?: boolean;
  block?: boolean;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled,
  loading,
  block,
  icon,
  style,
}: Props) {
  const palette = usePalette();
  const inactive = disabled || loading;
  const paletteStyle = variantStyle(variant, palette);

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        {
          height: controlHeight[size],
          backgroundColor: inactive ? colors.surfaceDisabled : paletteStyle.backgroundColor,
          borderColor: inactive ? colors.textDisabled : paletteStyle.borderColor,
        },
        block && styles.block,
        pressed && !inactive && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={inactive ? colors.textDisabled : paletteStyle.color} />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text
            style={{
              color: inactive ? colors.textDisabled : paletteStyle.color,
              fontFamily: fonts.medium,
              fontSize: controlFontSize[size],
            }}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

function variantStyle(
  variant: Variant,
  palette: ReturnType<typeof usePalette>,
): { backgroundColor: string; color: string; borderColor: string } {
  if (variant === 'secondary') {
    return { backgroundColor: colors.secondary, color: colors.textDark, borderColor: colors.secondary };
  }
  if (variant === 'outline') {
    return { backgroundColor: 'transparent', color: palette.brand, borderColor: palette.brand };
  }
  if (variant === 'ghost') {
    return { backgroundColor: colors.ghost, color: palette.brand, borderColor: colors.ghost };
  }
  return { backgroundColor: palette.primaryBackground, color: palette.primaryText, borderColor: palette.primaryBackground };
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.sm,
    borderWidth: 1,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  block: { alignSelf: 'stretch' },
  pressed: { opacity: 0.7 },
  content: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
