import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppSelector, useAppDispatch } from '../../store';
import { setUser } from '../../store/authSlice';
import { darkTheme, lightTheme } from '../../constants/Theme';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { signInWithEmail, signInWithGoogle, signInWithApple } from '../../lib/auth';
import { getAuthErrorMessage } from '../../utils/authErrors';

const loginSchema = z.object({
  email:    z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const dispatch = useAppDispatch();
  const isDark   = useAppSelector(s => s.theme.resolvedMode === 'dark');
  const theme    = isDark ? darkTheme : lightTheme;
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const handleDemoLogin = () => {
    dispatch(setUser({
      id: 'demo-user-123',
      email: 'demo@tribelink.app',
      name: 'Demo Explorer',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
      bio: 'Exploring new tribes and connecting with awesome people!',
      city: 'San Francisco, CA',
      occupation: 'Product Designer',
      interests: ['Tech', 'Design', 'Startup', 'Music'],
      goals: ['Network', 'Learn', 'Find Co-founder'],
      skills: ['UI/UX', 'React Native', 'Figma'],
      xp: 1250,
      level: 3,
      streak: 5,
      is_verified: true,
      is_online: true,
      onboarding_complete: true,
    } as any));
  };

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      await signInWithEmail(data.email, data.password);
    } catch (e: any) {
      Alert.alert('Sign In Failed', getAuthErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      await signInWithApple();
    } catch (e: any) {
      if (e?.code === 'ERR_REQUEST_CANCELED' || e?.message?.includes('canceled')) return;
      Alert.alert('Apple Sign In Failed', getAuthErrorMessage(e));
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (e: any) {
      Alert.alert('Google Sign In Failed', getAuthErrorMessage(e));
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <LinearGradient
        colors={isDark
          ? ['#1A0533', '#0A0A1B', '#0A0A1B']
          : ['#EDE9FE', '#F8F7FF', '#F8F7FF']}
        style={StyleSheet.absoluteFill}
        locations={[0, 0.4, 1]}
      />

      <View style={[styles.circle1, { backgroundColor: isDark
        ? 'rgba(124,58,237,0.15)' : 'rgba(124,58,237,0.1)' }]} />
      <View style={[styles.circle2, { backgroundColor: isDark
        ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.07)' }]} />

      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.logoSection}>
              <LinearGradient
                colors={theme.colors.gradientPrimary as any}
                style={styles.logoContainer}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="people" size={32} color="#FFF" />
              </LinearGradient>
              <Text style={[styles.appName, { color: theme.colors.text }]}>TribeLink</Text>
              <Text style={[styles.tagline, { color: theme.colors.textSecondary }]}>
                Find Your Tribe
              </Text>
            </View>

            <View style={[styles.card, {
              backgroundColor: theme.colors.glass,
              borderColor: theme.colors.glassBorder,
            }]}>
              <Text style={[styles.heading, { color: theme.colors.text }]}>Welcome back 👋</Text>
              <Text style={[styles.subheading, { color: theme.colors.textSecondary }]}>
                Sign in to continue your journey
              </Text>

              <View style={styles.form}>
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      label="Email"
                      placeholder="you@example.com"
                      value={value}
                      onChangeText={onChange}
                      leftIcon="mail-outline"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      error={errors.email?.message}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      label="Password"
                      placeholder="••••••••"
                      value={value}
                      onChangeText={onChange}
                      leftIcon="lock-closed-outline"
                      isPassword
                      error={errors.password?.message}
                    />
                  )}
                />

                <TouchableOpacity
                  onPress={() => router.push('/(auth)/forgot-password')}
                  style={{ alignSelf: 'flex-end' }}
                >
                  <Text style={[styles.forgotText, { color: theme.colors.primary }]}>
                    Forgot password?
                  </Text>
                </TouchableOpacity>

                <Button
                  title="Sign In"
                  onPress={handleSubmit(onSubmit)}
                  variant="gradient"
                  size="lg"
                  loading={loading}
                  fullWidth
                />

                <Button
                  title="⚡ Quick Demo Login"
                  onPress={handleDemoLogin}
                  variant="secondary"
                  size="lg"
                  fullWidth
                />
              </View>

              <View style={styles.dividerRow}>
                <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
                <Text style={[styles.dividerText, { color: theme.colors.textTertiary }]}>or continue with</Text>
                <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
              </View>

              <View style={styles.socialRow}>
                <TouchableOpacity
                  style={[styles.socialBtn, {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  }]}
                  onPress={handleAppleSignIn}
                >
                  <Ionicons name="logo-apple" size={20} color={theme.colors.text} />
                  <Text style={[styles.socialText, { color: theme.colors.text }]}>Apple</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.socialBtn, {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  }]}
                  onPress={handleGoogleSignIn}
                >
                  <Ionicons name="logo-google" size={20} color="#EA4335" />
                  <Text style={[styles.socialText, { color: theme.colors.text }]}>Google</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.socialBtn, {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  }]}
                  onPress={() => router.push('/(auth)/verify-otp')}
                >
                  <Ionicons name="call-outline" size={20} color={theme.colors.text} />
                  <Text style={[styles.socialText, { color: theme.colors.text }]}>Phone</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.signupRow}>
              <Text style={[styles.signupText, { color: theme.colors.textSecondary }]}>
                New to TribeLink?{' '}
              </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                <Text style={[styles.signupLink, { color: theme.colors.primary }]}>
                  Create Account
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll:        { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 40 },
  circle1: {
    position: 'absolute', width: 300, height: 300,
    borderRadius: 150, top: -80, right: -80,
  },
  circle2: {
    position: 'absolute', width: 200, height: 200,
    borderRadius: 100, bottom: 100, left: -60,
  },
  logoSection:    { alignItems: 'center', paddingTop: 60, paddingBottom: 40 },
  logoContainer: {
    width: 72, height: 72, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  appName:        { fontSize: 32, fontFamily: 'Inter-ExtraBold', letterSpacing: -1 },
  tagline:        { fontSize: 15, fontFamily: 'Inter-Regular', marginTop: 4 },
  card: {
    borderRadius: 28, padding: 28,
    borderWidth: 1, gap: 0,
  },
  heading:        { fontSize: 24, fontFamily: 'Inter-Bold', marginBottom: 6 },
  subheading:     { fontSize: 14, fontFamily: 'Inter-Regular', marginBottom: 24 },
  form:           { gap: 16 },
  forgotText:     { fontSize: 13, fontFamily: 'Inter-Medium', marginTop: 2 },
  dividerRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
  divider:        { flex: 1, height: 1 },
  dividerText:    { fontSize: 12, fontFamily: 'Inter-Regular' },
  socialRow:      { flexDirection: 'row', gap: 12 },
  socialBtn: {
    flex: 1, height: 48, borderRadius: 14, borderWidth: 1.5,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  socialText:     { fontSize: 14, fontFamily: 'Inter-SemiBold' },
  signupRow:      { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  signupText:     { fontSize: 14, fontFamily: 'Inter-Regular' },
  signupLink:     { fontSize: 14, fontFamily: 'Inter-SemiBold' },
});
