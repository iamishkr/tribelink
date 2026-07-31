import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert, Linking,
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
import { signUpWithEmail } from '../../lib/auth';
import { getAuthErrorMessage } from '../../utils/authErrors';

const registerSchema = z.object({
  name:     z.string().min(2, 'Name must be at least 2 characters'),
  email:    z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm:  z.string(),
}).refine(d => d.password === d.confirm, {
  message: "Passwords don't match",
  path: ['confirm'],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
  const dispatch = useAppDispatch();
  const isDark   = useAppSelector(s => s.theme.resolvedMode === 'dark');
  const theme    = isDark ? darkTheme : lightTheme;
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirm: '' },
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

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    try {
      const res = await signUpWithEmail(data.email, data.password, data.name);
      if (res?.user && !res.session) {
        Alert.alert(
          'Account Created! 📧',
          `We sent a confirmation link to ${data.email}. Please check your inbox and verify your email to log in.`
        );
      }
    } catch (e: any) {
      Alert.alert('Sign Up Failed', getAuthErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <LinearGradient
        colors={isDark ? ['#1A0533', '#0A0A1B', '#0A0A1B'] : ['#EDE9FE', '#F8F7FF', '#F8F7FF']}
        style={StyleSheet.absoluteFill}
        locations={[0, 0.35, 1]}
      />

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
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
            </TouchableOpacity>

            <View style={styles.header}>
              <Text style={[styles.heading, { color: theme.colors.text }]}>
                Join TribeLink ✨
              </Text>
              <Text style={[styles.subheading, { color: theme.colors.textSecondary }]}>
                Find people who share your passions
              </Text>
            </View>

            <View style={[styles.card, {
              backgroundColor: theme.colors.glass,
              borderColor: theme.colors.glassBorder,
            }]}>
              <View style={styles.form}>
                <Controller
                  control={control}
                  name="name"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      label="Full Name"
                      placeholder="Your name"
                      value={value}
                      onChangeText={onChange}
                      leftIcon="person-outline"
                      error={errors.name?.message}
                    />
                  )}
                />
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
                      placeholder="Min. 8 characters"
                      value={value}
                      onChangeText={onChange}
                      leftIcon="lock-closed-outline"
                      isPassword
                      error={errors.password?.message}
                    />
                  )}
                />
                <Controller
                  control={control}
                  name="confirm"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      label="Confirm Password"
                      placeholder="Repeat password"
                      value={value}
                      onChangeText={onChange}
                      leftIcon="shield-checkmark-outline"
                      isPassword
                      error={errors.confirm?.message}
                    />
                  )}
                />

                <Text style={[styles.terms, { color: theme.colors.textTertiary }]}>
                  By signing up, you agree to our{' '}
                  <Text
                    style={{ color: theme.colors.primary }}
                    onPress={() => Linking.openURL('https://tribelink.app/terms')}
                  >Terms of Service</Text>
                  {' '}and{' '}
                  <Text
                    style={{ color: theme.colors.primary }}
                    onPress={() => Linking.openURL('https://tribelink.app/privacy')}
                  >Privacy Policy</Text>
                </Text>

                <Button
                  title="Create Account"
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
            </View>

            <View style={styles.loginRow}>
              <Text style={[styles.loginText, { color: theme.colors.textSecondary }]}>
                Already have an account?{' '}
              </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                <Text style={[styles.loginLink, { color: theme.colors.primary }]}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll:     { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 40 },
  backBtn:    { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  header:     { paddingTop: 20, paddingBottom: 28 },
  heading:    { fontSize: 28, fontFamily: 'Inter-Bold', letterSpacing: -0.5 },
  subheading: { fontSize: 15, fontFamily: 'Inter-Regular', marginTop: 6 },
  card:       { borderRadius: 28, padding: 24, borderWidth: 1 },
  form:       { gap: 16 },
  terms:      { fontSize: 12, fontFamily: 'Inter-Regular', lineHeight: 18, textAlign: 'center' },
  loginRow:   { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  loginText:  { fontSize: 14, fontFamily: 'Inter-Regular' },
  loginLink:  { fontSize: 14, fontFamily: 'Inter-SemiBold' },
});
