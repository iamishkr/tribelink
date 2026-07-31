import React, { useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions,
  Image, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { User } from '../../types';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { useAppSelector } from '../../store';
import { darkTheme, lightTheme } from '../../constants/Theme';
import { getOrCreateDirectChat } from '../../lib/chat';

const triggerHaptic = (style: string) => {
  if (Platform.OS === 'web') return;
  try {
    const Haptics = require('expo-haptics');
    Haptics.impactAsync(style === 'medium' 
      ? Haptics.ImpactFeedbackStyle.Medium 
      : Haptics.ImpactFeedbackStyle.Light);
  } catch {}
};

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = SCREEN_W - 40;

interface UserCardProps {
  user: User;
  onConnect?: (userId: string) => void;
  onDismiss?: (userId: string) => void;
  style?: any;
}

export const UserCard: React.FC<UserCardProps> = ({ user, onConnect, onDismiss, style }) => {
  const isDark  = useAppSelector(s => s.theme.resolvedMode === 'dark');
  const theme   = isDark ? darkTheme : lightTheme;
  const currentUser = useAppSelector(s => s.auth.user);
  const scale   = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn  = () => { scale.value = withSpring(0.97); };
  const handlePressOut = () => { scale.value = withSpring(1); };

  const handleConnect = () => {
    triggerHaptic('medium');
    onConnect?.(user.id);
  };

  const handleDismiss = () => {
    triggerHaptic('light');
    onDismiss?.(user.id);
  };

  const handleChatPress = async () => {
    triggerHaptic('light');
    if (!currentUser?.id) {
      router.push(`/chat/${user.id}`);
      return;
    }
    try {
      const chatId = await getOrCreateDirectChat(currentUser.id, user.id);
      router.push(`/chat/${chatId}`);
    } catch {
      router.push(`/chat/${user.id}`);
    }
  };

  const sharedInterests = user.interests?.slice(0, 3) ?? [];
  const matchPct = user.match_score ?? 0;

  return (
    <Animated.View style={[animatedStyle, style]}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => router.push(`/user/${user.id}`)}
        style={[styles.card, {
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
          width: CARD_W,
          ...theme.shadow.lg,
        }]}
      >
        {/* Cover Image / Gradient Header */}
        <View style={styles.header}>
          {user.cover_url ? (
            <Image source={{ uri: user.cover_url }} style={styles.cover} resizeMode="cover" />
          ) : (
            <LinearGradient
              colors={theme.colors.gradientHero as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.cover}
            />
          )}

          {/* AI Match Score Badge */}
          {matchPct > 0 && (
            <View style={[styles.matchBadge, { backgroundColor: theme.colors.primary }]}>
              <Ionicons name="sparkles" size={10} color="#FFF" />
              <Text style={styles.matchText}>{matchPct}% match</Text>
            </View>
          )}

          {/* Distance & Location Badge — ALWAYS SHOWN */}
          <View style={[styles.distanceBadge, {
            backgroundColor: theme.colors.glassStrong,
            borderColor: theme.colors.glassBorder,
          }]}>
            <Ionicons name="location-outline" size={10} color={theme.colors.textSecondary} />
            <Text style={[styles.distanceText, { color: theme.colors.textSecondary }]}>
              {user.distance_km != null
                ? user.distance_km < 1
                  ? `${Math.round(user.distance_km * 1000)}m`
                  : `${user.distance_km.toFixed(1)}km`
                : (user.city || 'Nearby')}
            </Text>
          </View>
        </View>

        {/* Avatar — overlaps header */}
        <View style={styles.avatarRow}>
          <Avatar
            uri={user.avatar_url}
            name={user.name}
            size="xl"
            isOnline={user.is_online}
            isVerified={user.is_verified}
            showBorder
          />
          <View style={styles.nameBlock}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={1}>
                {user.name}
              </Text>
              {user.is_verified && (
                <Ionicons name="checkmark-circle" size={16} color={theme.colors.primary} />
              )}
            </View>
            <Text style={[styles.meta, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {[user.occupation, user.city].filter(Boolean).join(' · ')}
            </Text>
          </View>
        </View>

        {/* Bio */}
        {user.bio && (
          <Text style={[styles.bio, { color: theme.colors.textSecondary }]} numberOfLines={2}>
            {user.bio}
          </Text>
        )}

        {/* Shared Interests */}
        {sharedInterests.length > 0 && (
          <View style={styles.interests}>
            {sharedInterests.map((i: any, idx: number) => (
              <Badge
                key={idx}
                label={typeof i === 'string' ? i : i.interest}
                size="sm"
                color="primary"
              />
            ))}
            {(user.interests?.length ?? 0) > 3 && (
              <Badge
                label={`+${(user.interests?.length ?? 0) - 3}`}
                size="sm"
                color="neutral"
              />
            )}
          </View>
        )}

        {/* Stats Row */}
        <View style={[styles.stats, { borderTopColor: theme.colors.border }]}>
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: theme.colors.text }]}>
              {user.trust_score ?? 0}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textTertiary }]}>Trust</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: theme.colors.text }]}>
              {user.mutual_interests ?? 0}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textTertiary }]}>Common</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: theme.colors.text }]}>
              Lv {user.level ?? 1}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textTertiary }]}>Level</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={handleDismiss}
            style={[styles.actionBtn, {
              backgroundColor: theme.colors.surfaceSecondary,
              borderColor: theme.colors.border,
            }]}
          >
            <Ionicons name="close-outline" size={22} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleConnect}
            style={[styles.connectBtn]}
          >
            <LinearGradient
              colors={theme.colors.gradientPrimary as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[StyleSheet.absoluteFill, { borderRadius: 14 }]}
            />
            <Ionicons name="person-add-outline" size={18} color="#FFF" />
            <Text style={styles.connectText}>Connect</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, {
              backgroundColor: theme.colors.surfaceSecondary,
              borderColor: theme.colors.border,
            }]}
            onPress={handleChatPress}
          >
            <Ionicons name="chatbubble-outline" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    marginHorizontal: 20,
  },
  header:      { height: 100, position: 'relative' },
  cover:       { width: '100%', height: '100%' },
  matchBadge: {
    position: 'absolute', top: 12, left: 12,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20,
  },
  matchText:   { color: '#FFF', fontSize: 11, fontFamily: 'Inter-SemiBold' },
  distanceBadge: {
    position: 'absolute', top: 12, right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1,
  },
  distanceText:  { fontSize: 11, fontFamily: 'Inter-Medium' },
  avatarRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 16, marginTop: -36, gap: 12,
  },
  nameBlock:   { flex: 1, paddingBottom: 4 },
  nameRow:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name:        { fontSize: 17, fontFamily: 'Inter-Bold', flex: 1 },
  meta:        { fontSize: 13, fontFamily: 'Inter-Regular', marginTop: 2 },
  bio:         { fontSize: 13, fontFamily: 'Inter-Regular', paddingHorizontal: 16, marginTop: 10, lineHeight: 19 },
  interests:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 16, marginTop: 12 },
  stats: {
    flexDirection: 'row', justifyContent: 'space-evenly',
    borderTopWidth: 1, marginTop: 14, paddingVertical: 12,
  },
  stat:        { alignItems: 'center', flex: 1 },
  statNum:     { fontSize: 15, fontFamily: 'Inter-Bold' },
  statLabel:   { fontSize: 11, fontFamily: 'Inter-Regular', marginTop: 2 },
  divider:     { width: 1, height: 28, alignSelf: 'center' },
  actions:     { flexDirection: 'row', gap: 10, padding: 16, paddingTop: 4, alignItems: 'center' },
  actionBtn: {
    width: 46, height: 46, borderRadius: 14, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  connectBtn: {
    flex: 1, height: 46, borderRadius: 14,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8, overflow: 'hidden',
  },
  connectText: { color: '#FFF', fontSize: 15, fontFamily: 'Inter-SemiBold' },
});

export default UserCard;
