import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Image, ScrollView, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useAppSelector } from '../../../store';
import { darkTheme, lightTheme } from '../../../constants/Theme';
import { SearchBar } from '../../../components/ui/SearchBar';
import { Badge } from '../../../components/ui/Badge';
import { CreateCommunityModal } from '../../../components/ui/CreateCommunityModal';
import { supabase } from '../../../lib/supabase';
import type { Community } from '../../../types';

const CATEGORIES = [
  { label: 'All',        icon: '✨', value: null           },
  { label: 'Tech',       icon: '💻', value: 'tech'         },
  { label: 'Study',      icon: '📚', value: 'study'        },
  { label: 'Startup',    icon: '🚀', value: 'startup'      },
  { label: 'Fitness',    icon: '💪', value: 'fitness'      },
  { label: 'Creative',   icon: '🎨', value: 'creative'     },
  { label: 'Gaming',     icon: '🎮', value: 'gaming'       },
  { label: 'Travel',     icon: '✈️', value: 'travel'       },
  { label: 'Music',      icon: '🎵', value: 'music'        },
];

async function fetchCommunities(category: string | null, search: string): Promise<Community[]> {
  let query = supabase
    .from('communities')
    .select('*, member_count')
    .eq('type', 'public')
    .order('member_count', { ascending: false });

  if (category) query = query.eq('category', category);
  if (search)   query = query.ilike('name', `%${search}%`);

  const { data } = await query.limit(30);
  return (data as Community[]) ?? [];
}

function CommunityCard({ community }: { community: Community }) {
  const isDark = useAppSelector(s => s.theme.resolvedMode === 'dark');
  const theme  = isDark ? darkTheme : lightTheme;

  const emoji = CATEGORIES.find(c => c.value === community.category)?.icon ?? '🌟';

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, ...theme.shadow.sm }]}
      onPress={() => router.push(`/community/${community.id}`)}
      activeOpacity={0.85}
    >
      {/* Cover */}
      <View style={styles.cardCover}>
        {community.cover_url ? (
          <Image source={{ uri: community.cover_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <LinearGradient colors={theme.colors.gradientHero as any} style={StyleSheet.absoluteFill} />
        )}
        <View style={styles.cardCoverOverlay}>
          <Text style={{ fontSize: 32 }}>{emoji}</Text>
        </View>
        <View style={[styles.typeBadge, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <Ionicons
            name={community.type === 'private' ? 'lock-closed' : 'globe-outline'}
            size={10} color="#FFF"
          />
          <Text style={styles.typeBadgeText}>{community.type}</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.cardContent}>
        <Text style={[styles.cardName, { color: theme.colors.text }]} numberOfLines={1}>
          {community.name}
        </Text>
        <Text style={[styles.cardDesc, { color: theme.colors.textSecondary }]} numberOfLines={2}>
          {community.description}
        </Text>
        <View style={styles.cardFooter}>
          <View style={styles.memberRow}>
            <Ionicons name="people-outline" size={12} color={theme.colors.textTertiary} />
            <Text style={[styles.memberCount, { color: theme.colors.textTertiary }]}>
              {community.member_count.toLocaleString()}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.joinBtn, { backgroundColor: theme.colors.primary }]}
            onPress={() => router.push(`/community/${community.id}`)}
          >
            <Text style={styles.joinBtnText}>
              {community.is_member ? 'View' : 'Join'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function CommunitiesScreen() {
  const isDark = useAppSelector(s => s.theme.resolvedMode === 'dark');
  const theme  = isDark ? darkTheme : lightTheme;

  const [search, setSearch]         = useState('');
  const [category, setCategory]     = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const { data: communities, isLoading, refetch } = useQuery({
    queryKey: ['communities', category, search],
    queryFn:  () => fetchCommunities(category, search),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={[styles.title, { color: theme.colors.text }]}>Communities 🏘️</Text>
              <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                Find your tribe
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.createBtn, { backgroundColor: theme.colors.primary }]}
              onPress={() => setShowCreate(true)}
            >
              <Ionicons name="add" size={20} color="#FFF" />
              <Text style={styles.createBtnText}>Create</Text>
            </TouchableOpacity>
          </View>

          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search communities..."
            onClear={() => setSearch('')}
            style={{ marginTop: 12 }}
          />

          {/* Category Filters */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
            <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 4 }}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat.label}
                  onPress={() => setCategory(cat.value)}
                  style={[styles.catChip, {
                    backgroundColor: category === cat.value
                      ? theme.colors.primary
                      : theme.colors.surface,
                    borderColor: category === cat.value
                      ? theme.colors.primary
                      : theme.colors.border,
                  }]}
                >
                  <Text style={{ fontSize: 14 }}>{cat.icon}</Text>
                  <Text style={[styles.catText, {
                    color: category === cat.value ? '#FFF' : theme.colors.textSecondary,
                  }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* List */}
        <FlatList
          data={communities ?? []}
          keyExtractor={item => item.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 20 }}
          contentContainerStyle={{ gap: 12, paddingTop: 16, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
          }
          renderItem={({ item }) => <CommunityCard community={item} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 48 }}>🏘️</Text>
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No communities yet</Text>
              <Text style={[styles.emptyText, { color: theme.colors.textTertiary }]}>
                Be the first to create one!
              </Text>
            </View>
          }
        />
      </SafeAreaView>

      <CreateCommunityModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => refetch()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header:         { paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1 },
  headerTop:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 8 },
  title:          { fontSize: 26, fontFamily: 'Inter-Bold', letterSpacing: -0.5 },
  subtitle:       { fontSize: 13, fontFamily: 'Inter-Regular', marginTop: 2 },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
  },
  createBtnText:  { color: '#FFF', fontSize: 13, fontFamily: 'Inter-SemiBold' },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 9999, borderWidth: 1.5,
  },
  catText:        { fontSize: 12, fontFamily: 'Inter-Medium' },
  card:           { flex: 1, borderRadius: 18, overflow: 'hidden', borderWidth: 1 },
  cardCover:      { height: 90, position: 'relative', alignItems: 'center', justifyContent: 'center' },
  cardCoverOverlay: { zIndex: 1 },
  typeBadge: {
    position: 'absolute', top: 8, right: 8,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  typeBadgeText:  { color: '#FFF', fontSize: 9, fontFamily: 'Inter-Medium' },
  cardContent:    { padding: 12, gap: 6 },
  cardName:       { fontSize: 14, fontFamily: 'Inter-Bold' },
  cardDesc:       { fontSize: 12, fontFamily: 'Inter-Regular', lineHeight: 17 },
  cardFooter:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  memberRow:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  memberCount:    { fontSize: 11, fontFamily: 'Inter-Regular' },
  joinBtn:        { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
  joinBtnText:    { color: '#FFF', fontSize: 11, fontFamily: 'Inter-SemiBold' },
  empty:          { alignItems: 'center', padding: 60, gap: 12 },
  emptyTitle:     { fontSize: 18, fontFamily: 'Inter-SemiBold' },
  emptyText:      { fontSize: 14, fontFamily: 'Inter-Regular', textAlign: 'center' },
});
