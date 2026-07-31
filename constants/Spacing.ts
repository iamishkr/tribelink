// TribeLink — Spacing & Layout System
// Based on 4px base unit

export const Spacing = {
  px:   1,
  0.5:  2,
  1:    4,
  1.5:  6,
  2:    8,
  2.5:  10,
  3:    12,
  3.5:  14,
  4:    16,
  5:    20,
  6:    24,
  7:    28,
  8:    32,
  9:    36,
  10:   40,
  11:   44,
  12:   48,
  14:   56,
  16:   64,
  20:   80,
  24:   96,
  28:   112,
  32:   128,
} as const;

export const BorderRadius = {
  none:   0,
  sm:     6,
  md:     10,
  lg:     14,
  xl:     18,
  '2xl':  24,
  '3xl':  32,
  full:   9999,
  // Named
  card:   20,
  button: 14,
  input:  12,
  chip:   9999,
  avatar: 9999,
  modal:  28,
  badge:  9999,
} as const;

export const Shadow = {
  none: {},
  sm: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  lg: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 8,
  },
  xl: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.24,
    shadowRadius: 32,
    elevation: 12,
  },
  glow: {
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
} as const;

export const ZIndex = {
  base:       0,
  raised:     10,
  dropdown:   100,
  sticky:     200,
  overlay:    300,
  modal:      400,
  popover:    500,
  toast:      600,
} as const;

export const ScreenPadding = {
  horizontal: Spacing[5],  // 20
  vertical:   Spacing[4],  // 16
  top:        Spacing[6],  // 24
  bottom:     Spacing[8],  // 32
} as const;

export const AvatarSize = {
  xs:  24,
  sm:  32,
  md:  44,
  lg:  56,
  xl:  72,
  '2xl': 96,
  '3xl': 120,
} as const;

export const IconSize = {
  xs:  14,
  sm:  16,
  md:  20,
  lg:  24,
  xl:  28,
  '2xl': 32,
} as const;

export const HitSlop = {
  sm:  { top: 8,  right: 8,  bottom: 8,  left: 8  },
  md:  { top: 12, right: 12, bottom: 12, left: 12 },
  lg:  { top: 16, right: 16, bottom: 16, left: 16 },
} as const;
