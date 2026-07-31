import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Image, ActivityIndicator, Alert, RefreshControl,
  Share, FlatList, TextInput, Modal,
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
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';
import { safeBack } from '../../lib/navigation';
import { getOrCreateCommunityChat } from '../../lib/chat';
import type { Community, Post, User } from '../../types';

async function fetchCommunity(id: string) {
  const { data, error } = await supabase
    .from('communities')
    .select('*, owner:profiles(id,name,avatar_url,is_verified)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as Community & { owner: any };
}

async function fetchMembers(id: string) {
  const { data } = await supabase
    .from('community_members')
    .select('user_id, role, joined_at, profiles:user_id(id,name,avatar_url,is_verified,occupation)')
    .eq('community_id', id);
  return data ?? [];
}

async function checkMembership(communityId: string, userId: string) {
  const { data } = await supabase
    .from('community_members')
    .select('role')
    .eq('community_id', communityId)
    .eq('user_id', userId)
    .maybeSingle();
  return data;
}

async function fetchCommunityPosts(communityId: string) {
  const { data, error } = await supabase
    .from('posts')
    .select('*, author:profiles(id,name,avatar_url,is_verified)')
    .eq('community_id', communityId)
    .order('created_at', { ascending: false });

  if (error) console.warn('[CommunityPosts] fetch warning:', error);
  return (data as Post[]) ?? [];
}

export default function CommunityDetailScreen() {
  const { id }       = useLocalSearchParams<{ id: string }>();
  const isDark       = useAppSelector(s => s.theme.resolvedMode === 'dark');
  const theme        = isDark ? darkTheme : lightTheme;
  const user         = useAppSelector(s => s.auth.user);
  const queryClient  = useQueryClient();

  const [activeTab, setActiveTab]         = useState<'feed' | 'chat' | 'about' | 'members'>('feed');
  const [newPostText, setNewPostText]     = useState('');
  const [creatingPost, setCreatingPost]   = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);

  const { data: community, isLoading, refetch } = useQuery({
    queryKey: ['community', id],
    queryFn:  () => fetchCommunity(id),
  });

  const { data: members, refetch: refetchMembers } = useQuery({
    queryKey: ['community-members', id],
    queryFn:  () => fetchMembers(id),
    enabled:  !!id,
  });

  const { data: membership } = useQuery({
    queryKey: ['membership', id, user?.id],
    queryFn:  () => checkMembership(id, user!.id),
    enabled:  !!user?.id && !!id,
  });

  const { data: posts, refetch: refetchPosts } = useQuery({
    queryKey: ['community-posts', id],
    queryFn:  () => fetchCommunityPosts(id),
    enabled:  !!id,
  });

  const isMember   = !!membership;
  const userRole   = membership?.role ?? null;
  const isOwnerAdmin = userRole === 'owner' || userRole === 'admin' || userRole === 'moderator';
  const canDelete  = userRole === 'owner' || userRole === 'admin'; // moderators can pin but not delete
  const isPrivateLocked = community?.type === 'private' && !isMember;

  // Join / Leave Mutation
  const joinMutation = useMutation({
    mutationFn: async () => {
      if (isMember) {
        await supabase.from('community_members').delete().eq('community_id', id).eq('user_id', user!.id);
      } else {
        await supabase.from('community_members').insert({ community_id: id, user_id: user!.id, role: 'member' });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membership', id, user?.id] });
      queryClient.invalidateQueries({ queryKey: ['community', id] });
      refetchMembers();
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  // Native Share Handler
  const handleShare = async () => {
    if (!community) return;
    try {
      await Share.share({
        title: community.name,
        message: `Check out "${community.name}" on TribeLink!\nJoin our community: https://tribelink.app/community/${community.id}`,
      });
    } catch (err: any) {
      console.warn('[Share] Error:', err);
    }
  };

  // Open Community Group Chat
  const handleOpenChat = async () => {
    if (!user?.id || !community) return;
    if (!isMember) {
      Alert.alert('Join Required', 'You must join this community to participate in community chat.');
      return;
    }
    try {
      const chatId = await getOrCreateCommunityChat(community.id, community.name, user.id);
      router.push(`/chat/${chatId}`);
    } catch (err: any) {
      Alert.alert('Chat Error', err.message || 'Could not open community chat.');
    }
  };

  // Create Community Post
  const handleCreatePost = async () => {
    if (!newPostText.trim() || !user || !community) return;
    setCreatingPost(true);
    try {
      const { error } = await supabase.from('posts').insert({
        community_id: community.id,
        author_id: user.id,
        type: 'text',
        content: newPostText.trim(),
        visibility: community.type === 'private' ? 'community' : 'public',
      });

      if (error) throw error;

      setNewPostText('');
      refetchPosts();
      Alert.alert('Post Published! 🚀', 'Your post is now visible in the community feed.');
    } catch (err: any) {
      Alert.alert('Post Error', err.message || 'Could not create post.');
    } finally {
      setCreatingPost(false);
    }
  };

  // Admin Pin / Unpin Post
  const handleTogglePinPost = async (post: Post) => {
    if (!isOwnerAdmin) return;
    const newStatus = !post.is_pinned;
    try {
      await supabase.from('posts').update({ is_pinned: newStatus }).eq('id', post.id);
      refetchPosts();
      Alert.alert('Success', newStatus ? 'Post pinned to top 📌' : 'Post unpinned');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  // Admin Delete Post
  const handleDeletePost = async (postId: string) => {
    Alert.alert('Delete Post', 'Are you sure you want to delete this community post?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await supabase.from('posts').delete().eq('id', postId);
            refetchPosts();
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  // Admin Member Role Management (Promote / Kick)
  const handleUpdateMemberRole = async (targetUserId: string, newRole: string) => {
    try {
      await supabase
        .from('community_members')
        .update({ role: newRole })
        .eq('community_id', id)
        .eq('user_id', targetUserId);

      setSelectedMember(null);
      refetchMembers();
      Alert.alert('Role Updated', `User role updated to ${newRole}.`);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleKickMember = async (targetUserId: string) => {
    Alert.alert('Kick Member', 'Remove this member from community?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Kick', style: 'destructive',
        onPress: async () => {
          try {
            await supabase
              .from('community_members')
              .delete()
              .eq('community_id', id)
              .eq('user_id', targetUserId);

            setSelectedMember(null);
            refetchMembers();
            refetch();
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!community) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
        <Text style={{ color: theme.colors.textSecondary, fontFamily: 'Inter-Regular' }}>Community not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: theme.colors.primary, fontFamily: 'Inter-SemiBold' }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const CATEGORY_ICONS: Record<string, string> = {
    tech: '💻', study: '📚', startup: '🚀', fitness: '💪',
    creative: '🎨', gaming: '🎮', travel: '✈️', music: '🎵', general: '🌟',
  };
  const catIcon  = CATEGORY_ICONS[community.category] ?? '🌟';
  const typeIcon = community.type === 'public' ? 'globe-outline' : community.type === 'private' ? 'lock-closed-outline' : 'mail-outline';

  const pinnedPosts   = (posts ?? []).filter(p => p.is_pinned);
  const regularPosts  = (posts ?? []).filter(p => !p.is_pinned);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => { refetch(); refetchPosts(); refetchMembers(); }} tintColor={theme.colors.primary} />}
      >
        {/* Cover Image */}
        <View style={s.cover}>
          {community.cover_url
            ? <Image source={{ uri: community.cover_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            : <LinearGradient colors={theme.colors.gradientHero as any} style={StyleSheet.absoluteFill} />
          }

          {/* Back & Share Buttons */}
          <SafeAreaView>
            <View style={s.coverActions}>
              <TouchableOpacity style={s.coverBtn} onPress={() => safeBack()}>
                <Ionicons name="arrow-back" size={20} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity style={s.coverBtn} onPress={handleShare}>
                <Ionicons name="share-outline" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>

          {/* Avatar Icon */}
          <View style={s.avatarWrap}>
            <LinearGradient colors={theme.colors.gradientPrimary as any} style={s.communityAvatar}>
              <Text style={{ fontSize: 36 }}>{catIcon}</Text>
            </LinearGradient>
          </View>
        </View>

        <View style={[s.body, { backgroundColor: theme.colors.background }]}>
          {/* Header Title & Tags */}
          <View style={s.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={[s.name, { color: theme.colors.text }]}>{community.name}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <View style={[s.typePill, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                  <Ionicons name={typeIcon as any} size={11} color={theme.colors.textTertiary} />
                  <Text style={[s.typeText, { color: theme.colors.textTertiary }]}>{(community.type ?? 'public').replace('_', ' ')}</Text>
                </View>
                <Badge label={community.category} color="primary" size="sm" />
              </View>
            </View>
          </View>

          {/* Stats Bar */}
          <View style={[s.statsRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            {[
              { icon: 'people-outline',        label: 'Members', value: (community.member_count ?? 0).toLocaleString() },
              { icon: 'document-text-outline', label: 'Posts',   value: (posts?.length ?? community.post_count ?? 0).toLocaleString() },
            ].map((stat, i) => (
              <React.Fragment key={stat.label}>
                {i > 0 && <View style={{ width: 1, backgroundColor: theme.colors.border, height: 32 }} />}
                <View style={s.stat}>
                  <Ionicons name={stat.icon as any} size={14} color={theme.colors.primary} />
                  <Text style={[s.statNum, { color: theme.colors.text }]}>{stat.value}</Text>
                  <Text style={[s.statLabel, { color: theme.colors.textTertiary }]}>{stat.label}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>

          {/* Action Row: Join / Leave & Community Chat */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
            <TouchableOpacity
              onPress={() => joinMutation.mutate()}
              disabled={joinMutation.isPending}
              style={[s.joinBtn, {
                flex: 1,
                backgroundColor: isMember ? theme.colors.surface : theme.colors.primary,
                borderColor: theme.colors.border,
                borderWidth: isMember ? 1.5 : 0,
              }]}
              activeOpacity={0.85}
            >
              {joinMutation.isPending ? (
                <ActivityIndicator color={isMember ? theme.colors.primary : '#FFF'} />
              ) : (
                <>
                  <Ionicons name={isMember ? 'exit-outline' : 'enter-outline'} size={18} color={isMember ? theme.colors.text : '#FFF'} />
                  <Text style={[s.joinText, { color: isMember ? theme.colors.text : '#FFF' }]}>
                    {isMember ? 'Leave' : 'Join Community'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {isMember && (
              <TouchableOpacity
                onPress={handleOpenChat}
                style={[s.joinBtn, { backgroundColor: theme.colors.primary, paddingHorizontal: 20 }]}
              >
                <Ionicons name="chatbubbles" size={18} color="#FFF" />
                <Text style={s.joinText}>Chat 💬</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* 4 Tab Selector */}
          <View style={[s.tabBar, { borderBottomColor: theme.colors.border }]}>
            {(['feed', 'chat', 'about', 'members'] as const).map(tab => (
              <TouchableOpacity
                key={tab}
                onPress={() => {
                  if (tab === 'chat') {
                    handleOpenChat();
                  } else {
                    setActiveTab(tab);
                  }
                }}
                style={[s.tabItem, activeTab === tab && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 }]}
              >
                <Text style={[s.tabText, {
                  color: activeTab === tab ? theme.colors.primary : theme.colors.textSecondary,
                  fontFamily: activeTab === tab ? 'Inter-SemiBold' : 'Inter-Regular',
                }]}>
                  {tab === 'feed' ? 'Feed 📰' : tab === 'chat' ? 'Chat 💬' : tab === 'about' ? 'About ℹ️' : 'Members 👥'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* TAB 1: COMMUNITY FEED */}
          {activeTab === 'feed' && (
            <View style={{ marginTop: 16 }}>
              {/* Private Community Security Check */}
              {isPrivateLocked ? (
                <View style={[s.lockBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <Ionicons name="lock-closed" size={48} color={theme.colors.primary} />
                  <Text style={[s.lockTitle, { color: theme.colors.text }]}>Private Community</Text>
                  <Text style={[s.lockText, { color: theme.colors.textSecondary }]}>
                    Join this private community to view posts, member discussions, and participate in community chat.
                  </Text>
                  <Button title="Join Community" onPress={() => joinMutation.mutate()} style={{ marginTop: 12 }} />
                </View>
              ) : (
                <>
                  {/* Create Post Box for Members */}
                  {isMember && (
                    <View style={[s.createPostBox, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                      <TextInput
                        value={newPostText}
                        onChangeText={setNewPostText}
                        placeholder={`Share something with ${community.name}...`}
                        placeholderTextColor={theme.colors.textTertiary}
                        multiline
                        style={[s.postInput, { color: theme.colors.text }]}
                      />
                      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
                        <Button
                          title="Publish Post 🚀"
                          onPress={handleCreatePost}
                          disabled={!newPostText.trim() || creatingPost}
                          size="sm"
                        />
                      </View>
                    </View>
                  )}

                  {/* Pinned Posts Section */}
                  {pinnedPosts.length > 0 && (
                    <View style={{ marginBottom: 16 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <Ionicons name="pin" size={16} color={theme.colors.primary} />
                        <Text style={[s.sectionTitle, { color: theme.colors.text, marginBottom: 0 }]}>Pinned Posts</Text>
                      </View>
                      {pinnedPosts.map(post => (
                        <View key={post.id} style={[s.postCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.primary }]}>
                          <View style={s.postHeader}>
                            <Avatar uri={post.author?.avatar_url} name={post.author?.name} size="sm" />
                            <View style={{ flex: 1 }}>
                              <Text style={[s.authorName, { color: theme.colors.text }]}>{post.author?.name}</Text>
                              <Text style={[s.postTime, { color: theme.colors.textTertiary }]}>Pinned Announcement</Text>
                            </View>
                            {isOwnerAdmin && (
                              <TouchableOpacity onPress={() => handleTogglePinPost(post)}>
                                <Ionicons name="pin" size={18} color={theme.colors.primary} />
                              </TouchableOpacity>
                            )}
                          </View>
                          <Text style={[s.postContent, { color: theme.colors.text }]}>{post.content}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Regular Post Feed */}
                  {regularPosts.length === 0 && pinnedPosts.length === 0 ? (
                    <View style={s.emptyFeed}>
                      <Ionicons name="document-text-outline" size={48} color={theme.colors.textTertiary} />
                      <Text style={[s.emptyFeedTitle, { color: theme.colors.text }]}>No community posts yet</Text>
                      <Text style={[s.emptyFeedText, { color: theme.colors.textSecondary }]}>
                        {isMember ? 'Start the conversation by publishing a post above!' : 'Join to participate!'}
                      </Text>
                    </View>
                  ) : (
                    regularPosts.map(post => (
                      <View key={post.id} style={[s.postCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
                        <View style={s.postHeader}>
                          <Avatar uri={post.author?.avatar_url} name={post.author?.name} size="sm" />
                          <View style={{ flex: 1 }}>
                            <Text style={[s.authorName, { color: theme.colors.text }]}>{post.author?.name}</Text>
                            <Text style={[s.postTime, { color: theme.colors.textTertiary }]}>{new Date(post.created_at).toLocaleDateString()}</Text>
                          </View>
                          {isOwnerAdmin && (
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                              <TouchableOpacity onPress={() => handleTogglePinPost(post)}>
                                <Ionicons name="pin-outline" size={18} color={theme.colors.textSecondary} />
                              </TouchableOpacity>
                              {canDelete && (
                                <TouchableOpacity onPress={() => handleDeletePost(post.id)}>
                                  <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                                </TouchableOpacity>
                              )}
                            </View>
                          )}
                        </View>
                        <Text style={[s.postContent, { color: theme.colors.text }]}>{post.content}</Text>
                      </View>
                    ))
                  )}
                </>
              )}
            </View>
          )}

          {/* TAB 2: ABOUT */}
          {activeTab === 'about' && (
            <View style={{ marginTop: 16 }}>
              {/* Description */}
              <View style={s.section}>
                <Text style={[s.sectionTitle, { color: theme.colors.text }]}>About</Text>
                <Text style={[s.description, { color: theme.colors.textSecondary }]}>{community.description}</Text>
              </View>

              {/* Tags */}
              {community.tags && community.tags.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                  {community.tags.map((tag, i) => <Badge key={i} label={`#${tag}`} color="neutral" size="sm" />)}
                </View>
              )}

              {/* Creator Card */}
              {community.owner && (
                <View style={s.section}>
                  <Text style={[s.sectionTitle, { color: theme.colors.text }]}>Created by</Text>
                  <TouchableOpacity
                    style={[s.ownerRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                    onPress={() => router.push(`/user/${community.owner.id}`)}
                    activeOpacity={0.8}
                  >
                    <Avatar uri={community.owner.avatar_url} name={community.owner.name} size="md" isVerified={community.owner.is_verified} />
                    <View style={{ flex: 1 }}>
                      <Text style={[s.ownerName, { color: theme.colors.text }]}>{community.owner.name}</Text>
                      <Text style={[s.ownerRole, { color: theme.colors.textTertiary }]}>Owner 👑</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={theme.colors.textTertiary} />
                  </TouchableOpacity>
                </View>
              )}

              {/* Rules */}
              {community.rules && community.rules.length > 0 && (
                <View style={s.section}>
                  <Text style={[s.sectionTitle, { color: theme.colors.text }]}>Community Rules</Text>
                  {community.rules.map((rule, i) => (
                    <View key={i} style={[s.ruleRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                      <View style={[s.ruleNum, { backgroundColor: theme.colors.primary }]}>
                        <Text style={s.ruleNumText}>{i + 1}</Text>
                      </View>
                      <Text style={[s.ruleText, { color: theme.colors.textSecondary }]}>{rule}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* TAB 3: MEMBERS & ADMIN MODERATION */}
          {activeTab === 'members' && (
            <View style={{ marginTop: 16 }}>
              {isPrivateLocked ? (
                <View style={[s.lockBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <Ionicons name="lock-closed" size={48} color={theme.colors.primary} />
                  <Text style={[s.lockTitle, { color: theme.colors.text }]}>Members Hidden</Text>
                  <Text style={[s.lockText, { color: theme.colors.textSecondary }]}>
                    Join this community to view active members.
                  </Text>
                </View>
              ) : (
                <View style={s.section}>
                  <Text style={[s.sectionTitle, { color: theme.colors.text }]}>
                    All Members ({(members ?? []).length})
                  </Text>
                  <View style={{ gap: 10 }}>
                    {(members ?? []).map((m: any) => (
                      <TouchableOpacity
                        key={m.user_id}
                        onPress={() => isOwnerAdmin && m.user_id !== user?.id ? setSelectedMember(m) : router.push(`/user/${m.user_id}`)}
                        style={[s.memberCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
                      >
                        <Avatar uri={m.profiles?.avatar_url} name={m.profiles?.name} size="md" />
                        <View style={{ flex: 1 }}>
                          <Text style={[s.memberNameText, { color: theme.colors.text }]}>{m.profiles?.name}</Text>
                          <Text style={[s.memberRoleText, { color: theme.colors.textTertiary }]}>{m.profiles?.occupation || 'Member'}</Text>
                        </View>
                        <View style={[s.roleBadge, {
                          backgroundColor:
                            m.role === 'owner' ? 'rgba(234,179,8,0.18)' :
                            m.role === 'admin' ? 'rgba(124,58,237,0.18)' :
                            m.role === 'moderator' ? 'rgba(34,197,94,0.18)' :
                            theme.colors.surface,
                        }]}>
                          <Text style={{ fontSize: 11, fontFamily: 'Inter-SemiBold',
                            color:
                              m.role === 'owner' ? '#EAB308' :
                              m.role === 'admin' ? theme.colors.primary :
                              m.role === 'moderator' ? '#22C55E' :
                              theme.colors.textSecondary,
                            textTransform: 'capitalize',
                          }}>
                            {m.role === 'owner' ? '👑 Owner' : m.role === 'admin' ? '🛡️ Admin' : m.role === 'moderator' ? '👁️ Mod' : 'Member'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Admin Member Moderation Modal */}
      <Modal visible={!!selectedMember} transparent animationType="fade" onRequestClose={() => setSelectedMember(null)}>
        <TouchableOpacity style={s.modalBackdrop} activeOpacity={1} onPress={() => setSelectedMember(null)}>
          <View style={[s.modalContent, { backgroundColor: theme.colors.surface }]}>
            <Text style={[s.modalTitle, { color: theme.colors.text }]}>Manage {selectedMember?.profiles?.name}</Text>
            <TouchableOpacity style={s.modalOption} onPress={() => handleUpdateMemberRole(selectedMember.user_id, 'admin')}>
              <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.primary} />
              <Text style={[s.modalOptionText, { color: theme.colors.text }]}>Make Admin 🛡️</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.modalOption} onPress={() => handleUpdateMemberRole(selectedMember.user_id, 'moderator')}>
              <Ionicons name="eye-outline" size={20} color={theme.colors.primary} />
              <Text style={[s.modalOptionText, { color: theme.colors.text }]}>Make Moderator 👁️</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.modalOption} onPress={() => handleKickMember(selectedMember.user_id)}>
              <Ionicons name="person-remove-outline" size={20} color={theme.colors.error} />
              <Text style={[s.modalOptionText, { color: theme.colors.error }]}>Kick Member 🚪</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  cover:        { height: 220, position: 'relative' },
  coverActions: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8 },
  coverBtn:     { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  avatarWrap:   { position: 'absolute', bottom: -36, left: 20 },
  communityAvatar: { width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  body:         { paddingHorizontal: 20, paddingTop: 48 },
  titleRow:     { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  name:         { fontSize: 24, fontFamily: 'Inter-Bold', letterSpacing: -0.5 },
  typePill:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeText:     { fontSize: 11, fontFamily: 'Inter-Medium', textTransform: 'capitalize' },
  statsRow:     { flexDirection: 'row', justifyContent: 'space-evenly', borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 16 },
  stat:         { alignItems: 'center', gap: 4 },
  statNum:      { fontSize: 18, fontFamily: 'Inter-Bold' },
  statLabel:    { fontSize: 11, fontFamily: 'Inter-Regular' },
  joinBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 48, borderRadius: 14 },
  joinText:     { fontSize: 15, fontFamily: 'Inter-Bold' },
  tabBar:       { flexDirection: 'row', borderBottomWidth: 1, marginBottom: 16 },
  tabItem:      { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabText:      { fontSize: 13 },
  section:      { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontFamily: 'Inter-SemiBold', marginBottom: 10 },
  description:  { fontSize: 14, fontFamily: 'Inter-Regular', lineHeight: 22 },
  ownerRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  ownerName:    { fontSize: 15, fontFamily: 'Inter-SemiBold' },
  ownerRole:    { fontSize: 12, fontFamily: 'Inter-Regular', marginTop: 2 },
  ruleRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  ruleNum:      { width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center', minWidth: 24 },
  ruleNumText:  { color: '#FFF', fontSize: 12, fontFamily: 'Inter-Bold' },
  ruleText:     { flex: 1, fontSize: 13, fontFamily: 'Inter-Regular', lineHeight: 20 },
  lockBox:      { alignItems: 'center', padding: 30, borderRadius: 20, borderWidth: 1, gap: 10, marginVertical: 10 },
  lockTitle:    { fontSize: 18, fontFamily: 'Inter-Bold' },
  lockText:     { fontSize: 13, fontFamily: 'Inter-Regular', textAlign: 'center', lineHeight: 20 },
  createPostBox: { padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 16 },
  postInput:    { fontSize: 14, fontFamily: 'Inter-Regular', minHeight: 60 },
  postCard:     { padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 12, gap: 10 },
  postHeader:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  authorName:   { fontSize: 14, fontFamily: 'Inter-SemiBold' },
  postTime:     { fontSize: 11, fontFamily: 'Inter-Regular' },
  postContent:  { fontSize: 14, fontFamily: 'Inter-Regular', lineHeight: 20 },
  emptyFeed:    { alignItems: 'center', padding: 40, gap: 10 },
  emptyFeedTitle: { fontSize: 16, fontFamily: 'Inter-SemiBold' },
  emptyFeedText:  { fontSize: 13, fontFamily: 'Inter-Regular', textAlign: 'center' },
  memberCard:   { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, borderWidth: 1 },
  memberNameText: { fontSize: 14, fontFamily: 'Inter-SemiBold' },
  memberRoleText: { fontSize: 12, fontFamily: 'Inter-Regular' },
  roleBadge:    { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent:  { width: '80%', borderRadius: 20, padding: 20, gap: 14 },
  modalTitle:    { fontSize: 16, fontFamily: 'Inter-Bold', marginBottom: 6 },
  modalOption:   { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  modalOptionText: { fontSize: 15, fontFamily: 'Inter-Medium' },
});