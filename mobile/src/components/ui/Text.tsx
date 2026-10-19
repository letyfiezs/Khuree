import { Text as RNText, type TextProps, type TextStyle } from 'react-native';
import { typography, usePalette } from '../../theme';

export type TextVariant = keyof typeof typography;

type Props = TextProps & {
  variant?: TextVariant;
};

export function Text({ variant = 'body', style, ...rest }: Props) {
  const palette = usePalette();
  return <RNText {...rest} style={[typography[variant], { color: palette.text } as TextStyle, style]} />;
}
