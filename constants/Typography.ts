// TribeLink — Typography System
import { Platform } from 'react-native';

export const FontFamily = {
  // Primary — Inter (loaded via expo-font)
  regular:      'Inter-Regular',
  medium:       'Inter-Medium',
  semiBold:     'Inter-SemiBold',
  bold:         'Inter-Bold',
  extraBold:    'Inter-ExtraBold',
  // Mono
  mono:         Platform.OS === 'ios' ? 'Menlo' : 'monospace',
} as const;

// Type scale — 4px base
export const FontSize = {
  xs:   11,
  sm:   13,
  base: 15,
  md:   16,
  lg:   18,
  xl:   20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 34,
  '5xl': 42,
  '6xl': 52,
} as const;

export const LineHeight = {
  tight:   1.2,
  snug:    1.35,
  normal:  1.5,
  relaxed: 1.65,
  loose:   1.8,
} as const;

export const LetterSpacing = {
  tighter: -0.8,
  tight:   -0.4,
  normal:   0,
  wide:     0.4,
  wider:    0.8,
  widest:   1.6,
} as const;

// Preset text styles
export const TextStyles = {
  hero: {
    fontFamily: FontFamily.extraBold,
    fontSize: FontSize['5xl'],
    lineHeight: FontSize['5xl'] * LineHeight.tight,
    letterSpacing: LetterSpacing.tighter,
  },
  h1: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['4xl'],
    lineHeight: FontSize['4xl'] * LineHeight.tight,
    letterSpacing: LetterSpacing.tight,
  },
  h2: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['3xl'],
    lineHeight: FontSize['3xl'] * LineHeight.snug,
    letterSpacing: LetterSpacing.tight,
  },
  h3: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize['2xl'],
    lineHeight: FontSize['2xl'] * LineHeight.snug,
    letterSpacing: LetterSpacing.normal,
  },
  h4: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xl,
    lineHeight: FontSize.xl * LineHeight.normal,
  },
  title: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.lg,
    lineHeight: FontSize.lg * LineHeight.normal,
  },
  body: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    lineHeight: FontSize.base * LineHeight.relaxed,
  },
  bodyMedium: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.base,
    lineHeight: FontSize.base * LineHeight.relaxed,
  },
  caption: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    lineHeight: FontSize.sm * LineHeight.normal,
  },
  captionMedium: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    lineHeight: FontSize.sm * LineHeight.normal,
  },
  micro: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    lineHeight: FontSize.xs * LineHeight.normal,
    letterSpacing: LetterSpacing.wide,
  },
  label: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    letterSpacing: LetterSpacing.widest,
    textTransform: 'uppercase' as const,
  },
  button: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    letterSpacing: LetterSpacing.wide,
  },
  buttonSm: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    letterSpacing: LetterSpacing.wide,
  },
  code: {
    fontFamily: FontFamily.mono,
    fontSize: FontSize.sm,
    lineHeight: FontSize.sm * LineHeight.relaxed,
  },
} as const;
