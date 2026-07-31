import { AppState, AppStateStatus } from 'react-native';
import { supabase } from './supabase';

let presenceChannel: any = null;
let appStateSubscription: any = null;

/**
 * Initializes global Realtime Presence tracking for the authenticated user.
 * Manages online/offline status in real time and updates public.profiles(is_online, last_seen).
 */
export const initGlobalPresence = (userId: string) => {
  if (!userId || userId === 'demo-user-123') return () => {};

  console.log('[PresenceEngine] Initializing global presence for user:', userId);

  const updateOnlineStatusInDB = async (isOnline: boolean) => {
    try {
      await supabase
        .from('profiles')
        .update({
          is_online: isOnline,
          last_seen: new Date().toISOString(),
        })
        .eq('id', userId);
    } catch (err) {
      console.warn('[PresenceEngine] DB update warning:', err);
    }
  };

  // 1. Set online in DB
  updateOnlineStatusInDB(true);

  // 2. Create Realtime Presence Channel
  presenceChannel = supabase.channel('online-presence', {
    config: {
      presence: {
        key: userId,
      },
    },
  });

  presenceChannel
    .on('presence', { event: 'sync' }, () => {
      const state = presenceChannel.presenceState();
      console.log('[PresenceEngine] Presence sync:', Object.keys(state).length, 'users online.');
    })
    .subscribe(async (status: string) => {
      if (status === 'SUBSCRIBED') {
        await presenceChannel.track({
          user_id: userId,
          online_at: new Date().toISOString(),
        });
      }
    });

  // 3. Listen to React Native AppState (active vs background)
  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    console.log('[PresenceEngine] AppState changed to:', nextAppState);
    if (nextAppState === 'active') {
      await updateOnlineStatusInDB(true);
      if (presenceChannel) {
        await presenceChannel.track({
          user_id: userId,
          online_at: new Date().toISOString(),
        });
      }
    } else if (nextAppState === 'background' || nextAppState === 'inactive') {
      await updateOnlineStatusInDB(false);
      if (presenceChannel) {
        await presenceChannel.untrack();
      }
    }
  };

  appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

  // Return Cleanup function
  return () => {
    console.log('[PresenceEngine] Cleaning up presence tracking...');
    updateOnlineStatusInDB(false);
    if (appStateSubscription) appStateSubscription.remove();
    if (presenceChannel) {
      presenceChannel.untrack();
      supabase.removeChannel(presenceChannel);
      presenceChannel = null;
    }
  };
};
