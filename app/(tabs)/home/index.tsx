import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useAppSelector } from '../../../store';
import { darkTheme, lightTheme } from '../../../constants/Theme';
import { UserCard } from '../../../components/user/UserCard';
import { Avatar } from '../../../components/ui/Avatar';
import { Badge } from '../../../components/ui/Badge';
import { UserCardSkeleton } from '../../../components/ui/Skeleton';
import { supabase } from '../../../lib/supabase';
import type { User, Community } from '../../../types';

// Fetch nearby recommended users
async function fetchRecommendations(userId: string): Promise<User[]> {
  // Note: .select() cannot be chained on RPC — RPC already returns selected data
  const { data } = await supabase
    .rpc('get_nearby_users', { p_user_id: userId, p_limit: 20 });
  return (data as User[]) ?? [];
}

async function fetchTrendingCommunities(): Promise<Community[]> {
  const { data } = await supabase
    .from('communities')
    .select('*, member_count')
    .eq('type', 'public')
    .order('member_count', { ascending: false })
    .limit(6);
  return (data as Community[]) ?? [];
}

const QUICK_ACTIONS = [
  { icon: 'search-outline' as const,        label: 'Discover',  route: '/discover'     },
  { icon: 'people-outline' as const,        label: 'Groups',    route: '/communities'  },
  { icon: 'calendar-outline' as const,      label: 'Events',    route: '/events'       },
  { icon: 'chatbubbles-outline' as const,   label: 'Messages',  route: '/chat'         },
] as const;

