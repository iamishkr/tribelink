import { Platform } from 'react-native';
if (Platform.OS !== 'web') {
  require('react-native-url-polyfill/auto');
}
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const CHUNK_SIZE = 2000;

// Secure storage adapter for Expo with chunking support (>2048 bytes limit on Android)
const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const chunkCountStr = await SecureStore.getItemAsync(`${key}_chunks`);
      if (chunkCountStr) {
        const count = parseInt(chunkCountStr, 10);
        let value = '';
        for (let i = 0; i < count; i++) {
          const chunk = await SecureStore.getItemAsync(`${key}_chunk_${i}`);
          if (chunk) value += chunk;
        }
        return value || null;
      }
      return await SecureStore.getItemAsync(key);
    } catch (err) {
      console.warn('[SecureStore] getItem error:', err);
      return null;
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    try {
      // Clear old chunks if any existed
      const oldChunkCount = await SecureStore.getItemAsync(`${key}_chunks`);
      if (oldChunkCount) {
        const count = parseInt(oldChunkCount, 10);
        for (let i = 0; i < count; i++) {
          await SecureStore.deleteItemAsync(`${key}_chunk_${i}`);
        }
        await SecureStore.deleteItemAsync(`${key}_chunks`);
      }

      if (value.length > CHUNK_SIZE) {
        const count = Math.ceil(value.length / CHUNK_SIZE);
        await SecureStore.setItemAsync(`${key}_chunks`, String(count));
        for (let i = 0; i < count; i++) {
          const chunk = value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
          await SecureStore.setItemAsync(`${key}_chunk_${i}`, chunk);
        }
        await SecureStore.deleteItemAsync(key);
      } else {
        await SecureStore.setItemAsync(key, value);
      }
    } catch (err) {
      console.warn('[SecureStore] setItem error:', err);
    }
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      const chunkCountStr = await SecureStore.getItemAsync(`${key}_chunks`);
      if (chunkCountStr) {
        const count = parseInt(chunkCountStr, 10);
        for (let i = 0; i < count; i++) {
          await SecureStore.deleteItemAsync(`${key}_chunk_${i}`);
        }
        await SecureStore.deleteItemAsync(`${key}_chunks`);
      }
      await SecureStore.deleteItemAsync(key);
    } catch (err) {
      console.warn('[SecureStore] removeItem error:', err);
    }
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS !== 'web' ? ExpoSecureStoreAdapter : undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Helper to get current user ID (throws if not authenticated)
export const getCurrentUserId = async (): Promise<string> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
};

// Helper to get current session
export const getSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};

export default supabase;
