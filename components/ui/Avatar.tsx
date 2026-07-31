import React from 'react';
import { View, Image, Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector } from '../../store';
import { darkTheme, lightTheme } from '../../constants/Theme';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';

const SIZE_MAP: Record<AvatarSize, number> = {
  xs: 24, sm: 32, md: 44, lg: 56, xl: 72, '2xl': 96, '3xl': 120,
};

interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: AvatarSize;
  isOnline?: boolean;
  isVerified?: boolean;
  showBorder?: boolean;
  style?: ViewStyle;
}

export const Avatar: React.FC<AvatarProps> = ({
  uri, name, size = 'md', isOnline, isVerified, showBorder, style,
}) => {
  const isDark = useAppSelector(s => s.theme.resolvedMode === 'dark');
  const theme  = isDark ? darkTheme : lightTheme;
  const px     = SIZE_MAP[size];
  const fontSize = px * 0.38;

  // Generate initials from name
  const initials = name
    ? name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <View style={[{ width: px, height: px }, style]}>
      {/* Main avatar */}
      <View style={[styles.container, {
        width: px,
        height: px,
        borderRadius: px / 2,
        borderWidth: showBorder ? 2.5 : 0,
        borderColor: showBorder ? theme.colors.primary : 'transparent',
        overflow: 'hidden',
      }]}>
        {uri ? (
          <Image source={{ uri }} style={{ width: px, height: px }} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={theme.colors.gradientPrimary as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFill, styles.initials]}
          >
            <Text style={{
              color: '#FFFFFF',
              fontSize,
              fontFamily: 'Inter-SemiBold',
              letterSpacing: 0.5,
            }}>
              {initials}
            </Text>
          </LinearGradient>
        )}
      </View>

      {/* Online dot */}
      {isOnline !== undefined && (
        <View style={[styles.onlineDot, {
          width: px * 0.28,
          height: px * 0.28,
          borderRadius: px * 0.14,
          backgroundColor: isOnline ? theme.colors.online : theme.colors.offline,
          borderColor: theme.colors.background,
          borderWidth: 2,
          bottom: 0,
          right: 0,
        }]} />
      )}

      {/* Verified badge */}
      {isVerified && px >= 44 && (
        <View style={[styles.verifiedBadge, {
          width: px * 0.30,
          height: px * 0.30,
          borderRadius: px * 0.15,
          bottom: 0,
          right: 0,
          backgroundColor: theme.colors.primary,
          borderColor: theme.colors.background,
          borderWidth: 1.5,
        }]}>
          <Ionicons name="checkmark" size={px * 0.16} color="#FFFFFF" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container:    { position: 'relative' },
  initials: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDot: {
    position: 'absolute',
  },
  verifiedBadge: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Avatar;
