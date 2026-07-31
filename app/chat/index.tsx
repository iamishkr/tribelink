import React, { useCallback, useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { useAppSelector } from '../../store';
import { darkTheme, lightTheme } from '../../constants/Theme';
import { Avatar } from '../../components/ui/Avatar';
import { supabase } from '../../lib/supabase';
import { safeBack } from '../../lib/navigation';
import type { Chat } from '../../types';

async function fetchChats(userId: string): Promise<Chat[]> {
  const { data } = await supabase
    .from('chats')
    .select(`
      *,
      participants:chat_participants(
        user_id,
        profiles:user_id(id, name, avatar_url, is_online)
      ),
      last_message:messages(content, type, created_at, sender_id)
    `)
    .order('last_message_at', { ascending: false })
    .limit(30);

  return (data ?? []).map((c: any) => {
    const other = (c.participants ?? [])
      .find((p: any) => p.user_id !== userId)?.profiles;
    return {
      ...c,
      other_user: other ?? null,
      last_message: Array.isArray(c.last_message)
        ? c.last_message[c.last_message.length - 1] ?? null
        : c.last_message ?? null,
    };
  }) as Chat[];
}

function ChatRow({ chat, userId }: { chat: Chat & { other_user?: any }; userId: string }) {
  const isDark = useAppSelector(s => s.theme.resolvedMode === 'dark');
  const theme  = isDark ? darkTheme : lightTheme;
  const other  = (chat as any).other_user;
  const lm     = chat.last_message;

  return (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
      onPress={() => router.push(`/chat/${chat.id}` as any)}
      activeOpacity={0.85}
    >
      <View style={styles.avatarWrap}>
        <Avatar uri={other?.avatar_url} name={other?.name ?? chat.name ?? 'Chat'} size="lg" isOnline={other?.is_online} />
        {chat.unread_count > 0 && (
          <View style={[styles.unreadBadge, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.unreadText}>{chat.unread_count > 9 ? '9+' : chat.unread_count}</Text>
          </View>
        )}
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <View style={styles.rowTop}>
          <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={1}>
            {other?.name ?? chat.name ?? 'Chat'}
          </Text>
          {lm?.created_at && (
            <Text style={[styles.time, { color: theme.colors.textTertiary }]}>
              {formatDistanceToNow(parseISO(lm.created_at), { addSuffix: false })}
            </Text>
          )}
        </View>
        <Text style={[styles.preview, {
          color: chat.unread_count > 0 ? theme.colors.text : theme.colors.textSecondary,
          fontFamily: chat.unread_count > 0 ? 'Inter-Medium' : 'Inter-Regular',
        }]} numberOfLines={1}>
          {lm
            ? lm.type === 'image'
              ? '📷 Photo'
              : lm.type === 'audio'
                ? '🎙️ Voice Message'
                : lm.sender_id === userId ? `You: ${lm.content}` : lm.content
            : 'Start a conversation'
          }
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function ChatListScreen() {
  const isDark = useAppSelector(s => s.theme.resolvedMode === 'dark');
  const theme  = isDark ? darkTheme : lightTheme;
  const user   = useAppSelector(s => s.auth.user);
  const [refreshing, setRefreshing] = useState(false);

  const { data: chats, refetch, isLoading } = useQuery({
    queryKey: ['chats', user?.id],
    queryFn:  () => fetchChats(user!.id),
    enabled:  !!user?.id,
  });

  // Realtime subscription for Chat List updates
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`chat_list_${user.id}_${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => refetch())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, () => refetch())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <LinearGradient
        colors={isDark ? ['#1A0533', '#0A0A1B'] : ['#EDE9FE', '#F8F7FF']}
        style={styles.headerGradient}
      >
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => safeBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: theme.colors.text }]}>Messages 💬</Text>
            <View style={{ width: 36 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <FlatList
        data={chats ?? []}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing || isLoading} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        renderItem={({ item }) => <ChatRow chat={item as any} userId={user?.id ?? ''} />}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={64} color={theme.colors.textTertiary} />
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No chats yet</Text>
              <Text style={[styles.emptyText, { color: theme.colors.textTertiary }]}>
                Discover people and start a conversation!
              </Text>
              <TouchableOpacity
                style={[styles.discoverBtn, { backgroundColor: theme.colors.primary }]}
                onPress={() => router.push('/(tabs)/discover')}
              >
                <Text style={styles.discoverBtnText}>Discover People</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerGradient: { paddingHorizontal: 20, paddingBottom: 16 },
  header:         { flexDirection: 'row', alignItems: 'center', paddingTop: 12 },
  backBtn:        { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title:          { flex: 1, fontSize: 20, fontFamily: 'Inter-Bold', textAlign: 'center' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 14, borderRadius: 18, borderWidth: 1,
  },
  avatarWrap:   { position: 'relative' },
  unreadBadge: {
    position: 'absolute', top: -4, right: -4,
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  unreadText:   { color: '#FFF', fontSize: 10, fontFamily: 'Inter-Bold' },
  rowTop:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name:         { fontSize: 15, fontFamily: 'Inter-SemiBold', flex: 1 },
  time:         { fontSize: 11, fontFamily: 'Inter-Regular' },
  preview:      { fontSize: 13, lineHeight: 18 },
  empty:        { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyTitle:   { fontSize: 20, fontFamily: 'Inter-Bold' },
  emptyText:    { fontSize: 14, fontFamily: 'Inter-Regular', textAlign: 'center', lineHeight: 21 },
  discoverBtn:  { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  discoverBtnText: { color: '#FFF', fontFamily: 'Inter-SemiBold', fontSize: 14 },
});
