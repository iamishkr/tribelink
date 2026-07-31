import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { useAppSelector } from '../../store';
import { darkTheme, lightTheme } from '../../constants/Theme';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'glass' | 'elevated' | 'outlined';
  padding?: number;
  style?: ViewStyle;
  borderRadius?: number;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 16,
  style,
  borderRadius = 20,
}) => {
  const isDark = useAppSelector(s => s.theme.resolvedMode === 'dark');
  const theme  = isDark ? darkTheme : lightTheme;

  if (variant === 'glass') {
    return (
      <View style={[{
        borderRadius,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.colors.glassBorder,
        ...theme.shadow.md,
      }, style]}>
        <BlurView
          intensity={isDark ? 60 : 80}
          tint={isDark ? 'dark' : 'light'}
          style={[StyleSheet.absoluteFill]}
        />
        <View style={[{
          backgroundColor: theme.colors.glass,
          borderRadius,
          padding,
        }]}>
          {children}
        </View>
      </View>
    );
  }

  if (variant === 'elevated') {
    return (
      <View style={[{
        backgroundColor: theme.colors.card,
        borderRadius,
        padding,
        ...theme.shadow.lg,
      }, style]}>
        {children}
      </View>
    );
  }

  if (variant === 'outlined') {
    return (
      <View style={[{
        backgroundColor: theme.colors.card,
        borderRadius,
        padding,
        borderWidth: 1.5,
        borderColor: theme.colors.border,
      }, style]}>
        {children}
      </View>
    );
  }

  return (
    <View style={[{
      backgroundColor: theme.colors.card,
      borderRadius,
      padding,
      ...theme.shadow.sm,
    }, style]}>
      {children}
    </View>
  );
};

export default Card;
