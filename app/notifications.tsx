import React, { useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { useAppSelector } from '../store';
import { darkTheme, lightTheme } from '../constants/Theme';
import { Avatar } from '../components/ui/Avatar';
import { supabase } from '../lib/supabase';
import { safeBack } from '../lib/navigation';
import type { Notification } from '../types';

type IconMap = Record<Notification['type'], { name: string; color: string }>;

const ICON_MAP: IconMap = {
  like:               { name: 'heart',                 color: '#EF4444' },
  comment:            { name: 'chatbubble',             color: '#3B82F6' },
  follow:             { name: 'person-add',             color: '#7C3AED' },
  mention:            { name: 'at',                    color: '#F59E0B' },
  message:            { name: 'chatbubbles',            color: '#10B981' },
  community_invite:   { name: 'people',                 color: '#6366F1' },
  event_reminder:     { name: 'calendar',               color: '#F97316' },
  ai_recommendation:  { name: 'sparkles',               color: '#8B5CF6' },
  achievement:        { name: 'trophy',                 color: '#EAB308' },
  weekly_summary:     { name: 'bar-chart',              color: '#14B8A6' },
};

async function fetchNotifications(userId: string): Promise<Notification[]> {
  const { data } = await supabase
    .from('notifications')
    .select('*, actor:profiles(id,name,avatar_url)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  return (data as Notification[]) ?? [];
}

async function markAllRead(userId: string) {
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);
}

export default function NotificationsScreen() {
  const isDark = useAppSelector(s => s.theme.resolvedMode === 'dark');
  const theme  = isDark ? darkTheme : lightTheme;
  const user   = useAppSelector(s => s.auth.user);

  const { data: notifications, isLoading, refetch } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn:  () => fetchNotifications(user!.id),
    enabled:  !!user?.id,
  });

  const handleMarkAllRead = async () => {
    if (!user?.id) return;
    await markAllRead(user.id);
    refetch();
  };

  const unreadCount = notifications?.filter(n => !n.is_read).length ?? 0;

  // Fix #14: route to the correct screen based on notification type + data
  const handleNotifPress = (item: Notification) => {
    const data = item.data as Record<string, string>;
    if (item.type === 'community_invite' && data?.community_id) {
      router.push(`/community/${data.community_id}` as any);
    } else if (item.type === 'event_reminder' && data?.event_id) {
      router.push(`/event/${data.event_id}` as any);
    } else if (item.type === 'message' && data?.chat_id) {
      router.push(`/chat/${data.chat_id}` as any);
    } else if ((item.type === 'follow' || item.type === 'mention') && data?.user_id) {
      router.push(`/user/${data.user_id}` as any);
    } else if ((item.type === 'like' || item.type === 'comment') && data?.post_id) {
      router.push(`/post/${data.post_id}` as any);
    }
  };

  const renderItem = ({ item }: { item: Notification }) => {
    const icon = ICON_MAP[item.type] ?? { name: 'notifications', color: theme.colors.primary };
    return (
      <TouchableOpacity
        style={[
          s.item,
          {
            backgroundColor: item.is_read ? theme.colors.card : (isDark ? 'rgba(124,58,237,0.12)' : 'rgba(124,58,237,0.06)'),
            borderColor: theme.colors.border,
          },
        ]}
        activeOpacity={0.8}
        onPress={() => handleNotifPress(item)}
      >
        {/* Unread dot */}
        {!item.is_read && <View style={[s.unreadDot, { backgroundColor: theme.colors.primary }]} />}

        {/* Icon or Actor avatar */}
        {item.actor ? (
          <Avatar uri={(item.actor as any).avatar_url} name={(item.actor as any).name} size="md" />
        ) : (
          <View style={[s.iconWrap, { backgroundColor: icon.color + '22' }]}>
            <Ionicons name={icon.name as any} size={20} color={icon.color} />
          </View>
        )}

        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[s.notifTitle, { color: theme.colors.text }]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[s.notifBody, { color: theme.colors.textSecondary }]} numberOfLines={2}>
            {item.body}
          </Text>
          <Text style={[s.notifTime, { color: theme.colors.textTertiary }]}>
            {formatDistanceToNow(parseISO(item.created_at), { addSuffix: true })}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => safeBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[s.title, { color: theme.colors.text }]}>Notifications</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={[s.markAll, { color: theme.colors.primary }]}>Mark all read</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 70 }} />
        )}
      </View>

      {unreadCount > 0 && (
        <View style={[s.unreadBanner, { backgroundColor: isDark ? 'rgba(124,58,237,0.15)' : 'rgba(124,58,237,0.08)' }]}>
          <Ionicons name="ellipse" size={8} color={theme.colors.primary} />
          <Text style={[s.unreadText, { color: theme.colors.primary }]}>
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </Text>
        </View>
      )}

      <FlatList
        data={notifications ?? []}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={theme.colors.primary} />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={s.empty}>
              <Ionicons name="notifications-outline" size={64} color={theme.colors.textTertiary} />
              <Text style={[s.emptyTitle, { color: theme.colors.text }]}>All caught up! 🎉</Text>
              <Text style={[s.emptyText, { color: theme.colors.textTertiary }]}>
                You have no notifications yet.{'\n'}Come back after connecting with your tribe.
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1 },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  title:        { fontSize: 20, fontFamily: 'Inter-Bold' },
  markAll:      { fontSize: 13, fontFamily: 'Inter-SemiBold' },
  unreadBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 8 },
  unreadText:   { fontSize: 13, fontFamily: 'Inter-Medium' },
  item: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    padding: 14, borderRadius: 16, borderWidth: 1, position: 'relative',
  },
  unreadDot:  { position: 'absolute', top: 14, right: 14, width: 8, height: 8, borderRadius: 4 },
  iconWrap:   { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  notifTitle: { fontSize: 14, fontFamily: 'Inter-SemiBold' },
  notifBody:  { fontSize: 13, fontFamily: 'Inter-Regular', lineHeight: 19 },
  notifTime:  { fontSize: 11, fontFamily: 'Inter-Regular', marginTop: 2 },
  empty:      { alignItems: 'center', padding: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontFamily: 'Inter-SemiBold' },
  emptyText:  { fontSize: 14, fontFamily: 'Inter-Regular', textAlign: 'center', lineHeight: 22 },
});