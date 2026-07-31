import { supabase } from './supabase';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';

WebBrowser.maybeCompleteAuthSession();

// ─── Helpers ───────────────────────────────────────────────────────────────

export const formatPhoneNumberE164 = (phone: string): string => {
  let cleaned = phone.trim().replace(/[^\d+]/g, '');
  if (!cleaned) return '';
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  return cleaned;
};

export const handleAuthUrl = async (url: string) => {
  if (!url) return null;

  try {
    // Handle PKCE auth code exchange
    const parsed = Linking.parse(url);
    const code = parsed.queryParams?.code as string | undefined;
    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
      return data;
    }

    // Handle implicit hash parameters (#access_token=...&refresh_token=...)
    const hashIndex = url.indexOf('#');
    if (hashIndex !== -1) {
      const hash = url.substring(hashIndex + 1);
      const params = new URLSearchParams(hash);
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      if (access_token && refresh_token) {
        const { data, error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        if (error) throw error;
        return data;
      }
    }
  } catch (err) {
    console.warn('[Auth] Failed to handle auth URL:', err);
    throw err;
  }
  return null;
};

// ─── Email Auth ────────────────────────────────────────────────────────────

export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw error;
  return data;
};

export const signUpWithEmail = async (
  email: string,
  password: string,
  name: string,
) => {
  const redirectUrl = Linking.createURL('login');
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      emailRedirectTo: redirectUrl,
      data: { name: name.trim(), full_name: name.trim() },
    },
  });
  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const resetPassword = async (email: string) => {
  const redirectUrl = Linking.createURL('reset-password');
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: redirectUrl,
  });
  if (error) throw error;
};

export const updatePassword = async (newPassword: string) => {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
};

// ─── Phone OTP ─────────────────────────────────────────────────────────────

export const sendOTP = async (phone: string) => {
  const formattedPhone = formatPhoneNumberE164(phone);
  if (formattedPhone.length < 8) {
    throw new Error('Please enter a valid phone number with country code (e.g. +91 9876543210)');
  }
  const { error } = await supabase.auth.signInWithOtp({ phone: formattedPhone });
  if (error) throw error;
};

export const verifyOTP = async (phone: string, token: string) => {
  const formattedPhone = formatPhoneNumberE164(phone);
  const { data, error } = await supabase.auth.verifyOtp({
    phone: formattedPhone,
    token: token.trim(),
    type: 'sms',
  });
  if (error) throw error;
  return data;
};

// ─── Google Auth ───────────────────────────────────────────────────────────

export const signInWithGoogle = async (idToken?: string, accessToken?: string) => {
  if (idToken) {
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
      access_token: accessToken,
    });
    if (error) throw error;
    return data;
  }

  // Cross-platform OAuth flow using WebBrowser
  const redirectUrl = Linking.createURL('login');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl,
      skipBrowserRedirect: true,
    },
  });
  if (error) throw error;
  if (data?.url) {
    const res = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
    if (res.type === 'success' && res.url) {
      return await handleAuthUrl(res.url);
    }
  }
  return null;
};

// ─── Apple Auth ────────────────────────────────────────────────────────────

export const signInWithApple = async () => {
  if (Platform.OS === 'web') {
    throw new Error('Apple Sign In is not available on web');
  }

  const AppleAuthentication = require('expo-apple-authentication');
  const isAvailable = await AppleAuthentication.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Apple Sign In is not supported on this device');
  }

  // Generate SHA256 hashed nonce for Supabase auth verification
  const rawNonce = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce
  );

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  });

  if (!credential.identityToken) throw new Error('Apple Sign In failed to obtain identity token');

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce: rawNonce,
  });
  if (error) throw error;
  return data;
};

// ─── Biometric Auth ────────────────────────────────────────────────────────

export const checkBiometricSupport = async () => {
  if (Platform.OS === 'web') {
    return { compatible: false, enrolled: false, types: [] };
  }
  const LocalAuthentication = require('expo-local-authentication');
  const compatible = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
  return { compatible, enrolled, types };
};

export const authenticateWithBiometrics = async () => {
  if (Platform.OS === 'web') {
    return { success: false, error: 'not-available' };
  }
  const LocalAuthentication = require('expo-local-authentication');
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Authenticate to access TribeLink',
    fallbackLabel: 'Use Password',
    cancelLabel: 'Cancel',
    disableDeviceFallback: false,
  });
  return result;
};

// ─── Session Helpers ───────────────────────────────────────────────────────

export const getUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const getSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};

export const onAuthStateChange = (callback: (event: string, session: any) => void) => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
  return subscription;
};
