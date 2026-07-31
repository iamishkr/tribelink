import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Image, ActivityIndicator, Alert, Linking,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, isPast } from 'date-fns';
import { useAppSelector } from '../../store';
import { darkTheme, lightTheme } from '../../constants/Theme';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { supabase } from '../../lib/supabase';
import { safeBack } from '../../lib/navigation';
import type { Event } from '../../types';

async function fetchEvent(id: string) {
  const { data, error } = await supabase
    .from('events')
    .select('*, creator:profiles(id,name,avatar_url,is_verified)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as Event & { creator: any };
}

async function checkRsvp(eventId: string, userId: string) {
  const { data } = await supabase
    .from('event_rsvps')
    .select('status')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .maybeSingle();
  return data?.status as 'going' | 'maybe' | 'not_going' | null ?? null;
}

async function fetchAttendees(eventId: string) {
  const { data } = await supabase
    .from('event_rsvps')
    .select('user_id, status, profiles:user_id(id,name,avatar_url)')
    .eq('event_id', eventId)
    .eq('status', 'going')
    .limit(12);
  return data ?? [];
}

export default function EventDetailScreen() {
  const { id }      = useLocalSearchParams<{ id: string }>();
  const isDark      = useAppSelector(s => s.theme.resolvedMode === 'dark');
  const theme       = isDark ? darkTheme : lightTheme;
  const currentUser = useAppSelector(s => s.auth.user);
  const queryClient = useQueryClient();

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn:  () => fetchEvent(id),
  });

  const { data: rsvpStatus } = useQuery({
    queryKey: ['rsvp', id, currentUser?.id],
    queryFn:  () => checkRsvp(id, currentUser!.id),
    enabled: !!currentUser?.id && !!id,
  });

  const { data: attendees } = useQuery({
    queryKey: ['event-attendees', id],
    queryFn:  () => fetchAttendees(id),
    enabled: !!id,
  });

  const rsvpMutation = useMutation({
    mutationFn: async (status: 'going' | 'maybe' | 'not_going') => {
      if (rsvpStatus) {
        await supabase.from('event_rsvps').update({ status }).eq('event_id', id).eq('user_id', currentUser!.id);
      } else {
        await supabase.from('event_rsvps').insert({ event_id: id, user_id: currentUser!.id, status });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rsvp', id, currentUser?.id] });
      queryClient.invalidateQueries({ queryKey: ['event', id] });
      queryClient.invalidateQueries({ queryKey: ['event-attendees', id] });
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
        <Text style={{ color: theme.colors.textSecondary }}>Event not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: theme.colors.primary, fontFamily: 'Inter-SemiBold' }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isPastEvent = isPast(parseISO(event.ends_at ?? event.starts_at));
  const isFull = event.capacity !== null && event.rsvp_count >= event.capacity;
  const isGoing = rsvpStatus === 'going';

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
        {/* Cover */}
        <View style={s.cover}>
          {event.cover_url
            ? <Image source={{ uri: event.cover_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            : <LinearGradient colors={['#7C3AED', '#6366F1']} style={StyleSheet.absoluteFill} />
          }
          <SafeAreaView>
            <TouchableOpacity style={s.backBtn} onPress={() => safeBack()}>
              <Ionicons name="arrow-back" size={20} color="#FFF" />
            </TouchableOpacity>
          </SafeAreaView>
          {/* Date badge */}
          <View style={[s.dateBadge, { backgroundColor: theme.colors.primary }]}>
            <Text style={s.dateDay}>{format(parseISO(event.starts_at), 'd')}</Text>
            <Text style={s.dateMonth}>{format(parseISO(event.starts_at), 'MMM')}</Text>
          </View>
        </View>

        <View style={[s.body, { backgroundColor: theme.colors.background }]}>
          {/* Title */}
          <Text style={[s.title, { color: theme.colors.text }]}>{event.title}</Text>

          {/* Type & category badges */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, marginBottom: 16 }}>
            <Badge label={event.type} color="primary" size="sm" />
            <Badge label={event.category} color="neutral" size="sm" />
            {event.is_free
              ? <Badge label="Free" color="success" size="sm" />
              : <Badge label={`₹${event.price ?? ''}`} color="warning" size="sm" />
            }
            {isPastEvent && <Badge label="Past" color="neutral" size="sm" />}
          </View>

          {/* Info tiles */}
          {[
            { icon: 'time-outline',     label: 'Date & Time', value: `${format(parseISO(event.starts_at), 'EEE, MMM d yyyy · h:mm a')}` },
            event.location_name ? { icon: 'location-outline', label: 'Location', value: event.location_name } : null,
            event.meeting_url   ? { icon: 'link-outline',    label: 'Meeting Link', value: 'Tap to open', action: () => Linking.openURL(event.meeting_url!) } : null,
            { icon: 'people-outline',   label: 'Attendees', value: event.capacity ? `${event.rsvp_count} / ${event.capacity}` : `${event.rsvp_count} going` },
          ].filter(Boolean).map((tile: any, i) => (
            <TouchableOpacity
              key={i}
              onPress={tile.action}
              style={[s.infoTile, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              activeOpacity={tile.action ? 0.7 : 1}
            >
              <View style={[s.infoIcon, { backgroundColor: theme.colors.primary + '22' }]}>
                <Ionicons name={tile.icon} size={18} color={theme.colors.primary} />
              </View>
              <View>
                <Text style={[s.infoLabel, { color: theme.colors.textTertiary }]}>{tile.label}</Text>
                <Text style={[s.infoValue, { color: tile.action ? theme.colors.primary : theme.colors.text }]}>{tile.value}</Text>
              </View>
              {tile.action && <Ionicons name="open-outline" size={14} color={theme.colors.primary} style={{ marginLeft: 'auto' }} />}
            </TouchableOpacity>
          ))}

          {/* RSVP buttons */}
          {!isPastEvent && (
            <View style={s.rsvpSection}>
              <Text style={[s.sectionTitle, { color: theme.colors.text }]}>Your RSVP</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {(['going', 'maybe', 'not_going'] as const).map(opt => {
                  const active = rsvpStatus === opt;
                  const labels: Record<string, string> = { going: '✅  Going', maybe: '🤔  Maybe', not_going: '❌  Can\'t go' };
                  return (
                    <TouchableOpacity
                      key={opt}
                      onPress={() => rsvpMutation.mutate(opt)}
                      disabled={rsvpMutation.isPending || (isFull && opt === 'going' && !isGoing)}
                      style={[s.rsvpBtn, {
                        flex: 1,
                        backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                        borderColor: active ? theme.colors.primary : theme.colors.border,
                        opacity: (isFull && opt === 'going' && !isGoing) ? 0.5 : 1,
                      }]}
                    >
                      <Text style={[s.rsvpBtnText, { color: active ? '#FFF' : theme.colors.textSecondary }]}>
                        {labels[opt]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {isFull && !isGoing && (
                <Text style={[s.fullText, { color: theme.colors.textTertiary }]}>This event is full.</Text>
              )}
            </View>
          )}

          {/* Description */}
          <View style={s.section}>
            <Text style={[s.sectionTitle, { color: theme.colors.text }]}>About</Text>
            <Text style={[s.description, { color: theme.colors.textSecondary }]}>{event.description}</Text>
          </View>

          {/* Creator */}
          {event.creator && (
            <View style={s.section}>
              <Text style={[s.sectionTitle, { color: theme.colors.text }]}>Hosted by</Text>
              <TouchableOpacity
                style={[s.creatorRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                onPress={() => router.push(`/user/${event.creator.id}`)}
                activeOpacity={0.8}
              >
                <Avatar uri={event.creator.avatar_url} name={event.creator.name} size="md" isVerified={event.creator.is_verified} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.creatorName, { color: theme.colors.text }]}>{event.creator.name}</Text>
                  <Text style={[s.creatorRole, { color: theme.colors.textTertiary }]}>Organizer</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.textTertiary} />
              </TouchableOpacity>
            </View>
          )}

          {/* Attendees */}
          {attendees && attendees.length > 0 && (
            <View style={s.section}>
              <Text style={[s.sectionTitle, { color: theme.colors.text }]}>
                Going ({event.rsvp_count})
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {attendees.map((a: any) => (
                  <TouchableOpacity
                    key={a.user_id}
                    style={{ alignItems: 'center', width: 56, gap: 4 }}
                    onPress={() => router.push(`/user/${a.user_id}`)}
                  >
                    <Avatar uri={a.profiles?.avatar_url} name={a.profiles?.name} size="lg" />
                    <Text style={[s.attendeeName, { color: theme.colors.textTertiary }]} numberOfLines={1}>
                      {a.profiles?.name?.split(' ')[0]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  cover:       { height: 240, position: 'relative' },
  backBtn:     { margin: 16, width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  dateBadge:   { position: 'absolute', bottom: 16, left: 20, width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dateDay:     { color: '#FFF', fontSize: 20, fontFamily: 'Inter-Bold', lineHeight: 22 },
  dateMonth:   { color: 'rgba(255,255,255,0.8)', fontSize: 10, fontFamily: 'Inter-SemiBold' },
  body:        { paddingHorizontal: 20, paddingTop: 20 },
  title:       { fontSize: 24, fontFamily: 'Inter-Bold', letterSpacing: -0.5 },
  infoTile:    { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 10 },
  infoIcon:    { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  infoLabel:   { fontSize: 11, fontFamily: 'Inter-Regular' },
  infoValue:   { fontSize: 14, fontFamily: 'Inter-SemiBold', marginTop: 1 },
  rsvpSection: { marginBottom: 24 },
  rsvpBtn:     { height: 42, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  rsvpBtnText: { fontSize: 12, fontFamily: 'Inter-SemiBold' },
  fullText:    { fontSize: 12, fontFamily: 'Inter-Regular', textAlign: 'center', marginTop: 6 },
  section:     { marginBottom: 24 },
  sectionTitle:{ fontSize: 16, fontFamily: 'Inter-SemiBold', marginBottom: 12 },
  description: { fontSize: 14, fontFamily: 'Inter-Regular', lineHeight: 22 },
  creatorRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  creatorName: { fontSize: 15, fontFamily: 'Inter-SemiBold' },
  creatorRole: { fontSize: 12, fontFamily: 'Inter-Regular', marginTop: 2 },
  attendeeName:{ fontSize: 10, fontFamily: 'Inter-Regular', textAlign: 'center' },
});