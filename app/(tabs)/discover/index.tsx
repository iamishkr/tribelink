import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useAppSelector } from '../../../store';
import { darkTheme, lightTheme } from '../../../constants/Theme';
import { UserCard } from '../../../components/user/UserCard';
import { Avatar } from '../../../components/ui/Avatar';
import { SearchBar } from '../../../components/ui/SearchBar';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { UserCardSkeleton } from '../../../components/ui/Skeleton';
import { supabase } from '../../../lib/supabase';
import { requestLocationPermissionsAndPosition } from '../../../lib/location';
import type { User, DiscoveryFilters } from '../../../types';

const DISTANCE_OPTIONS = [
  { label: '5km',       value: 5 },
  { label: '10km',      value: 10 },
  { label: '25km',      value: 25 },
  { label: '50km',      value: 50 },
  { label: '100km',     value: 100 },
  { label: '250km',     value: 250 },
  { label: 'Worldwide', value: 0 },
];

const SORT_OPTIONS = [
  { label: 'Best Match',  value: 'match'    },
  { label: 'Nearest',     value: 'distance' },
  { label: 'Most Active', value: 'activity' },
  { label: 'New Members', value: 'recent'   },
];

const AVAILABILITY_OPTIONS = [
  { label: 'All',       value: 'all' },
  { label: 'Flexible',  value: 'flexible' },
  { label: 'Weekdays',  value: 'weekdays' },
  { label: 'Weekends',  value: 'weekends' },
  { label: 'Evenings',  value: 'evenings' },
];

async function fetchDiscoverUsers(
  userId: string,
  filters: Partial<DiscoveryFilters> & { availability?: string },
  sort: string,
  search: string,
): Promise<User[]> {
  const { data, error } = await supabase.rpc('discover_users', {
    p_user_id:   userId,
    p_max_km:    filters.maxDistance ?? 25,
    p_interests: filters.interests ?? [],
    p_sort_by:   sort,
    p_search:    search,
    p_limit:     30,
  });

  if (error) {
    console.error('[DiscoverRPC] Error:', error);
    throw error;
  }

  let results = (data as User[]) ?? [];

  if (filters.availability && filters.availability !== 'all') {
    results = results.filter(u =>
      u.availability === filters.availability || u.availability === 'flexible'
    );
  }

  return results;
}

