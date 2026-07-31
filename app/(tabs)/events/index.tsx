import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Image, ScrollView, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { useAppSelector } from '../../../store';
import { darkTheme, lightTheme } from '../../../constants/Theme';
import { Badge } from '../../../components/ui/Badge';
import { Avatar } from '../../../components/ui/Avatar';
import { CreateEventModal } from '../../../components/ui/CreateEventModal';
import { supabase } from '../../../lib/supabase';
import type { Event } from '../../../types';

const EVENT_TYPES = [
  { label: 'All',        value: null,      icon: '✨' },
  { label: 'Online',     value: 'online',  icon: '💻' },
  { label: 'Offline',    value: 'offline', icon: '📍' },
  { label: 'Study',      value: 'study',   icon: '📚' },
  { label: 'Hackathon',  value: 'hackathon',icon: '⚡' },
  { label: 'Workshop',   value: 'workshop',icon: '🛠️' },
  { label: 'Meetup',     value: 'meetup',  icon: '🤝' },
  { label: 'Fitness',    value: 'fitness', icon: '💪' },
];

function formatEventDate(dateStr: string): string {
  const d = parseISO(dateStr);
  if (isToday(d))    return `Today, ${format(d, 'h:mm a')}`;
  if (isTomorrow(d)) return `Tomorrow, ${format(d, 'h:mm a')}`;
  return format(d, 'MMM d, h:mm a');
}

async function fetchEvents(type: string | null): Promise<Event[]> {
  let query = supabase
    .from('events')
    .select('*, creator:profiles(id,name,avatar_url)')
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true });

  if (type) query = query.eq('category', type);
  const { data } = await query.limit(30);
  return (data as Event[]) ?? [];
}