export default function HomeScreen() {
  const isDark   = useAppSelector(s => s.theme.resolvedMode === 'dark');
  const theme    = isDark ? darkTheme : lightTheme;
  const user     = useAppSelector(s => s.auth.user);
  const unread   = useAppSelector(s => s.notifications.unreadCount);
  const [refreshing, setRefreshing] = useState(false);

  const { data: recs, isLoading: recsLoading, refetch: refetchRecs } = useQuery({
    queryKey: ['recommendations', user?.id],
    queryFn:  () => fetchRecommendations(user!.id),
    enabled:  !!user?.id,
  });

  const { data: communities, refetch: refetchCommunities } = useQuery({
    queryKey: ['trending-communities'],
    queryFn:  fetchTrendingCommunities,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchRecs(), refetchCommunities()]);
    setRefreshing(false);
  }, []);

  const firstName = user?.name?.split(' ')[0] ?? 'Explorer';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? '☀️ Good morning' : hour < 17 ? '👋 Good afternoon' : '🌙 Good evening';

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* ── Header ── */}
        <LinearGradient
          colors={isDark ? ['#1A0533', '#0A0A1B'] : ['#EDE9FE', '#F8F7FF']}
          style={styles.headerGradient}
        >
          <SafeAreaView>
            <View style={styles.headerRow}>
              <View>
                <Text style={[styles.greeting, { color: theme.colors.textSecondary }]}>
                  {greeting},
                </Text>
                <Text style={[styles.headerName, { color: theme.colors.text }]}>
                  {firstName}! 🚀
                </Text>
              </View>
              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={[styles.iconBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                  onPress={() => router.push('/search')}
                >
                  <Ionicons name="search-outline" size={20} color={theme.colors.text} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.iconBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                  onPress={() => router.push('/notifications')}
                >
                  <Ionicons name="notifications-outline" size={20} color={theme.colors.text} />
                  {unread > 0 && (
                    <View style={[styles.badge, { backgroundColor: theme.colors.error }]}>
                      <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
                  <Avatar uri={user?.avatar_url} name={user?.name} size="md" isOnline showBorder />
                </TouchableOpacity>
              </View>
            </View>

            {/* XP Strip */}
            {user && (
              <View style={[styles.xpStrip, { backgroundColor: theme.colors.glassStrong, borderColor: theme.colors.glassBorder }]}>
                <View style={styles.xpLeft}>
                  <LinearGradient
                    colors={theme.colors.gradientPrimary as any}
                    style={styles.levelBadge}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.levelText}>Lv {user.level}</Text>
                  </LinearGradient>
                  <Text style={[styles.xpText, { color: theme.colors.textSecondary }]}>
                    {user.xp.toLocaleString()} XP
                  </Text>
                </View>
                <View style={[styles.xpBarBg, { backgroundColor: theme.colors.border }]}>
                  <LinearGradient
                    colors={theme.colors.gradientPrimary as any}
                    style={[styles.xpBarFill, { width: `${(user.xp % 1000) / 10}%` }]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  />
                </View>
              </View>
            )}
          </SafeAreaView>
        </LinearGradient>

        {/* ── Quick Actions ── */}
        <View style={styles.section}>
          <View style={styles.quickActions}>
            {QUICK_ACTIONS.map(action => (
              <TouchableOpacity
                key={action.label}
                style={[styles.quickAction, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                onPress={() => router.push(action.route as any)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={theme.colors.gradientPrimary as any}
                  style={styles.quickActionIcon}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                >
                  <Ionicons name={action.icon} size={20} color="#FFF" />
                </LinearGradient>
                <Text style={[styles.quickActionLabel, { color: theme.colors.textSecondary }]}>
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── People Near You ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>People Near You ✨</Text>
              <Text style={[styles.sectionSub, { color: theme.colors.textSecondary }]}>
                AI-matched based on your interests
              </Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/discover')}>
              <Text style={[styles.seeAll, { color: theme.colors.primary }]}>See all</Text>
            </TouchableOpacity>
          </View>

          {recsLoading ? (
            <View style={{ gap: 12, paddingHorizontal: 20 }}>
              <UserCardSkeleton />
              <UserCardSkeleton />
            </View>
          ) : (
            <FlatList
              data={recs?.slice(0, 5) ?? []}
              keyExtractor={item => item.id}
              horizontal={false}
              scrollEnabled={false}
              contentContainerStyle={{ gap: 12 }}
              renderItem={({ item }) => (
                <UserCard user={item} />
              )}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Ionicons name="people-outline" size={40} color={theme.colors.textTertiary} />
                  <Text style={[styles.emptyText, { color: theme.colors.textTertiary }]}>
                    No recommendations yet.{'\n'}Complete your profile to get started!
                  </Text>
                </View>
              }
            />
          )}
        </View>

        {/* ── Trending Communities ── */}
        {communities && communities.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Trending Communities 🔥</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/communities')}>
                <Text style={[styles.seeAll, { color: theme.colors.primary }]}>See all</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={communities}
              keyExtractor={item => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.communityCard, {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                    ...theme.shadow.sm,
                  }]}
                  onPress={() => router.push(`/community/${item.id}`)}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={theme.colors.gradientHero as any}
                    style={styles.communityAvatar}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  >
                    <Text style={{ fontSize: 22 }}>
                      {item.category === 'tech' ? '💻' :
                       item.category === 'fitness' ? '💪' :
                       item.category === 'music' ? '🎵' : '🌟'}
                    </Text>
                  </LinearGradient>
                  <Text style={[styles.communityName, { color: theme.colors.text }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[styles.communityMeta, { color: theme.colors.textTertiary }]}>
                    {item.member_count.toLocaleString()} members
                  </Text>
                  <Badge label="Join" color="primary" size="sm" onPress={() => router.push(`/community/${item.id}`)} />
                </TouchableOpacity>
              )}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerGradient:   { paddingHorizontal: 20, paddingBottom: 20 },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', paddingTop: 12,
  },
  greeting:       { fontSize: 13, fontFamily: 'Inter-Regular' },
  headerName:     { fontSize: 24, fontFamily: 'Inter-Bold', letterSpacing: -0.5, marginTop: 2 },
  headerActions:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 12, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  badge: {
    position: 'absolute', top: -4, right: -4,
    width: 16, height: 16, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeText:      { color: '#FFF', fontSize: 9, fontFamily: 'Inter-Bold' },
  xpStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginTop: 16, padding: 10, borderRadius: 12, borderWidth: 1,
  },
  xpLeft:         { flexDirection: 'row', alignItems: 'center', gap: 8 },
  levelBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 8, alignItems: 'center',
  },
  levelText:      { color: '#FFF', fontSize: 11, fontFamily: 'Inter-Bold' },
  xpText:         { fontSize: 12, fontFamily: 'Inter-Medium' },
  xpBarBg: {
    flex: 1, height: 6, borderRadius: 3, overflow: 'hidden',
  },
  xpBarFill:      { height: '100%', borderRadius: 3 },
  section:        { paddingTop: 24 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', paddingHorizontal: 20, marginBottom: 12,
  },
  sectionTitle:   { fontSize: 18, fontFamily: 'Inter-Bold' },
  sectionSub:     { fontSize: 12, fontFamily: 'Inter-Regular', marginTop: 2 },
  seeAll:         { fontSize: 13, fontFamily: 'Inter-SemiBold', paddingTop: 4 },
  quickActions:   { flexDirection: 'row', paddingHorizontal: 20, gap: 10 },
  quickAction: {
    flex: 1, alignItems: 'center', gap: 8, padding: 14,
    borderRadius: 16, borderWidth: 1,
  },
  quickActionIcon: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  quickActionLabel: { fontSize: 11, fontFamily: 'Inter-Medium' },
  empty: { alignItems: 'center', padding: 40, gap: 12 },
  emptyText: { fontSize: 14, fontFamily: 'Inter-Regular', textAlign: 'center', lineHeight: 22 },
  communityCard: {
    width: 150, borderRadius: 18, padding: 14, borderWidth: 1, gap: 8,
  },
  communityAvatar: {
    width: 52, height: 52, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  communityName:  { fontSize: 14, fontFamily: 'Inter-SemiBold' },
  communityMeta:  { fontSize: 11, fontFamily: 'Inter-Regular' },
});