// Compact card for grid mode
function UserGridCard({ user }: { user: User }) {
  const isDark = useAppSelector(s => s.theme.resolvedMode === 'dark');
  const theme  = isDark ? darkTheme : lightTheme;
  return (
    <TouchableOpacity
      style={[gridStyles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
      onPress={() => router.push(`/user/${user.id}` as any)}
      activeOpacity={0.85}
    >
      <LinearGradient
        colors={theme.colors.gradientPrimary as any}
        style={gridStyles.avatarBg}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      >
        <Avatar uri={user.avatar_url} name={user.name} size="lg" isOnline={user.is_online} />
      </LinearGradient>
      <Text style={[gridStyles.name, { color: theme.colors.text }]} numberOfLines={1}>{user.name}</Text>
      {user.occupation && (
        <Text style={[gridStyles.sub, { color: theme.colors.textTertiary }]} numberOfLines={1}>{user.occupation}</Text>
      )}

      <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap', justifyContent: 'center', marginTop: 2 }}>
        {user.match_score != null && user.match_score > 0 && (
          <View style={[gridStyles.match, { backgroundColor: theme.colors.primary + '22' }]}>
            <Text style={[gridStyles.matchText, { color: theme.colors.primary }]}>{user.match_score}% match</Text>
          </View>
        )}
        <View style={[gridStyles.match, { backgroundColor: theme.colors.surface }]}>
          <Text style={[gridStyles.matchText, { color: theme.colors.textSecondary }]}>
            {user.distance_km != null
              ? user.distance_km < 1
                ? `${Math.round(user.distance_km * 1000)}m`
                : `${user.distance_km.toFixed(1)}km`
              : (user.city || 'Nearby')}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const gridStyles = StyleSheet.create({
  card:      { flex: 1, borderRadius: 18, borderWidth: 1, overflow: 'hidden', alignItems: 'center', padding: 14, gap: 4 },
  avatarBg:  { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  name:      { fontSize: 13, fontFamily: 'Inter-SemiBold', textAlign: 'center' },
  sub:       { fontSize: 11, fontFamily: 'Inter-Regular', textAlign: 'center' },
  match:     { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  matchText: { fontSize: 10, fontFamily: 'Inter-SemiBold' },
});

export default function DiscoverScreen() {
  const isDark  = useAppSelector(s => s.theme.resolvedMode === 'dark');
  const theme   = isDark ? darkTheme : lightTheme;
  const user    = useAppSelector(s => s.auth.user);

  const [search, setSearch]               = useState('');
  const [sort, setSort]                   = useState('match');
  const [maxKm, setMaxKm]                 = useState(25);
  const [availability, setAvailability]   = useState('all');
  const [viewMode, setViewMode]           = useState<'list' | 'grid'>('list');
  const [refreshing, setRefreshing]       = useState(false);
  const [locUpdating, setLocUpdating]     = useState(false);

  const { data: users, isLoading, refetch } = useQuery({
    queryKey: ['discover', user?.id, sort, maxKm, availability, search],
    queryFn:  () => fetchDiscoverUsers(user!.id, { maxDistance: maxKm, availability }, sort, search),
    enabled:  !!user?.id,
  });

  const syncUserLocation = async () => {
    if (!user?.id) return;
    setLocUpdating(true);
    try {
      const res = await requestLocationPermissionsAndPosition(user.id);
      if (res.granted) {
        await refetch();
        Alert.alert('📍 Location Updated', `Your location is set to ${res.city || 'current position'}.`);
      }
    } finally {
      setLocUpdating(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <View style={styles.headerTop}>
            <View>
              <Text style={[styles.title, { color: theme.colors.text }]}>Discover 🧭</Text>
              <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                {users?.length ?? 0} members found
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {/* Location Sync Button */}
              <TouchableOpacity
                onPress={syncUserLocation}
                disabled={locUpdating}
                style={[styles.iconBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              >
                {locUpdating ? (
                  <ActivityIndicator size={16} color={theme.colors.primary} />
                ) : (
                  <Ionicons name="location" size={18} color={theme.colors.primary} />
                )}
              </TouchableOpacity>

              {/* View Toggle */}
              <TouchableOpacity
                onPress={() => setViewMode(v => v === 'list' ? 'grid' : 'list')}
                style={[styles.iconBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              >
                <Ionicons
                  name={viewMode === 'list' ? 'grid-outline' : 'list-outline'}
                  size={18}
                  color={theme.colors.text}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Bar */}
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search name, interests, skills, city..."
            onClear={() => setSearch('')}
            style={{ marginTop: 12 }}
          />

          {/* Distance Filter Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
            <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 4 }}>
              {DISTANCE_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setMaxKm(opt.value)}
                  style={[styles.filterChip, {
                    backgroundColor: maxKm === opt.value ? theme.colors.primary : theme.colors.surface,
                    borderColor: maxKm === opt.value ? theme.colors.primary : theme.colors.border,
                  }]}
                >
                  <Ionicons
                    name="location-outline"
                    size={12}
                    color={maxKm === opt.value ? '#FFF' : theme.colors.textSecondary}
                  />
                  <Text style={[styles.filterChipText, {
                    color: maxKm === opt.value ? '#FFF' : theme.colors.textSecondary,
                  }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Sort & Availability Filter Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 4 }}>
              {/* Sort chips */}
              {SORT_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setSort(opt.value)}
                  style={[styles.filterChip, {
                    backgroundColor: sort === opt.value ? 'rgba(124,58,237,0.15)' : 'transparent',
                    borderColor: sort === opt.value ? theme.colors.primary : theme.colors.border,
                  }]}
                >
                  <Text style={[styles.filterChipText, {
                    color: sort === opt.value ? theme.colors.primary : theme.colors.textSecondary,
                    fontFamily: sort === opt.value ? 'Inter-SemiBold' : 'Inter-Regular',
                  }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}

              <View style={{ width: 1, height: 20, backgroundColor: theme.colors.border, alignSelf: 'center' }} />

              {/* Availability chips */}
              {AVAILABILITY_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setAvailability(opt.value)}
                  style={[styles.filterChip, {
                    backgroundColor: availability === opt.value ? 'rgba(52,211,153,0.15)' : 'transparent',
                    borderColor: availability === opt.value ? theme.colors.success : theme.colors.border,
                  }]}
                >
                  <Text style={[styles.filterChipText, {
                    color: availability === opt.value ? theme.colors.success : theme.colors.textSecondary,
                    fontFamily: availability === opt.value ? 'Inter-SemiBold' : 'Inter-Regular',
                  }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* User List / Grid */}
        {isLoading ? (
          <ScrollView contentContainerStyle={{ gap: 12, padding: 20 }}>
            {Array.from({ length: 4 }).map((_, i) => <UserCardSkeleton key={i} />)}
          </ScrollView>
        ) : (
          <FlatList
            key={viewMode}
            data={users ?? []}
            keyExtractor={item => item.id}
            numColumns={viewMode === 'grid' ? 2 : 1}
            columnWrapperStyle={viewMode === 'grid' ? { gap: 12, paddingHorizontal: 20 } : undefined}
            contentContainerStyle={{ gap: 12, paddingVertical: 16, paddingBottom: 100 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
            }
            renderItem={({ item }) =>
              viewMode === 'list'
                ? <UserCard user={item} />
                : <UserGridCard user={item} />
            }
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="compass-outline" size={52} color={theme.colors.textTertiary} />
                <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                  No members found
                </Text>
                <Text style={[styles.emptyText, { color: theme.colors.textTertiary }]}>
                  Try increasing distance radius or resetting your search filters
                </Text>
                <Button
                  title="📍 Update Your Location"
                  onPress={syncUserLocation}
                  variant="outline"
                  size="md"
                  style={{ marginTop: 8 }}
                />
              </View>
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1,
  },
  headerTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 8 },
  title:        { fontSize: 26, fontFamily: 'Inter-Bold', letterSpacing: -0.5 },
  subtitle:     { fontSize: 13, fontFamily: 'Inter-Regular', marginTop: 2 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 12, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 9999, borderWidth: 1.5,
  },
  filterChipText: { fontSize: 12, fontFamily: 'Inter-Medium' },
  empty:         { alignItems: 'center', padding: 40, gap: 12 },
  emptyTitle:    { fontSize: 18, fontFamily: 'Inter-SemiBold' },
  emptyText:     { fontSize: 14, fontFamily: 'Inter-Regular', textAlign: 'center', lineHeight: 22 },
});