function EventCard({ event }: { event: Event }) {
  const isDark = useAppSelector(s => s.theme.resolvedMode === 'dark');
  const theme  = isDark ? darkTheme : lightTheme;
  const isFull = event.capacity !== null && event.rsvp_count >= event.capacity;

  return (
    <TouchableOpacity
      style={[styles.eventCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
      onPress={() => router.push(`/event/${event.id}`)}
      activeOpacity={0.85}
    >
      {/* Cover */}
      <View style={styles.eventCover}>
        {event.cover_url ? (
          <Image source={{ uri: event.cover_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <LinearGradient colors={theme.colors.gradientPrimary as any} style={StyleSheet.absoluteFill} />
        )}
        {/* Date badge */}
        <View style={[styles.dateBadge, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.dateBadgeDay}>
            {format(parseISO(event.starts_at), 'd')}
          </Text>
          <Text style={styles.dateBadgeMonth}>
            {format(parseISO(event.starts_at), 'MMM')}
          </Text>
        </View>
        {/* Type badge */}
        <View style={[styles.eventTypeBadge, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <Ionicons
            name={event.type === 'online' ? 'videocam-outline' : 'location-outline'}
            size={10} color="#FFF"
          />
          <Text style={styles.eventTypeBadgeText}>{event.type}</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.eventContent}>
        <Text style={[styles.eventTitle, { color: theme.colors.text }]} numberOfLines={2}>
          {event.title}
        </Text>
        <View style={styles.eventMeta}>
          <Ionicons name="time-outline" size={12} color={theme.colors.textTertiary} />
          <Text style={[styles.eventMetaText, { color: theme.colors.textTertiary }]}>
            {formatEventDate(event.starts_at)}
          </Text>
        </View>
        {event.location_name && (
          <View style={styles.eventMeta}>
            <Ionicons name="location-outline" size={12} color={theme.colors.textTertiary} />
            <Text style={[styles.eventMetaText, { color: theme.colors.textTertiary }]} numberOfLines={1}>
              {event.location_name}
            </Text>
          </View>
        )}

        <View style={styles.eventFooter}>
          <View style={styles.rsvpInfo}>
            <Ionicons name="people-outline" size={12} color={theme.colors.textTertiary} />
            <Text style={[styles.rsvpText, { color: theme.colors.textTertiary }]}>
              {event.rsvp_count}
              {event.capacity ? `/${event.capacity}` : ''}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.rsvpBtn, {
              backgroundColor: isFull ? theme.colors.border : theme.colors.primary,
            }]}
            disabled={isFull}
            onPress={() => router.push(`/event/${event.id}`)}
          >
            <Text style={styles.rsvpBtnText}>
              {isFull ? 'Full' : event.rsvp_status === 'going' ? 'Going ✓' : 'RSVP'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function EventsScreen() {
  const isDark = useAppSelector(s => s.theme.resolvedMode === 'dark');
  const theme  = isDark ? darkTheme : lightTheme;
  const [type, setType]           = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { data: events, isLoading, refetch } = useQuery({
    queryKey: ['events', type],
    queryFn:  () => fetchEvents(type),
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
              <Text style={[styles.title, { color: theme.colors.text }]}>Events 🎉</Text>
              <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                Meetups, workshops & more
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

          {/* Type filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
            <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 4 }}>
              {EVENT_TYPES.map(t => (
                <TouchableOpacity
                  key={t.label}
                  onPress={() => setType(t.value)}
                  style={[styles.typeChip, {
                    backgroundColor: type === t.value ? theme.colors.primary : theme.colors.surface,
                    borderColor: type === t.value ? theme.colors.primary : theme.colors.border,
                  }]}
                >
                  <Text style={{ fontSize: 14 }}>{t.icon}</Text>
                  <Text style={[styles.typeChipText, {
                    color: type === t.value ? '#FFF' : theme.colors.textSecondary,
                  }]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Events List */}
        <FlatList
          data={events ?? []}
          keyExtractor={item => item.id}
          contentContainerStyle={{ gap: 12, padding: 20, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing || isLoading} onRefresh={onRefresh} tintColor={theme.colors.primary} />
          }
          renderItem={({ item }) => <EventCard event={item} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontSize: 48 }}>🎉</Text>
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No events yet</Text>
              <Text style={[styles.emptyText, { color: theme.colors.textTertiary }]}>
                Create one and invite your tribe!
              </Text>
            </View>
          }
        />
      </SafeAreaView>

      <CreateEventModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => refetch()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header:        { paddingHorizontal: 20, paddingBottom: 12 },
  headerTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 8 },
  title:         { fontSize: 26, fontFamily: 'Inter-Bold', letterSpacing: -0.5 },
  subtitle:      { fontSize: 13, fontFamily: 'Inter-Regular', marginTop: 2 },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
  },
  createBtnText: { color: '#FFF', fontSize: 13, fontFamily: 'Inter-SemiBold' },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 9999, borderWidth: 1.5,
  },
  typeChipText:  { fontSize: 12, fontFamily: 'Inter-Medium' },
  eventCard: {
    borderRadius: 20, overflow: 'hidden', borderWidth: 1,
  },
  eventCover:    { height: 140, position: 'relative' },
  dateBadge: {
    position: 'absolute', top: 12, left: 12,
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  dateBadgeDay:   { color: '#FFF', fontSize: 18, fontFamily: 'Inter-Bold', lineHeight: 20 },
  dateBadgeMonth: { color: 'rgba(255,255,255,0.8)', fontSize: 10, fontFamily: 'Inter-SemiBold' },
  eventTypeBadge: {
    position: 'absolute', top: 12, right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  eventTypeBadgeText: { color: '#FFF', fontSize: 9, fontFamily: 'Inter-Medium' },
  eventContent:   { padding: 14, gap: 6 },
  eventTitle:     { fontSize: 16, fontFamily: 'Inter-Bold', lineHeight: 22 },
  eventMeta:      { flexDirection: 'row', alignItems: 'center', gap: 5 },
  eventMetaText:  { fontSize: 12, fontFamily: 'Inter-Regular', flex: 1 },
  eventFooter:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  rsvpInfo:       { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rsvpText:       { fontSize: 12, fontFamily: 'Inter-Regular' },
  rsvpBtn:        { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 10 },
  rsvpBtnText:    { color: '#FFF', fontSize: 12, fontFamily: 'Inter-SemiBold' },
  empty:          { alignItems: 'center', padding: 60, gap: 12 },
  emptyTitle:     { fontSize: 18, fontFamily: 'Inter-SemiBold' },
  emptyText:      { fontSize: 14, fontFamily: 'Inter-Regular', textAlign: 'center' },
});
