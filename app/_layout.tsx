import React, { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme, Linking } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';

import { store, useAppDispatch, useAppSelector } from '../store';
import { setResolvedMode } from '../store/themeSlice';
import { setSession, setUser, clearAuth, setLoading } from '../store/authSlice';
import { darkTheme, lightTheme } from '../constants/Theme';
import { supabase } from '../lib/supabase';
import { handleAuthUrl } from '../lib/auth';
import { initGlobalPresence } from '../lib/presence';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 2 },
  },
});

function AppContent() {
  const dispatch     = useAppDispatch();
  const router       = useRouter();
  const segments     = useSegments();

  const { isAuthenticated, onboardingComplete, isLoading, user } = useAppSelector(s => s.auth);
  const resolvedMode = useAppSelector(s => s.theme.resolvedMode);
  const themeMode    = useAppSelector(s => s.theme.mode);
  const systemScheme = useColorScheme();
  const isDark       = resolvedMode === 'dark';

  // Global Realtime Presence & Online Status Tracking
  useEffect(() => {
    if (!user?.id) return;
    const cleanupPresence = initGlobalPresence(user.id);
    return () => {
      if (cleanupPresence) cleanupPresence();
    };
  }, [user?.id]);

  // Resolve theme mode
  useEffect(() => {
    if (themeMode === 'system') {
      dispatch(setResolvedMode(systemScheme === 'dark' ? 'dark' : 'light'));
    } else {
      dispatch(setResolvedMode(themeMode as 'light' | 'dark'));
    }
  }, [themeMode, systemScheme]);

  // Auth listener & Session sync
  useEffect(() => {
    dispatch(setLoading(true));
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          if (session?.user) {
            dispatch(setSession({
              access_token: session.access_token,
              refresh_token: session.refresh_token,
            }));

            // Fetch profile from Supabase
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .maybeSingle();

            if (profile) {
              dispatch(setUser(profile as any));
            } else {
              // Fallback user object if profile doesn't exist yet in DB
              dispatch(setUser({
                id: session.user.id,
                email: session.user.email,
                name: session.user.user_metadata?.name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
                avatar_url: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture,
                interests: [],
                goals: [],
                skills: [],
                xp: 0,
                level: 1,
                streak: 0,
                onboarding_complete: false,
              } as any));
            }

            if (event === 'PASSWORD_RECOVERY') {
              router.push('/reset-password');
            }
          } else {
            dispatch(clearAuth());
          }
        } catch (err) {
          console.warn('[AuthListener] Error:', err);
        } finally {
          dispatch(setLoading(false));
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  // Deep link listener for password reset & auth confirmations
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      if (event?.url) {
        try {
          await handleAuthUrl(event.url);
        } catch (err) {
          console.warn('[DeepLink] Failed processing URL:', err);
        }
      }
    };

    const sub = Linking.addEventListener('url', handleDeepLink);
    Linking.getInitialURL().then(url => { if (url) handleDeepLink({ url }); });
    return () => sub.remove();
  }, []);

  // Protected route navigation guard
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup       = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === '(onboarding)';
    const isResetPassword   = segments[0] === 'reset-password';

    if (!isAuthenticated) {
      if (!inAuthGroup && !isResetPassword) {
        router.replace('/login');
      }
    } else {
      if (!onboardingComplete) {
        if (!inOnboardingGroup) {
          router.replace('/(onboarding)/step-1-welcome' as any);
        }
      } else {
        if (inAuthGroup || inOnboardingGroup) {
          router.replace('/(tabs)/home');
        }
      }
    }
  }, [isAuthenticated, onboardingComplete, isLoading, segments]);

  const currentTheme = isDark ? darkTheme : lightTheme;

  return (
    <SafeAreaProvider style={{ backgroundColor: currentTheme.colors.background }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: currentTheme.colors.background },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="chat" options={{ headerShown: false }} />
        <Stack.Screen name="user/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="reset-password" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Inter-Regular':  require('../assets/fonts/Inter-Regular.ttf'),
    'Inter-Medium':   require('../assets/fonts/Inter-Medium.ttf'),
    'Inter-SemiBold': require('../assets/fonts/Inter-SemiBold.ttf'),
    'Inter-Bold':     require('../assets/fonts/Inter-Bold.ttf'),
  });

  if (!fontsLoaded) return null;

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>
    </Provider>
  );
}
