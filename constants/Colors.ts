// TribeLink Design System — Color Tokens
// Supports both Dark Mode and Light Mode

export const Palette = {
  // Brand
  violet: {
    50:  '#F5F3FF',
    100: '#EDE9FE',
    200: '#DDD6FE',
    300: '#C4B5FD',
    400: '#A78BFA',
    500: '#8B5CF6',
    600: '#7C3AED',
    700: '#6D28D9',
    800: '#5B21B6',
    900: '#4C1D95',
    950: '#2E1065',
  },
  indigo: {
    50:  '#EEF2FF',
    100: '#E0E7FF',
    400: '#818CF8',
    500: '#6366F1',
    600: '#4F46E5',
    700: '#4338CA',
    900: '#312E81',
  },
  rose: {
    400: '#FB7185',
    500: '#F43F5E',
    600: '#E11D48',
  },
  amber: {
    400: '#FBBF24',
    500: '#F59E0B',
  },
  emerald: {
    400: '#34D399',
    500: '#10B981',
  },
  sky: {
    400: '#38BDF8',
    500: '#0EA5E9',
  },
  // Neutrals
  slate: {
    50:  '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
    950: '#020617',
  },
} as const;

export const Colors = {
  light: {
    // Backgrounds
    background:         '#F8F7FF',
    backgroundSecondary:'#FFFFFF',
    backgroundTertiary: '#F1F0F9',
    surface:            '#FFFFFF',
    surfaceSecondary:   '#F5F4FF',
    card:               '#FFFFFF',
    overlay:            'rgba(124,58,237,0.06)',

    // Brand
    primary:            Palette.violet[600],
    primaryLight:       Palette.violet[400],
    primaryDark:        Palette.violet[800],
    secondary:          Palette.indigo[500],
    accent:             Palette.rose[500],

    // Text
    text:               '#0F0E1A',
    textSecondary:      Palette.slate[600],
    textTertiary:       Palette.slate[400],
    textInverse:        '#FFFFFF',

    // Borders
    border:             Palette.slate[200],
    borderFocus:        Palette.violet[400],

    // States
    success:            Palette.emerald[500],
    warning:            Palette.amber[500],
    error:              Palette.rose[500],
    info:               Palette.sky[500],

    // Interactive
    tabBar:             '#FFFFFF',
    tabBarActive:       Palette.violet[600],
    tabBarInactive:     Palette.slate[400],
    headerBg:           '#FFFFFF',

    // Glassmorphism
    glass:              'rgba(255,255,255,0.7)',
    glassStrong:        'rgba(255,255,255,0.9)',
    glassBorder:        'rgba(124,58,237,0.15)',

    // Gradients (as string pairs for LinearGradient)
    gradientPrimary:    ['#7C3AED', '#6366F1'] as string[],
    gradientAccent:     ['#7C3AED', '#EC4899'] as string[],
    gradientCard:       ['#F5F3FF', '#EDE9FE'] as string[],
    gradientHero:       ['#4C1D95', '#312E81'] as string[],

    // Special
    online:             Palette.emerald[400],
    offline:            Palette.slate[400],
    verified:           Palette.violet[600],
    trusted:            Palette.amber[400],
  },
  dark: {
    // Backgrounds
    background:         '#0A0A1B',
    backgroundSecondary:'#0F0F2A',
    backgroundTertiary: '#13132E',
    surface:            '#12122A',
    surfaceSecondary:   '#1A1A3E',
    card:               '#15153A',
    overlay:            'rgba(124,58,237,0.12)',

    // Brand
    primary:            Palette.violet[500],
    primaryLight:       Palette.violet[300],
    primaryDark:        Palette.violet[700],
    secondary:          Palette.indigo[400],
    accent:             Palette.rose[400],

    // Text
    text:               '#F0EEFF',
    textSecondary:      Palette.slate[300],
    textTertiary:       Palette.slate[500],
    textInverse:        '#0F0E1A',

    // Borders
    border:             'rgba(124,58,237,0.2)',
    borderFocus:        Palette.violet[400],

    // States
    success:            Palette.emerald[400],
    warning:            Palette.amber[400],
    error:              Palette.rose[400],
    info:               Palette.sky[400],

    // Interactive
    tabBar:             '#0F0F2A',
    tabBarActive:       Palette.violet[400],
    tabBarInactive:     Palette.slate[600],
    headerBg:           '#0A0A1B',

    // Glassmorphism
    glass:              'rgba(21,21,58,0.7)',
    glassStrong:        'rgba(21,21,58,0.92)',
    glassBorder:        'rgba(139,92,246,0.25)',

    // Gradients
    gradientPrimary:    ['#7C3AED', '#6366F1'] as string[],
    gradientAccent:     ['#8B5CF6', '#EC4899'] as string[],
    gradientCard:       ['#15153A', '#1A1A3E'] as string[],
    gradientHero:       ['#2E1065', '#1E1B4B'] as string[],

    // Special
    online:             Palette.emerald[400],
    offline:            Palette.slate[600],
    verified:           Palette.violet[400],
    trusted:            Palette.amber[400],
  },
} as const;

export type ThemeColors = typeof Colors.light;
export type ColorMode = 'light' | 'dark';
