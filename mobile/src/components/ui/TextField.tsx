import { useState, type ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { colors, controlFontSize, controlHeight, fonts, radii, type ControlSize, usePalette } from '../../theme';

type Props = Omit<TextInputProps, 'style' | 'placeholderTextColor' | 'editable'> & {
  label?: string;
  helper?: string;
  error?: string;
  size?: ControlSize;
  disabled?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  prefix?: string;
  style?: StyleProp<ViewStyle>;
};

export function TextField({
  label,
  helper,
  error,
  size = 'md',
  disabled,
  leftIcon,
  rightIcon,
  prefix,
  style,
  onFocus,
  onBlur,
  ...input
}: Props) {
  const palette = usePalette();
  const [focused, setFocused] = useState(false);
  const message = error || helper;
  const borderColor = error ? colors.error : focused ? palette.brand : colors.border;

  return (
    <View style={style}>
      {label ? <Text style={[styles.label, { color: palette.text }]}>{label}</Text> : null}
      <View
        style={[
          styles.field,
          {
            height: controlHeight[size],
            marginTop: label ? 4 : 0,
            backgroundColor: disabled ? colors.surfaceDisabled : palette.fieldBackground,
            borderColor,
          },
        ]}
      >
        {leftIcon}
        {prefix ? (
          <Text style={[styles.prefix, { color: disabled ? colors.textDisabled : palette.text, fontSize: controlFontSize[size] }]}>
            {prefix}
          </Text>
        ) : null}
        <TextInput
          {...input}
          editable={!disabled}
          placeholderTextColor={disabled ? colors.textDisabled : palette.placeholder}
          onFocus={event => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={event => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[
            styles.input,
            {
              fontSize: controlFontSize[size],
              color: disabled ? colors.textDisabled : palette.text,
            },
          ]}
        />
        {rightIcon}
      </View>
      {message ? <Text style={[styles.helper, error ? styles.error : { color: palette.placeholder }]}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: fonts.medium,
    fontSize: 14,
    lineHeight: 20,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: radii.md,
  },
  prefix: {
    fontFamily: fonts.medium,
  },
  input: {
    flex: 1,
    height: '100%',
    padding: 0,
    fontFamily: fonts.regular,
  },
  helper: {
    marginTop: 4,
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  error: {
    color: colors.errorText,
  },
});
