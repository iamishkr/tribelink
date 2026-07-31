import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector } from '../../store';
import { darkTheme, lightTheme } from '../../constants/Theme';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { sendOTP, verifyOTP } from '../../lib/auth';
import { safeBack } from '../../lib/navigation';
import { getAuthErrorMessage } from '../../utils/authErrors';

export default function VerifyOTPScreen() {
  const isDark = useAppSelector(s => s.theme.resolvedMode === 'dark');
  const theme  = isDark ? darkTheme : lightTheme;
  const params = useLocalSearchParams<{ phone?: string }>();

  const [phone, setPhone]     = useState(params.phone ?? '');
  const [otp, setOtp]         = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async () => {
    const cleaned = phone.trim();
    if (!cleaned) {
      Alert.alert('Invalid phone', 'Enter a valid phone number with country code (e.g. +91 9876543210).');
      return;
    }
    setLoading(true);
    try {
      await sendOTP(cleaned);
      setOtpSent(true);
      Alert.alert('OTP Sent! 📱', `A 6-digit verification code was sent to ${cleaned}`);
    } catch (e: any) {
      Alert.alert('Error', getAuthErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp.trim() || otp.trim().length < 6) {
      Alert.alert('Enter OTP', 'Please enter the 6-digit verification code sent to your phone.');
      return;
    }
    setLoading(true);
    try {
      await verifyOTP(phone, otp.trim());
      // Auth state listener in _layout.tsx will sync user state & handle navigation automatically
    } catch (e: any) {
      Alert.alert('Invalid OTP', getAuthErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.colors.background }]}>
      <TouchableOpacity style={s.back} onPress={() => safeBack('/(auth)/login')}>
        <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
      </TouchableOpacity>

      <View style={s.content}>
        <Ionicons name="call-outline" size={56} color={theme.colors.primary} />
        <Text style={[s.title, { color: theme.colors.text }]}>
          {otpSent ? 'Enter OTP Code' : 'Phone Login'}
        </Text>
        <Text style={[s.sub, { color: theme.colors.textSecondary }]}>
          {otpSent
            ? `Enter the 6-digit code sent to ${phone}`
            : 'Enter your mobile number with country code to receive an OTP.'}
        </Text>

        {!otpSent ? (
          <>
            <Input
              label="Phone Number"
              placeholder="+91 9876543210"
              value={phone}
              onChangeText={setPhone}
              leftIcon="call-outline"
              keyboardType="phone-pad"
            />
            <Button
              title="Send OTP Code"
              onPress={handleSendOTP}
              variant="gradient"
              size="lg"
              fullWidth
              loading={loading}
            />
          </>
        ) : (
          <>
            <Input
              label="OTP Code"
              placeholder="Enter 6-digit code"
              value={otp}
              onChangeText={setOtp}
              leftIcon="keypad-outline"
              keyboardType="number-pad"
              maxLength={6}
            />
            <Button
              title="Verify & Sign In"
              onPress={handleVerifyOTP}
              variant="gradient"
              size="lg"
              fullWidth
              loading={loading}
            />
            <TouchableOpacity
              onPress={() => { setOtpSent(false); setOtp(''); }}
              style={s.resend}
            >
              <Text style={[s.resendText, { color: theme.colors.primary }]}>
                Wrong number? Change it
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSendOTP} style={s.resend}>
              <Text style={[s.resendText, { color: theme.colors.textSecondary }]}>
                Didn't receive? Resend OTP
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:  { flex: 1 },
  back:       { padding: 16 },
  content:    { padding: 24, gap: 20, flex: 1, justifyContent: 'center' },
  title:      { fontSize: 24, fontFamily: 'Inter-Bold', letterSpacing: -0.5 },
  sub:        { fontSize: 14, lineHeight: 22, fontFamily: 'Inter-Regular' },
  resend:     { alignItems: 'center', marginTop: -8 },
  resendText: { fontSize: 14, fontFamily: 'Inter-SemiBold' },
});