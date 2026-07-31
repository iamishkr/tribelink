import React from 'react';
import { Text, View, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector } from '../../store';
import { darkTheme, lightTheme } from '../../constants/Theme';

type BadgeVariant = 'interest' | 'skill' | 'goal' | 'level' | 'status' | 'count';
type BadgeColor   = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  color?: BadgeColor;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  onRemove?: () => void;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label, variant = 'interest', color = 'primary',
  icon, onPress, onRemove, size = 'md', style,
}) => {
  const isDark = useAppSelector(s => s.theme.resolvedMode === 'dark');
  const theme  = isDark ? darkTheme : lightTheme;

  const sizeMap = {
    sm: { px: 8, py: 3, fontSize: 11, iconSize: 12, gap: 4 },
    md: { px: 12, py: 5, fontSize: 13, iconSize: 14, gap: 5 },
    lg: { px: 16, py: 8, fontSize: 15, iconSize: 16, gap: 6 },
  };

  const colorMap: Record<BadgeColor, { bg: string; text: string; border: string }> = {
    primary: {
      bg:     isDark ? 'rgba(124,58,237,0.2)' : 'rgba(124,58,237,0.1)',
      text:   theme.colors.primary,
      border: 'rgba(124,58,237,0.3)',
    },
    success: {
      bg:     isDark ? 'rgba(52,211,153,0.15)' : 'rgba(16,185,129,0.1)',
      text:   theme.colors.success,
      border: 'rgba(52,211,153,0.3)',
    },
    warning: {
      bg:     isDark ? 'rgba(251,191,36,0.15)' : 'rgba(245,158,11,0.1)',
      text:   theme.colors.warning,
      border: 'rgba(251,191,36,0.3)',
    },
    error: {
      bg:     isDark ? 'rgba(251,113,133,0.15)' : 'rgba(244,63,94,0.1)',
      text:   theme.colors.error,
      border: 'rgba(251,113,133,0.3)',
    },
    info: {
      bg:     isDark ? 'rgba(56,189,248,0.15)' : 'rgba(14,165,233,0.1)',
      text:   theme.colors.info,
      border: 'rgba(56,189,248,0.3)',
    },
    neutral: {
      bg:     theme.colors.surfaceSecondary,
      text:   theme.colors.textSecondary,
      border: theme.colors.border,
    },
  };

  const s = sizeMap[size];
  const c = colorMap[color];

  const inner = (
    <View style={[{
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: s.px,
      paddingVertical: s.py,
      backgroundColor: c.bg,
      borderRadius: 9999,
      borderWidth: 1,
      borderColor: c.border,
      gap: s.gap,
    }, style]}>
      {icon && <Ionicons name={icon} size={s.iconSize} color={c.text} />}
      <Text style={{
        color: c.text,
        fontSize: s.fontSize,
        fontFamily: 'Inter-Medium',
      }}>
        {label}
      </Text>
      {onRemove && (
        <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Ionicons name="close-circle" size={s.iconSize} color={c.text} />
        </TouchableOpacity>
      )}
    </View>
  );

  if (onPress) {
    return <TouchableOpacity onPress={onPress} activeOpacity={0.75}>{inner}</TouchableOpacity>;
  }
  return inner;
};

export default Badge;
