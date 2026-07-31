import React from 'react';
import {
  TouchableOpacity, Text, ActivityIndicator,
  StyleSheet, ViewStyle, TextStyle, View, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppSelector } from '../../store';
import { darkTheme, lightTheme } from '../../constants/Theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'gradient';
type Size    = 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const triggerHaptic = () => {
  if (Platform.OS === 'web') return;
  try {
    const Haptics = require('expo-haptics');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {}
};

export const Button: React.FC<ButtonProps> = ({
  title, onPress, variant = 'primary', size = 'md',
  disabled, loading, leftIcon, rightIcon, fullWidth, style, textStyle,
}) => {
  const isDark = useAppSelector(s => s.theme.resolvedMode === 'dark');
  const theme  = isDark ? darkTheme : lightTheme;

  const handlePress = () => {
    triggerHaptic();
    onPress();
  };

  const sizeStyles: Record<Size, { height: number; px: number; fontSize: number; radius: number }> = {
    sm: { height: 36, px: 16, fontSize: 13, radius: 10 },
    md: { height: 48, px: 24, fontSize: 15, radius: 14 },
    lg: { height: 56, px: 32, fontSize: 16, radius: 16 },
    xl: { height: 64, px: 40, fontSize: 18, radius: 18 },
  };

  const s = sizeStyles[size];
  const isDisabled = disabled || loading;

  const getContainerStyle = (): ViewStyle => {
    const base: ViewStyle = {
      height: s.height,
      paddingHorizontal: s.px,
      borderRadius: s.radius,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      opacity: isDisabled ? 0.5 : 1,
    };
    if (fullWidth) base.width = '100%';

    switch (variant) {
      case 'primary':   return { ...base, backgroundColor: theme.colors.primary };
      case 'secondary': return { ...base, backgroundColor: theme.colors.surfaceSecondary };
      case 'outline':   return { ...base, backgroundColor: 'transparent', borderWidth: 1.5, borderColor: theme.colors.primary };
      case 'ghost':     return { ...base, backgroundColor: 'transparent' };
      case 'danger':    return { ...base, backgroundColor: theme.colors.error };
      case 'gradient':  return base;
      default:          return base;
    }
  };

  const getTextColor = (): string => {
    switch (variant) {
      case 'primary':   return '#FFFFFF';
      case 'secondary': return theme.colors.text;
      case 'outline':   return theme.colors.primary;
      case 'ghost':     return theme.colors.primary;
      case 'danger':    return '#FFFFFF';
      case 'gradient':  return '#FFFFFF';
      default:          return theme.colors.text;
    }
  };

  const content = (
    <>
      {!loading && leftIcon}
      {loading
        ? <ActivityIndicator color={getTextColor()} size="small" />
        : (
          <Text style={[{
            fontFamily: 'Inter-SemiBold',
            fontSize: s.fontSize,
            color: getTextColor(),
            letterSpacing: 0.3,
          }, textStyle]}>
            {title}
          </Text>
        )
      }
      {!loading && rightIcon}
    </>
  );

  if (variant === 'gradient') {
    return (
      <TouchableOpacity
        onPress={handlePress}
        disabled={isDisabled}
        activeOpacity={0.85}
        style={[getContainerStyle(), style]}
      >
        <LinearGradient
          colors={theme.colors.gradientPrimary as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[StyleSheet.absoluteFill, { borderRadius: s.radius }]}
        />
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={isDisabled}
      activeOpacity={0.82}
      style={[getContainerStyle(), style]}
    >
      {content}
    </TouchableOpacity>
  );
};

export default Button;
