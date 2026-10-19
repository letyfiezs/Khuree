import { useColorScheme } from 'react-native';

export const fonts = {
  regular: 'Rubik-Regular',
  medium: 'Rubik-Medium',
  bold: 'Rubik-Bold',
} as const;

export const colors = {
  brand: '#004DA0',
  brandDark: '#3385D6',
  secondary: '#FFA726',
  ghost: '#E6F0FA',
  text: '#28282D',
  textDark: '#FFFFFF',
  placeholder: '#717680',
  placeholderDark: '#9CA3AF',
  border: '#ECECEC',
  error: '#F04438',
  errorText: '#D92D20',
  surface: '#FFFFFF',
  surfaceDisabled: '#F9FAFB',
  textDisabled: '#A3A3A3',
  darkPrimary: '#252935',
  ink: '#080808',
  inkElevated: '#111111',
  red: '#3385D6',
  accent: '#004DA0',
  muted: '#9CA3AF',
  dim: '#9CA3AF',
  line: '#ECECEC',
  chip: '#191919',
  overlay: 'rgba(5,5,5,0.72)',
};

export const spacing = {
  s4: 4,
  s8: 8,
  s12: 12,
  s16: 16,
  s20: 20,
  s24: 24,
  s32: 32,
  s40: 40,
} as const;

export const radii = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
} as const;

export const controlHeight = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 56,
} as const;

export const controlFontSize = {
  xs: 12,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
} as const;

export type ControlSize = keyof typeof controlHeight;

export const typography = {
  heading: { fontSize: 24, lineHeight: 32, fontFamily: fonts.bold },
  subheading: { fontSize: 18, lineHeight: 28, fontFamily: fonts.medium },
  body: { fontSize: 16, lineHeight: 24, fontFamily: fonts.regular },
  bodySm: { fontSize: 14, lineHeight: 20, fontFamily: fonts.regular },
  caption: { fontSize: 12, lineHeight: 16, fontFamily: fonts.regular },
  label: { fontSize: 14, lineHeight: 20, fontFamily: fonts.medium },
  kicker: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: fonts.medium,
    letterSpacing: 1.6,
    color: colors.red,
  },
};

export function usePalette() {
  const dark = useColorScheme() === 'dark';
  return {
    dark,
    text: dark ? colors.textDark : colors.text,
    placeholder: dark ? colors.placeholderDark : colors.placeholder,
    brand: dark ? colors.brandDark : colors.brand,
    fieldBackground: dark ? colors.darkPrimary : colors.surface,
    primaryBackground: dark ? colors.darkPrimary : colors.brand,
    primaryText: dark ? colors.brandDark : colors.textDark,
  };
}
