import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Image, ActivityIndicator, Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppSelector } from '../../store';
import { darkTheme, lightTheme } from '../../constants/Theme';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { supabase } from '../../lib/supabase';
import { getOrCreateDirectChat } from '../../lib/chat';
import { safeBack } from '../../lib/navigation';
import type { User } from '../../types';

async function fetchUserProfile(id: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*, interests:user_interests(*), skills:user_skills(*), goals:user_goals(*)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as User;
}

async function checkFollowing(followerId: string, followingId: string) {
  const { data } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .maybeSingle();
  return !!data;
}

async function getFollowCounts(userId: string) {
  const [followers, following] = await Promise.all([
    supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', userId),
    supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', userId),
  ]);
  return { followers: followers.count ?? 0, following: following.count ?? 0 };
}

export default function UserProfileScreen() {
  const { id }      = useLocalSearchParams<{ id: string }>();
  const isDark      = useAppSelector(s => s.theme.resolvedMode === 'dark');
  const theme       = isDark ? darkTheme : lightTheme;
  const currentUser = useAppSelector(s => s.auth.user);
  const queryClient = useQueryClient();

  const isSelf = currentUser?.id === id;

  const { data: profile, isLoading } = useQuery({
    queryKey: ['user-profile', id],
    queryFn:  () => fetchUserProfile(id),
  });

  const { data: isFollowing } = useQuery({
    queryKey: ['following', currentUser?.id, id],
    queryFn:  () => checkFollowing(currentUser!.id, id),
    enabled: !!currentUser?.id && !isSelf,
  });

  const { data: counts } = useQuery({
    queryKey: ['follow-counts', id],
    queryFn:  () => getFollowCounts(id),
    enabled: !!id,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (isFollowing) {
        await supabase.from('follows').delete().eq('follower_id', currentUser!.id).eq('following_id', id);
      } else {
        await supabase.from('follows').insert({ follower_id: currentUser!.id, following_id: id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['following', currentUser?.id, id] });
      queryClient.invalidateQueries({ queryKey: ['follow-counts', id] });
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

  if (!profile) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
        <Text style={{ color: theme.colors.textSecondary }}>User not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: theme.colors.primary, fontFamily: 'Inter-SemiBold' }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Cover */}
        <View style={s.cover}>
          {profile.cover_url
            ? <Image source={{ uri: profile.cover_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            : <LinearGradient colors={theme.colors.gradientHero as any} style={StyleSheet.absoluteFill} />
          }
          <SafeAreaView>
            <TouchableOpacity style={s.backBtn} onPress={() => safeBack()}>
              <Ionicons name="arrow-back" size={20} color="#FFF" />
            </TouchableOpacity>
          </SafeAreaView>
        </View>

        <View style={[s.body, { backgroundColor: theme.colors.background }]}>
          {/* Avatar row */}
          <View style={s.avatarRow}>
            <View style={[s.avatarWrap, { borderColor: theme.colors.background }]}>
              <Avatar uri={profile.avatar_url} name={profile.name} size="3xl" isOnline={profile.is_online} isVerified={profile.is_verified} showBorder />
            </View>
            {!isSelf && (
              <View style={{ flexDirection: 'row', gap: 10, marginLeft: 'auto', alignSelf: 'flex-end', paddingBottom: 8 }}>
                {/* Message */}
                <TouchableOpacity
                  style={[s.actionBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
                  onPress={async () => {
                    if (!currentUser?.id) {
                      router.push(`/chat/${profile.id}`);
                      return;
                    }
                    try {
                      const chatId = await getOrCreateDirectChat(currentUser.id, profile.id);
                      router.push(`/chat/${chatId}`);
                    } catch {
                      router.push(`/chat/${profile.id}`);
                    }
                  }}
                >
                  <Ionicons name="chatbubble-outline" size={18} color={theme.colors.primary} />
                </TouchableOpacity>

                {/* Follow / Unfollow */}
                <TouchableOpacity
                  onPress={() => followMutation.mutate()}
                  disabled={followMutation.isPending}
                  style={[s.followBtn, { backgroundColor: isFollowing ? theme.colors.surface : theme.colors.primary, borderColor: theme.colors.border, borderWidth: isFollowing ? 1.5 : 0 }]}
                >
                  {followMutation.isPending
                    ? <ActivityIndicator color={isFollowing ? theme.colors.primary : '#FFF'} size="small" />
                    : <Text style={[s.followText, { color: isFollowing ? theme.colors.text : '#FFF' }]}>
                        {isFollowing ? 'Following' : 'Follow'}
                      </Text>
                  }
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Name */}
          <View style={s.nameSection}>
            <View style={s.nameRow}>
              <Text style={[s.name, { color: theme.colors.text }]}>{profile.name}</Text>
              {profile.is_verified && <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />}
              {profile.is_premium && (
                <LinearGradient colors={['#F59E0B', '#EF4444']} style={s.proBadge}>
                  <Ionicons name="star" size={9} color="#FFF" />
                  <Text style={s.proText}>PRO</Text>
                </LinearGradient>
              )}
            </View>
            <Text style={[s.username, { color: theme.colors.textSecondary }]}>@{profile.username}</Text>
            {profile.bio && <Text style={[s.bio, { color: theme.colors.textSecondary }]}>{profile.bio}</Text>}
            <View style={s.metaRow}>
              {profile.city && (
                <View style={s.metaItem}>
                  <Ionicons name="location-outline" size={13} color={theme.colors.textTertiary} />
                  <Text style={[s.metaText, { color: theme.colors.textTertiary }]}>{profile.city}</Text>
                </View>
              )}
              {profile.occupation && (
                <View style={s.metaItem}>
                  <Ionicons name="briefcase-outline" size={13} color={theme.colors.textTertiary} />
                  <Text style={[s.metaText, { color: theme.colors.textTertiary }]}>{profile.occupation}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Stats */}
          <View style={[s.stats, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            {[
              { label: 'Followers', value: counts?.followers ?? 0 },
              { label: 'Following', value: counts?.following ?? 0 },
              { label: 'Trust',     value: profile.trust_score   },
              { label: 'Level',     value: profile.level         },
            ].map((st, i) => (
              <React.Fragment key={st.label}>
                {i > 0 && <View style={{ width: 1, backgroundColor: theme.colors.border }} />}
                <View style={s.stat}>
                  <Text style={[s.statNum, { color: theme.colors.text }]}>{st.value}</Text>
                  <Text style={[s.statLabel, { color: theme.colors.textTertiary }]}>{st.label}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>

          {/* Interests */}
          {profile.interests && profile.interests.length > 0 && (
            <View style={s.section}>
              <Text style={[s.sectionTitle, { color: theme.colors.text }]}>Interests</Text>
              <View style={s.chips}>
                {profile.interests.map((i: any, idx: number) => (
                  <Badge key={idx} label={i.interest} color="primary" size="md" />
                ))}
              </View>
            </View>
          )}

          {/* Skills */}
          {profile.skills && profile.skills.length > 0 && (
            <View style={s.section}>
              <Text style={[s.sectionTitle, { color: theme.colors.text }]}>Skills</Text>
              <View style={s.chips}>
                {profile.skills.map((sk: any, idx: number) => (
                  <Badge key={idx} label={sk.skill} color="success" size="md" />
                ))}
              </View>
            </View>
          )}

          {/* Goals */}
          {profile.goals && profile.goals.length > 0 && (
            <View style={s.section}>
              <Text style={[s.sectionTitle, { color: theme.colors.text }]}>Goals</Text>
              {profile.goals.map((g: any, idx: number) => (
                <View key={idx} style={[s.goalRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <Ionicons name="flag-outline" size={14} color={theme.colors.primary} />
                  <Text style={[s.goalText, { color: theme.colors.textSecondary }]}>{g.goal}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  cover:       { height: 200, position: 'relative' },
  backBtn:     { margin: 16, width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  body:        { paddingHorizontal: 20 },
  avatarRow:   { flexDirection: 'row', marginTop: -48, marginBottom: 12, alignItems: 'flex-end' },
  avatarWrap:  { borderWidth: 4, borderRadius: 9999 },
  actionBtn:   { width: 42, height: 42, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  followBtn:   { height: 42, paddingHorizontal: 20, borderRadius: 12, alignItems: 'center', justifyContent: 'center', minWidth: 100 },
  followText:  { fontSize: 14, fontFamily: 'Inter-Bold' },
  nameSection: { gap: 4, marginBottom: 16 },
  nameRow:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name:        { fontSize: 22, fontFamily: 'Inter-Bold', letterSpacing: -0.5 },
  username:    { fontSize: 14, fontFamily: 'Inter-Regular' },
  bio:         { fontSize: 14, fontFamily: 'Inter-Regular', lineHeight: 21, marginTop: 4 },
  metaRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6 },
  metaItem:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText:    { fontSize: 12, fontFamily: 'Inter-Regular' },
  proBadge:    { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  proText:     { color: '#FFF', fontSize: 9, fontFamily: 'Inter-Bold' },
  stats:       { flexDirection: 'row', borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 20 },
  stat:        { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statNum:     { fontSize: 17, fontFamily: 'Inter-Bold' },
  statLabel:   { fontSize: 10, fontFamily: 'Inter-Regular', marginTop: 2 },
  section:     { marginBottom: 20 },
  sectionTitle:{ fontSize: 16, fontFamily: 'Inter-SemiBold', marginBottom: 10 },
  chips:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  goalRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  goalText:    { fontSize: 13, fontFamily: 'Inter-Regular', flex: 1 },
});