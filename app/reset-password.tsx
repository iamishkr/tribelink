import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Alert,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppSelector } from '../store';
import { darkTheme, lightTheme } from '../constants/Theme';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { updatePassword } from '../lib/auth';
import { getAuthErrorMessage } from '../utils/authErrors';

const schema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm:  z.string(),
}).refine(d => d.password === d.confirm, {
  message: "Passwords don't match",
  path: ['confirm'],
});

type FormData = z.infer<typeof schema>;

export default function ResetPasswordScreen() {
  const isDark   = useAppSelector(s => s.theme.resolvedMode === 'dark');
  const theme    = isDark ? darkTheme : lightTheme;
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirm: '' },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await updatePassword(data.password);
      setDone(true);
    } catch (e: any) {
      Alert.alert('Reset Password Failed', getAuthErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <LinearGradient
        colors={isDark ? ['#1A0533', '#0A0A1B', '#0A0A1B'] : ['#EDE9FE', '#F8F7FF', '#F8F7FF']}
        style={StyleSheet.absoluteFill}
        locations={[0, 0.4, 1]}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

            <View style={styles.logoSection}>
              <LinearGradient
                colors={theme.colors.gradientPrimary as any}
                style={styles.logoContainer}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              >
                <Ionicons name="lock-open-outline" size={32} color="#FFF" />
              </LinearGradient>
              <Text style={[styles.appName, { color: theme.colors.text }]}>TribeLink</Text>
            </View>

            {done ? (
              <View style={[styles.card, { backgroundColor: theme.colors.glass, borderColor: theme.colors.glassBorder }]}>
                <View style={{ alignItems: 'center', gap: 16, paddingVertical: 20 }}>
                  <Ionicons name="checkmark-circle" size={64} color={theme.colors.success} />
                  <Text style={[styles.heading, { color: theme.colors.text }]}>Password Updated! ✅</Text>
                  <Text style={[styles.subheading, { color: theme.colors.textSecondary, textAlign: 'center' }]}>
                    Your password has been changed successfully. You can now sign in with your new password.
                  </Text>
                  <Button
                    title="Back to Login"
                    onPress={() => router.replace('/(auth)/login')}
                    variant="gradient"
                    size="lg"
                    fullWidth
                  />
                </View>
              </View>
            ) : (
              <View style={[styles.card, { backgroundColor: theme.colors.glass, borderColor: theme.colors.glassBorder }]}>
                <Text style={[styles.heading, { color: theme.colors.text }]}>Set New Password 🔐</Text>
                <Text style={[styles.subheading, { color: theme.colors.textSecondary }]}>
                  Enter a strong new password for your account.
                </Text>

                <View style={styles.form}>
                  <Controller
                    control={control} name="password"
                    render={({ field: { onChange, value } }) => (
                      <Input
                        label="New Password"
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
                    control={control} name="confirm"
                    render={({ field: { onChange, value } }) => (
                      <Input
                        label="Confirm Password"
                        placeholder="Repeat your new password"
                        value={value}
                        onChangeText={onChange}
                        leftIcon="shield-checkmark-outline"
                        isPassword
                        error={errors.confirm?.message}
                      />
                    )}
                  />
                  <Button
                    title="Update Password"
                    onPress={handleSubmit(onSubmit)}
                    variant="gradient"
                    size="lg"
                    loading={loading}
                    fullWidth
                  />
                </View>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll:         { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 40 },
  logoSection:    { alignItems: 'center', paddingTop: 60, paddingBottom: 40 },
  logoContainer: {
    width: 72, height: 72, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  appName:        { fontSize: 28, fontFamily: 'Inter-ExtraBold', letterSpacing: -1 },
  card:           { borderRadius: 28, padding: 28, borderWidth: 1 },
  heading:        { fontSize: 22, fontFamily: 'Inter-Bold', marginBottom: 6 },
  subheading:     { fontSize: 14, fontFamily: 'Inter-Regular', marginBottom: 24 },
  form:           { gap: 16 },
});
