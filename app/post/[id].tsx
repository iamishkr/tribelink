import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { useAppSelector } from '../../store';
import { darkTheme, lightTheme } from '../../constants/Theme';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { supabase } from '../../lib/supabase';
import { safeBack } from '../../lib/navigation';
import type { Post, Comment } from '../../types';

async function fetchPost(id: string) {
  const { data, error } = await supabase
    .from('posts')
    .select('*, author:profiles(id,name,avatar_url,is_verified), community:communities(id,name)')
    .eq('id', id)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data as (Post & { author: any; community: any }) | null;
}

async function fetchComments(postId: string) {
  const { data } = await supabase
    .from('comments')
    .select('*, author:profiles(id,name,avatar_url)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
    .limit(50);
  return (data as Comment[]) ?? [];
}

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isDark = useAppSelector(s => s.theme.resolvedMode === 'dark');
  const theme  = isDark ? darkTheme : lightTheme;
  const user   = useAppSelector(s => s.auth.user);
  const queryClient = useQueryClient();

  const [commentText, setCommentText] = useState('');

  const { data: post, isLoading } = useQuery({
    queryKey: ['post', id],
    queryFn: () => fetchPost(id),
    enabled: !!id,
  });

  const { data: comments, refetch: refetchComments } = useQuery({
    queryKey: ['post-comments', id],
    queryFn: () => fetchComments(id),
    enabled: !!id,
  });

  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  React.useEffect(() => {
    if (post) {
      setLikeCount(post.like_count ?? 0);
    }
  }, [post]);

  const toggleLike = () => {
    setIsLiked(prev => !prev);
    setLikeCount(prev => (isLiked ? prev - 1 : prev + 1));
  };

  const addCommentMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!user) throw new Error('Sign in required');
      if (user.id !== 'demo-user-123') {
        const { error } = await supabase.from('comments').insert({
          post_id: id,
          author_id: user.id,
          content: text,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      setCommentText('');
      refetchComments();
      queryClient.invalidateQueries({ queryKey: ['post', id] });
    },
    onError: (e: any) => Alert.alert('Error', e.message || 'Could not post comment.'),
  });

  const handleSendComment = () => {
    if (!commentText.trim()) return;
    addCommentMutation.mutate(commentText.trim());
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: theme.colors.background }]}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // Fallback view for demo/missing post
  const displayPost = post ?? {
    id: id ?? 'demo-post',
    author_id: 'user-1',
    content: 'Excited to be connecting with awesome folks on TribeLink! 🚀 What communities are you all enjoying the most?',
    type: 'text',
    media_urls: [],
    hashtags: ['TribeLink', 'Community', 'Tech'],
    like_count: 12,
    comment_count: comments?.length ?? 3,
    share_count: 2,
    bookmark_count: 1,
    is_pinned: false,
    is_edited: false,
    visibility: 'public',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    author: {
      id: 'user-1',
      name: 'Alex Rivera',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
      is_verified: true,
    },
    community: null,
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => safeBack()}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: theme.colors.text }]}>Post</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 100 }}>
          {/* Post Author Card */}
          <View style={s.authorRow}>
            <TouchableOpacity onPress={() => displayPost.author?.id && router.push(`/user/${displayPost.author.id}`)}>
              <Avatar uri={displayPost.author?.avatar_url} name={displayPost.author?.name} size="md" isVerified={displayPost.author?.is_verified} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={[s.authorName, { color: theme.colors.text }]}>{displayPost.author?.name ?? 'Member'}</Text>
                {displayPost.author?.is_verified && <Ionicons name="checkmark-circle" size={14} color={theme.colors.primary} />}
              </View>
              <Text style={[s.postTime, { color: theme.colors.textTertiary }]}>
                {displayPost.created_at ? formatDistanceToNow(parseISO(displayPost.created_at), { addSuffix: true }) : 'Just now'}
              </Text>
            </View>
            {displayPost.community && (
              <Badge label={displayPost.community.name} color="primary" size="sm" />
            )}
          </View>

          {/* Post Body */}
          <Text style={[s.postContent, { color: theme.colors.text }]}>{displayPost.content}</Text>

          {/* Media Images */}
          {displayPost.media_urls && displayPost.media_urls.length > 0 && (
            <View style={s.mediaGrid}>
              {displayPost.media_urls.map((url, i) => (
                <Image key={i} source={{ uri: url }} style={s.mediaImg} resizeMode="cover" />
              ))}
            </View>
          )}

          {/* Hashtags */}
          {displayPost.hashtags && displayPost.hashtags.length > 0 && (
            <View style={s.tagRow}>
              {displayPost.hashtags.map((tag, i) => (
                <Text key={i} style={[s.tagText, { color: theme.colors.primary }]}>#{tag}</Text>
              ))}
            </View>
          )}

          {/* Action Stats */}
          <View style={[s.actionsRow, { borderTopColor: theme.colors.border, borderBottomColor: theme.colors.border }]}>
            <TouchableOpacity style={s.actionItem} onPress={toggleLike}>
              <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={20} color={isLiked ? '#EF4444' : theme.colors.textSecondary} />
              <Text style={[s.actionText, { color: isLiked ? '#EF4444' : theme.colors.textSecondary }]}>{likeCount}</Text>
            </TouchableOpacity>
            <View style={s.actionItem}>
              <Ionicons name="chatbubble-outline" size={20} color={theme.colors.textSecondary} />
              <Text style={[s.actionText, { color: theme.colors.textSecondary }]}>{comments?.length ?? displayPost.comment_count}</Text>
            </View>
            <TouchableOpacity style={s.actionItem}>
              <Ionicons name="share-social-outline" size={20} color={theme.colors.textSecondary} />
              <Text style={[s.actionText, { color: theme.colors.textSecondary }]}>Share</Text>
            </TouchableOpacity>
          </View>

          {/* Comments Header */}
          <Text style={[s.commentsTitle, { color: theme.colors.text }]}>
            Comments ({comments?.length ?? 0})
          </Text>

          {/* Comments List */}
          {comments && comments.length > 0 ? (
            comments.map(c => (
              <View key={c.id} style={[s.commentCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Avatar uri={c.author?.avatar_url} name={c.author?.name} size="sm" />
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[s.commentAuthor, { color: theme.colors.text }]}>{c.author?.name ?? 'Member'}</Text>
                    <Text style={[s.commentTime, { color: theme.colors.textTertiary }]}>
                      {c.created_at ? formatDistanceToNow(parseISO(c.created_at), { addSuffix: true }) : ''}
                    </Text>
                  </View>
                  <Text style={[s.commentBody, { color: theme.colors.textSecondary }]}>{c.content}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={[s.noComments, { color: theme.colors.textTertiary }]}>
              No comments yet. Be the first to share your thoughts!
            </Text>
          )}
        </ScrollView>

        {/* Comment Input Footer */}
        <View style={[s.inputFooter, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
          <TextInput
            style={[s.input, { color: theme.colors.text, backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
            placeholder="Write a comment..."
            placeholderTextColor={theme.colors.textTertiary}
            value={commentText}
            onChangeText={setCommentText}
            multiline
          />
          <TouchableOpacity
            style={[s.sendBtn, { backgroundColor: commentText.trim() ? theme.colors.primary : theme.colors.border }]}
            onPress={handleSendComment}
            disabled={!commentText.trim() || addCommentMutation.isPending}
          >
            {addCommentMutation.isPending ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Ionicons name="send" size={16} color="#FFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:     { flex: 1 },
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn:       { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle:   { fontSize: 18, fontFamily: 'Inter-Bold' },
  authorRow:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  authorName:    { fontSize: 16, fontFamily: 'Inter-SemiBold' },
  postTime:      { fontSize: 12, fontFamily: 'Inter-Regular', marginTop: 2 },
  postContent:   { fontSize: 15, fontFamily: 'Inter-Regular', lineHeight: 23 },
  mediaGrid:     { gap: 8, marginTop: 4 },
  mediaImg:      { width: '100%', height: 200, borderRadius: 16 },
  tagRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagText:       { fontSize: 13, fontFamily: 'Inter-Medium' },
  actionsRow:    { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1 },
  actionItem:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText:    { fontSize: 13, fontFamily: 'Inter-Medium' },
  commentsTitle: { fontSize: 16, fontFamily: 'Inter-Bold', marginTop: 8 },
  commentCard:   { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1 },
  commentAuthor: { fontSize: 13, fontFamily: 'Inter-SemiBold' },
  commentTime:   { fontSize: 10, fontFamily: 'Inter-Regular' },
  commentBody:   { fontSize: 13, fontFamily: 'Inter-Regular', lineHeight: 19 },
  noComments:    { fontSize: 13, fontFamily: 'Inter-Regular', textAlign: 'center', marginVertical: 20 },
  inputFooter:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1 },
  input:         { flex: 1, borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8, fontSize: 14, maxHeight: 80 },
  sendBtn:       { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});