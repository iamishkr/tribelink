import { supabase } from './supabase';

/**
 * Gets an existing 1-on-1 direct chat between two users, or creates a new one if it doesn't exist yet.
 * Returns the chat ID string.
 */
export async function getOrCreateDirectChat(currentUserId: string, targetUserId: string): Promise<string> {
  if (!currentUserId || !targetUserId) {
    throw new Error('User IDs are required to start a chat');
  }

  // Handle demo mode fallback
  if (currentUserId === 'demo-user-123' || targetUserId === 'demo-user-123') {
    return 'demo-chat-123';
  }

  try {
    // 1. Fetch chat IDs that currentUserId belongs to
    const { data: myChats, error: myError } = await supabase
      .from('chat_participants')
      .select('chat_id')
      .eq('user_id', currentUserId);

    if (myError) throw myError;

    if (myChats && myChats.length > 0) {
      const myChatIds = myChats.map(c => c.chat_id);

      // 2. Check if targetUserId is in any of those direct chats
      const { data: shared, error: sharedError } = await supabase
        .from('chat_participants')
        .select('chat_id, chats!inner(type)')
        .eq('user_id', targetUserId)
        .in('chat_id', myChatIds)
        .eq('chats.type', 'direct')
        .limit(1);

      if (sharedError && sharedError.code !== 'PGRST116') {
        console.warn('Error checking shared chat:', sharedError);
      }

      if (shared && shared.length > 0) {
        return shared[0].chat_id;
      }
    }

    // 3. Create a new direct chat (include created_by if schema expects it)
    const insertPayload: any = {
      type: 'direct',
      last_message_at: new Date().toISOString(),
    };
    if (currentUserId && currentUserId !== 'demo-user-123') {
      insertPayload.created_by = currentUserId;
    }

    const { data: newChat, error: chatError } = await supabase
      .from('chats')
      .insert(insertPayload)
      .select('id')
      .single();

    // If schema doesn't have created_by, retry without it
    if (chatError && chatError.code !== '42501') {
      delete insertPayload.created_by;
      const { data: retryChat, error: retryErr } = await supabase
        .from('chats')
        .insert({ type: 'direct', last_message_at: new Date().toISOString() })
        .select('id')
        .single();

      if (!retryErr && retryChat) {
        await supabase.from('chat_participants').insert([
          { chat_id: retryChat.id, user_id: currentUserId },
          { chat_id: retryChat.id, user_id: targetUserId },
        ]);
        return retryChat.id;
      }
    }

    if (chatError) throw chatError;

    // 4. Add both participants
    const { error: partError } = await supabase
      .from('chat_participants')
      .insert([
        { chat_id: newChat.id, user_id: currentUserId },
        { chat_id: newChat.id, user_id: targetUserId },
      ]);

    if (partError) throw partError;

    return newChat.id;
  } catch (e: any) {
    if (e?.code === '42501') {
      console.warn('Supabase RLS Policy restriction on chats table. Please execute fix_chat_realtime.sql in your Supabase SQL Editor.');
    } else {
      console.error('getOrCreateDirectChat error:', e);
    }
    return targetUserId;
  }
}

/**
 * Gets or creates a group chat for a specific community.
 * Automatically joins the current user as a participant.
 */
export async function getOrCreateCommunityChat(
  communityId: string,
  communityName: string,
  currentUserId: string,
): Promise<string> {
  if (!communityId) throw new Error('Community ID required');

  try {
    // 1. Check if a chat for this community already exists
    const { data: existingChat } = await supabase
      .from('chats')
      .select('id')
      .eq('community_id', communityId)
      .maybeSingle();

    if (existingChat) {
      // Auto-join current user as participant (upsert is safe / idempotent)
      if (currentUserId && currentUserId !== 'demo-user-123') {
        await supabase
          .from('chat_participants')
          .upsert(
            { chat_id: existingChat.id, user_id: currentUserId },
            { onConflict: 'chat_id,user_id', ignoreDuplicates: true },
          );
      }
      return existingChat.id;
    }

    // 2. Create new group chat for this community
    const { data: newChat, error } = await supabase
      .from('chats')
      .insert({
        type: 'group',
        name: communityName,
        community_id: communityId,
        last_message_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) throw error;

    // 3. Add creator as participant
    if (currentUserId && currentUserId !== 'demo-user-123') {
      await supabase
        .from('chat_participants')
        .insert({ chat_id: newChat.id, user_id: currentUserId })
        .select();
    }

    return newChat.id;
  } catch (err) {
    console.error('[getOrCreateCommunityChat] error:', err);
    // Fallback: use a deterministic local ID so navigation doesn't break
    return `community-chat-${communityId}`;
  }
}
