import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Image, Alert,
  Modal, Clipboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { format, isToday, parseISO } from 'date-fns';
import { useAppSelector } from '../../store';
import { darkTheme, lightTheme } from '../../constants/Theme';
import { Avatar } from '../../components/ui/Avatar';
import { supabase } from '../../lib/supabase';
import { safeBack } from '../../lib/navigation';
import { getFileBytes } from '../../lib/storage';
import type { Message, User } from '../../types';

// Safely require expo-av for Native platforms without throwing or printing verbose warnings on Web
let AudioModule: any = null;
try {
  AudioModule = require('expo-av').Audio;
} catch {
  // Gracefully fallback when expo-av is not present
}

const EMOJI_REACTIONS = ['❤️', '😂', '👍', '🔥', '😮', '😢'];

function formatMsgTime(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = parseISO(dateStr);
    return isToday(d) ? format(d, 'h:mm a') : format(d, 'MMM d, h:mm a');
  } catch {
    return '';
  }
}

// Cross-Platform Audio Player Component for Voice Notes (Web + Native)
function VoiceNoteBubble({ audioUrl, isMe }: { audioUrl: string; isMe: boolean }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound]         = useState<any>(null);
  const webAudioRef               = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (sound) sound.unloadAsync();
      if (webAudioRef.current) {
        webAudioRef.current.pause();
        webAudioRef.current = null;
      }
    };
  }, [sound]);

  const togglePlay = async () => {
    // 1. Web HTML5 Audio Support
    if (Platform.OS === 'web') {
      try {
        if (!webAudioRef.current) {
          const audio = new window.Audio(audioUrl);
          audio.onended = () => setIsPlaying(false);
          webAudioRef.current = audio;
        }
        if (isPlaying) {
          webAudioRef.current.pause();
          setIsPlaying(false);
        } else {
          await webAudioRef.current.play();
          setIsPlaying(true);
        }
      } catch (err) {
        console.warn('[VoiceNoteWeb] Playback error:', err);
      }
      return;
    }

    // 2. Native Expo Audio Support
    if (!AudioModule) {
      Alert.alert('Audio Error', 'Audio player is not supported on this platform.');
      return;
    }

    try {
      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
        } else {
          await sound.playAsync();
          setIsPlaying(true);
        }
      } else {
        const { sound: newSound } = await AudioModule.Sound.createAsync(
          { uri: audioUrl },
          { shouldPlay: true }
        );
        setSound(newSound);
        setIsPlaying(true);

        newSound.setOnPlaybackStatusUpdate((playbackStatus: any) => {
          if (playbackStatus.didJustFinish) {
            setIsPlaying(false);
          }
        });
      }
    } catch (err) {
      console.warn('[VoiceNote] Error playing audio:', err);
      Alert.alert('Playback Error', 'Could not play voice note.');
    }
  };

  return (
    <TouchableOpacity
      onPress={togglePlay}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 10,
        paddingVertical: 4, paddingHorizontal: 6,
      }}
    >
      <Ionicons name={isPlaying ? 'pause-circle' : 'play-circle'} size={32} color={isMe ? '#FFF' : '#7C3AED'} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, color: isMe ? '#FFF' : '#333', fontFamily: 'Inter-Medium' }}>
          Voice Message 🎙️
        </Text>
        <Text style={{ fontSize: 10, color: isMe ? 'rgba(255,255,255,0.7)' : '#666' }}>
          {isPlaying ? 'Playing...' : 'Tap to play'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// Single Message Bubble Component
function MessageBubble({
  message,
  isMe,
  onLongPress,
}: {
  message: Message;
  isMe: boolean;
  onLongPress: (msg: any) => void;
}) {
  const isDark = useAppSelector(s => s.theme.resolvedMode === 'dark');
  const theme  = isDark ? darkTheme : lightTheme;

  if (message.is_deleted) {
    return (
      <View style={[styles.bubbleRow, isMe ? styles.bubbleRowMe : styles.bubbleRowThem]}>
        <View style={[styles.bubble, { backgroundColor: theme.colors.surfaceSecondary, borderRadius: 14 }]}>
          <Text style={{ fontSize: 13, fontStyle: 'italic', color: theme.colors.textTertiary }}>
            🚫 Message was deleted
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.bubbleRow, isMe ? styles.bubbleRowMe : styles.bubbleRowThem]}>
      {!isMe && (
        <Avatar uri={message.sender?.avatar_url} name={message.sender?.name} size="sm" />
      )}
      <TouchableOpacity
        onLongPress={() => onLongPress(message)}
        activeOpacity={0.9}
        style={[styles.bubble, {
          backgroundColor: isMe ? theme.colors.primary : theme.colors.surface,
          borderBottomRightRadius: isMe ? 4 : 20,
          borderBottomLeftRadius:  isMe ? 20 : 4,
          maxWidth: '75%',
        }]}
      >
        {/* Parent reply preview */}
        {message.parent_message_id && (
          <View style={{
            backgroundColor: isMe ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)',
            borderLeftWidth: 3, borderLeftColor: isMe ? '#FFF' : theme.colors.primary,
            padding: 6, borderRadius: 6, marginBottom: 4,
          }}>
            <Text style={{ fontSize: 11, color: isMe ? '#FFF' : theme.colors.primary, fontFamily: 'Inter-SemiBold' }}>
              Replying to message
            </Text>
          </View>
        )}

        {/* Media / Audio / Text */}
        {message.type === 'image' && message.media_url && (
          <Image source={{ uri: message.media_url }} style={{ width: 220, height: 160, borderRadius: 12 }} resizeMode="cover" />
        )}
        {(message.type === 'voice' || message.type === 'audio') && (message.audio_url || message.media_url) && (
          <VoiceNoteBubble audioUrl={(message.audio_url || message.media_url)!} isMe={isMe} />
        )}
        {message.type === 'text' && (
          <Text style={[styles.bubbleText, { color: isMe ? '#FFF' : theme.colors.text }]}>
            {message.content}
          </Text>
        )}

        {/* Reactions list display */}
        {message.reactions && Array.isArray(message.reactions) && message.reactions.length > 0 && (
          <View style={{ flexDirection: 'row', gap: 2, marginTop: 4, alignSelf: isMe ? 'flex-end' : 'flex-start' }}>
            {message.reactions.map((r: any, i: number) => (
              <Text key={i} style={{ fontSize: 12 }}>{typeof r === 'string' ? r : r.emoji}</Text>
            ))}
          </View>
        )}

        {/* Time & Read Checkmark */}
        <Text style={[styles.bubbleTime, {
          color: isMe ? 'rgba(255,255,255,0.7)' : theme.colors.textTertiary,
        }]}>
          {formatMsgTime(message.created_at)}
          {isMe && (
            <Ionicons
              name={message.is_read ? 'checkmark-done' : 'checkmark'}
              size={12} color={message.is_read ? (isDark ? '#60A5FA' : '#93C5FD') : 'rgba(255,255,255,0.7)'}
              style={{ marginLeft: 3 }}
            />
          )}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function ChatScreen() {
  const isDark  = useAppSelector(s => s.theme.resolvedMode === 'dark');
  const theme   = isDark ? darkTheme : lightTheme;
  const me      = useAppSelector(s => s.auth.user);
  const { id }  = useLocalSearchParams<{ id: string }>();

  const [messages, setMessages]       = useState<Message[]>([]);
  const [text, setText]               = useState('');
  const [otherUser, setOtherUser]     = useState<User | null>(null);
  const [isTyping, setIsTyping]       = useState(false);
  const [replyTo, setReplyTo]         = useState<Message | null>(null);
  const [selectedMsg, setSelectedMsg] = useState<Message | null>(null);

  // Audio Recording State
  const [recording, setRecording]     = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);

  const flatListRef      = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef       = useRef<any>(null);
  const otherUserRef     = useRef(otherUser);
  const meRef            = useRef(me);

  useEffect(() => { otherUserRef.current = otherUser; }, [otherUser]);
  useEffect(() => { meRef.current = me; }, [me]);

  // Load participant information
  useEffect(() => {
    const loadChatInfo = async () => {
      if (!me?.id || !id) return;
      const { data: participants } = await supabase
        .from('chat_participants')
        .select('user_id, profiles:user_id(id, name, avatar_url, is_online, is_verified, last_seen)')
        .eq('chat_id', id)
        .neq('user_id', me.id)
        .limit(1);

      if (participants && participants.length > 0) {
        setOtherUser((participants[0] as any).profiles as User);
      }
    };
    loadChatInfo();
  }, [id, me?.id]);

  // Mark unread messages as read
  const markMessagesAsRead = async () => {
    if (!id || !me?.id) return;
    try {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('chat_id', id)
        .neq('sender_id', me.id)
        .eq('is_read', false);

      await supabase
        .from('chat_participants')
        .update({ unread_count: 0, last_read_at: new Date().toISOString() })
        .eq('chat_id', id)
        .eq('user_id', me.id);
    } catch (err) {
      console.warn('[Chat] Mark as read error:', err);
    }
  };

  // Load initial messages & setup Supabase Realtime Channels
  useEffect(() => {
    if (!id) return;

    const loadMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*, sender:profiles(id,name,avatar_url)')
        .eq('chat_id', id)
        .order('created_at', { ascending: true })
        .limit(100);

      setMessages((data as Message[]) ?? []);
      markMessagesAsRead();
    };

    loadMessages();

    // Unique channel instance per mount
    const channelName = `chat_room:${id}_${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'messages', filter: `chat_id=eq.${id}`,
      }, payload => {
        if (payload.eventType === 'INSERT') {
          const newMsg = payload.new as Message;
          if (!newMsg.sender) {
            if (otherUserRef.current && newMsg.sender_id === otherUserRef.current.id) {
              newMsg.sender = otherUserRef.current;
            } else if (meRef.current && newMsg.sender_id === meRef.current.id) {
              newMsg.sender = meRef.current;
            }
          }
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev.filter(m => !m.id.startsWith('temp-')), newMsg];
          });
          markMessagesAsRead();
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        } else if (payload.eventType === 'UPDATE') {
          const updatedMsg = payload.new as Message;
          setMessages(prev => prev.map(m => m.id === updatedMsg.id ? { ...m, ...updatedMsg } : m));
        } else if (payload.eventType === 'DELETE') {
          const deletedId = payload.old.id;
          setMessages(prev => prev.filter(m => m.id !== deletedId));
        }
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.user_id !== meRef.current?.id) {
          setIsTyping(payload.is_typing);
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [id]);

  // Handle typing broadcast
  const handleTextChange = (val: string) => {
    setText(val);
    if (!me?.id || !channelRef.current) return;

    channelRef.current.send({
      type: 'broadcast', event: 'typing',
      payload: { user_id: me.id, is_typing: true },
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      channelRef.current?.send({
        type: 'broadcast', event: 'typing',
        payload: { user_id: me.id, is_typing: false },
      });
    }, 1500);
  };

  // Send text message with Optimistic Local Rendering
  const sendMessage = async () => {
    if (!text.trim() || !me) return;
    const content = text.trim();
    const parentId = replyTo?.id ?? null;

    setText('');
    setReplyTo(null);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    // Optimistic local message
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      chat_id: id!,
      sender_id: me.id,
      type: 'text',
      content,
      is_read: false,
      created_at: new Date().toISOString(),
      sender: me,
      parent_message_id: parentId,
    };

    setMessages(prev => [...prev, optimisticMsg]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          chat_id: id,
          sender_id: me.id,
          type: 'text',
          content,
          parent_message_id: parentId,
        })
        .select('*, sender:profiles(id,name,avatar_url)')
        .single();

      if (error) throw error;

      if (data) {
        setMessages(prev => prev.map(m => m.id === tempId ? (data as Message) : m));
      }
    } catch (err: any) {
      Alert.alert('Message Error', err.message || 'Could not send message.');
      setMessages(prev => prev.filter(m => m.id !== tempId));
    }
  };

  // Voice Note Recording
  const startRecording = async () => {
    if (!AudioModule) {
      Alert.alert('Voice Note Error', 'Recording audio is not supported on this platform.');
      return;
    }
    try {
      const perm = await AudioModule.requestPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Permission needed', 'Audio recording permission is required to send voice notes.');
        return;
      }
      await AudioModule.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await AudioModule.Recording.createAsync(
        AudioModule.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(newRecording);
      setIsRecording(true);
    } catch (err) {
      console.error('[AudioRecord] Failed to start recording:', err);
    }
  };

  const stopAndSendRecording = async () => {
    if (!recording || !me) return;
    setIsRecording(false);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      if (!uri) return;

      const filename = `voice_${Date.now()}.m4a`;
      const path = `chats/${id}/${filename}`;

      const fileData = await getFileBytes(uri);

      const { error: uploadErr } = await supabase.storage
        .from('chat-media')
        .upload(path, fileData, { contentType: 'audio/m4a', upsert: false });

      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage.from('chat-media').getPublicUrl(path);

      await supabase.from('messages').insert({
        chat_id: id,
        sender_id: me.id,
        type: 'voice',
        content: '🎙️ Voice Message',
        audio_url: publicUrl,
        media_url: publicUrl,
      });
    } catch (err: any) {
      Alert.alert('Voice Note Error', err.message || 'Could not send voice note.');
    }
  };

  // Image attachment handler
  const handleAttachment = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo access to send media attachments.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: false, quality: 0.8,
    });
    if (result.canceled || !result.assets[0] || !me) return;
    const asset = result.assets[0];
    const ext   = asset.uri.split('.').pop() ?? 'jpg';
    const path  = `chats/${id}/${Date.now()}.${ext}`;
    try {
      const fileData = await getFileBytes(asset.uri);
      const { error: uploadError } = await supabase.storage
        .from('chat-media').upload(path, fileData, { upsert: false, contentType: `image/${ext}` });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('chat-media').getPublicUrl(path);
      await supabase.from('messages').insert({
        chat_id: id, sender_id: me.id, type: 'image', content: '', media_url: publicUrl,
      });
    } catch (e: any) {
      Alert.alert('Upload failed', e.message || 'Could not send image.');
    }
  };

  // Message Reaction Handler
  const handleAddReaction = async (emoji: string) => {
    if (!selectedMsg) return;
    const existing = (selectedMsg.reactions && Array.isArray(selectedMsg.reactions)) ? selectedMsg.reactions : [];
    const updated = [...existing, emoji];
    setSelectedMsg(null);

    try {
      await supabase
        .from('messages')
        .update({ reactions: updated })
        .eq('id', selectedMsg.id);
    } catch (err) {
      console.warn('[Reaction] Update error:', err);
    }
  };

  // Message Delete Handler
  const handleDeleteMessage = async () => {
    if (!selectedMsg) return;
    const msgToDelete = selectedMsg;
    setSelectedMsg(null);

    Alert.alert('Delete Message', 'Are you sure you want to delete this message?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await supabase.from('messages').update({ is_deleted: true }).eq('id', msgToDelete.id);
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Could not delete message.');
          }
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* Header */}
      <SafeAreaView edges={['top']}>
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={() => safeBack('/chat')} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
          </TouchableOpacity>
          {otherUser ? (
            <TouchableOpacity style={styles.userInfo} onPress={() => router.push(`/user/${otherUser.id}`)}>
              <Avatar uri={otherUser.avatar_url} name={otherUser.name} size="md" isOnline={otherUser.is_online} />
              <View>
                <Text style={[styles.userName, { color: theme.colors.text }]}>{otherUser.name}</Text>
                <Text style={[styles.userStatus, {
                  color: otherUser.is_online ? theme.colors.online : theme.colors.textTertiary,
                }]}>
                  {isTyping ? '✍️ typing...' : otherUser.is_online ? 'Online' : 'Offline'}
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            <Text style={[styles.userName, { color: theme.colors.text }]}>Chat</Text>
          )}
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerBtn} onPress={() => Alert.alert('Voice Call', 'Calls coming soon! 🎉')}>
              <Ionicons name="call-outline" size={20} color={theme.colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerBtn} onPress={() => {
              if (otherUser) router.push(`/user/${otherUser.id}`);
            }}>
              <Ionicons name="ellipsis-horizontal" size={20} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => (
          <MessageBubble
            message={item}
            isMe={item.sender_id === me?.id}
            onLongPress={setSelectedMsg}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Text style={{ fontSize: 40 }}>👋</Text>
            <Text style={[styles.emptyChatText, { color: theme.colors.textTertiary }]}>
              Say hello and start a conversation!
            </Text>
          </View>
        }
      />

      {/* Reply Preview Header */}
      {replyTo && (
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: 16, paddingVertical: 8, backgroundColor: theme.colors.surface,
          borderTopWidth: 1, borderColor: theme.colors.border,
        }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, fontFamily: 'Inter-SemiBold', color: theme.colors.primary }}>
              Replying to {replyTo.sender?.name || 'Message'}
            </Text>
            <Text style={{ fontSize: 13, color: theme.colors.textSecondary }} numberOfLines={1}>
              {replyTo.content || 'Attachment'}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setReplyTo(null)}>
            <Ionicons name="close-circle" size={20} color={theme.colors.textTertiary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Input Section */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView edges={['bottom']}>
          <View style={[styles.inputRow, {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.border,
          }]}>
            <TouchableOpacity style={styles.inputIcon} onPress={handleAttachment}>
              <Ionicons name="add-circle-outline" size={24} color={theme.colors.primary} />
            </TouchableOpacity>

            {/* Voice Record Button */}
            <TouchableOpacity
              style={styles.inputIcon}
              onPress={isRecording ? stopAndSendRecording : startRecording}
            >
              <Ionicons
                name={isRecording ? 'stop-circle' : 'mic-outline'}
                size={24}
                color={isRecording ? theme.colors.error : theme.colors.primary}
              />
            </TouchableOpacity>

            <View style={[styles.inputBox, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
              <TextInput
                value={text}
                onChangeText={handleTextChange}
                placeholder={isRecording ? 'Recording voice note...' : 'Message...'}
                placeholderTextColor={theme.colors.textTertiary}
                multiline
                editable={!isRecording}
                style={[styles.input, { color: theme.colors.text }]}
              />
            </View>

            <TouchableOpacity
              onPress={sendMessage}
              disabled={!text.trim()}
              style={[styles.sendBtn, { backgroundColor: text.trim() ? theme.colors.primary : theme.colors.border }]}
            >
              <Ionicons name="send" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>

      {/* Long Press Message Action Modal */}
      <Modal visible={!!selectedMsg} transparent animationType="fade" onRequestClose={() => setSelectedMsg(null)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }} activeOpacity={1} onPress={() => setSelectedMsg(null)}>
          <View style={{ width: '80%', backgroundColor: theme.colors.surface, borderRadius: 20, padding: 16, gap: 12 }}>
            {/* Quick Emoji Reaction Bar */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
              {EMOJI_REACTIONS.map(emoji => (
                <TouchableOpacity key={emoji} onPress={() => handleAddReaction(emoji)}>
                  <Text style={{ fontSize: 24 }}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.menuOption} onPress={() => { setReplyTo(selectedMsg); setSelectedMsg(null); }}>
              <Ionicons name="arrow-undo-outline" size={20} color={theme.colors.text} />
              <Text style={[styles.menuOptionText, { color: theme.colors.text }]}>Reply</Text>
            </TouchableOpacity>

            {selectedMsg?.content ? (
              <TouchableOpacity style={styles.menuOption} onPress={() => { Clipboard.setString(selectedMsg.content); setSelectedMsg(null); Alert.alert('Copied', 'Copied to clipboard!'); }}>
                <Ionicons name="copy-outline" size={20} color={theme.colors.text} />
                <Text style={[styles.menuOptionText, { color: theme.colors.text }]}>Copy Text</Text>
              </TouchableOpacity>
            ) : null}

            {selectedMsg?.sender_id === me?.id && (
              <TouchableOpacity style={styles.menuOption} onPress={handleDeleteMessage}>
                <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
                <Text style={[styles.menuOptionText, { color: theme.colors.error }]}>Delete Message</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, gap: 10,
  },
  backBtn:       { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  userInfo:      { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  userName:      { fontSize: 15, fontFamily: 'Inter-SemiBold' },
  userStatus:    { fontSize: 12, fontFamily: 'Inter-Regular' },
  headerActions: { flexDirection: 'row', gap: 4 },
  headerBtn:     { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  bubbleRow:     { flexDirection: 'row', gap: 8, alignItems: 'flex-end', marginVertical: 2 },
  bubbleRowMe:   { justifyContent: 'flex-end' },
  bubbleRowThem: { justifyContent: 'flex-start' },
  bubble:        { padding: 12, borderRadius: 20, gap: 4 },
  bubbleText:    { fontSize: 14, fontFamily: 'Inter-Regular', lineHeight: 21 },
  bubbleTime:    { fontSize: 10, fontFamily: 'Inter-Regular', alignSelf: 'flex-end', flexDirection: 'row', gap: 2, alignItems: 'center' },
  emptyChat:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
  emptyChatText: { fontSize: 14, fontFamily: 'Inter-Regular', textAlign: 'center' },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1,
  },
  inputIcon:  { paddingBottom: 8 },
  inputBox: {
    flex: 1, borderRadius: 22, borderWidth: 1.5,
    paddingHorizontal: 14, paddingVertical: 8, maxHeight: 120,
  },
  input:      { fontSize: 14, fontFamily: 'Inter-Regular', maxHeight: 100 },
  sendBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  menuOption: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  menuOptionText: { fontSize: 15, fontFamily: 'Inter-Medium' },
});
