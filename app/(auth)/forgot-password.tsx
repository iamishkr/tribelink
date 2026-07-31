import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector } from '../../store';
import { darkTheme, lightTheme } from '../../constants/Theme';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { resetPassword } from '../../lib/auth';
import { getAuthErrorMessage } from '../../utils/authErrors';

export default function ForgotPasswordScreen() {
  const isDark = useAppSelector(s => s.theme.resolvedMode === 'dark');
  const theme  = isDark ? darkTheme : lightTheme;
  const [email, setEmail]   = useState('');
  const [sent, setSent]     = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!email.trim()) {
      Alert.alert('Enter your email', 'Please type your email address first.');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email.trim());
      setSent(true);
    } catch (e: any) {
      Alert.alert('Error', getAuthErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.colors.background }]}>
      <TouchableOpacity style={s.back} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
      </TouchableOpacity>
      <View style={s.content}>
        <Ionicons
          name={sent ? 'checkmark-circle-outline' : 'key-outline'}
          size={56}
          color={sent ? theme.colors.success : theme.colors.primary}
        />
        <Text style={[s.title, { color: theme.colors.text }]}>
          {sent ? 'Check your email!' : 'Reset Password'}
        </Text>
        <Text style={[s.sub, { color: theme.colors.textSecondary }]}>
          {sent
            ? `We sent a password reset link to\n${email}.\nCheck your inbox and follow the link.`
            : 'Enter your email to receive a password reset link.'}
        </Text>

        {!sent && (
          <>
            <Input
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              leftIcon="mail-outline"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Button
              title="Send Reset Link"
              onPress={handleSend}
              variant="gradient"
              size="lg"
              fullWidth
              loading={loading}
            />
          </>
        )}

        {sent && (
          <>
            <Button
              title="Back to Sign In"
              onPress={() => router.replace('/(auth)/login')}
              variant="gradient"
              size="lg"
              fullWidth
            />
            <TouchableOpacity onPress={() => { setSent(false); }} style={s.resend}>
              <Text style={[s.resendText, { color: theme.colors.primary }]}>
                Didn't get it? Send again
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  back:      { padding: 16 },
  content:   { padding: 24, gap: 20, flex: 1, justifyContent: 'center' },
  title:     { fontSize: 24, fontFamily: 'Inter-Bold', letterSpacing: -0.5 },
  sub:       { fontSize: 14, lineHeight: 22, fontFamily: 'Inter-Regular' },
  resend:    { alignItems: 'center', marginTop: 4 },
  resendText:{ fontSize: 14, fontFamily: 'Inter-SemiBold' },
});