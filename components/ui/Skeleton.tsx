import React, { useRef, useEffect } from 'react';
import { View, Animated, Platform } from 'react-native';
import { useAppSelector } from '../../store';
import { darkTheme, lightTheme } from '../../constants/Theme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

// useNativeDriver is not supported on web — conditionally use it
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%', height = 16, borderRadius = 8, style,
}) => {
  const isDark = useAppSelector(s => s.theme.resolvedMode === 'dark');
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 800,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 800,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);

  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.9] });

  return (
    <Animated.View style={[{
      width: width as any,
      height,
      borderRadius,
      backgroundColor: isDark ? 'rgba(139,92,246,0.15)' : 'rgba(124,58,237,0.08)',
      opacity,
    }, style]} />
  );
};

// Preset skeleton card for user discovery
export const UserCardSkeleton: React.FC = () => {
  const isDark = useAppSelector(s => s.theme.resolvedMode === 'dark');
  const theme  = isDark ? darkTheme : lightTheme;

  return (
    <View style={{
      backgroundColor: theme.colors.card,
      borderRadius: 20,
      padding: 16,
      gap: 12,
    }}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <Skeleton width={56} height={56} borderRadius={28} />
        <View style={{ flex: 1, gap: 8 }}>
          <Skeleton width="60%" height={16} />
          <Skeleton width="40%" height={12} />
        </View>
      </View>
      <Skeleton height={12} />
      <Skeleton height={12} width="80%" />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Skeleton width={70} height={28} borderRadius={9999} />
        <Skeleton width={80} height={28} borderRadius={9999} />
        <Skeleton width={60} height={28} borderRadius={9999} />
      </View>
    </View>
  );
};

export default Skeleton;
