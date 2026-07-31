import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppSelector, useAppDispatch } from '../../store';
import { darkTheme, lightTheme } from '../../constants/Theme';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Avatar } from '../../components/ui/Avatar';
import { supabase } from '../../lib/supabase';
import { updateProfile } from '../../store/authSlice';

const STEP = 1;
const TOTAL = 6;

export default function Step1Name() {
  const isDark   = useAppSelector(s => s.theme.resolvedMode === 'dark');
  const theme    = isDark ? darkTheme : lightTheme;
  const user     = useAppSelector(s => s.auth.user);
  const dispatch = useAppDispatch();

  const [name, setName]             = useState(user?.name ?? '');
  const [bio, setBio]               = useState('');
  const [occupation, setOccupation] = useState('');
  const [loading, setLoading]       = useState(false);

  const handleNext = async () => {
    if (name.trim().length < 2) {
      Alert.alert('Enter your name', 'Please enter at least 2 characters.');
      return;
    }
    setLoading(true);
    try {
      if (user?.id && user.id !== 'demo-user-123') {
        await supabase.from('profiles').update({
          name: name.trim(),
          bio:  bio.trim() || null,
          occupation: occupation.trim() || null,
        }).eq('id', user.id);
      }

      dispatch(updateProfile({ name: name.trim(), bio, occupation }));
      router.push('/(onboarding)/step-2-photo');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <LinearGradient
        colors={isDark ? ['#13132E', '#0A0A1B'] : ['#F5F3FF', '#F8F7FF']}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            {/* Progress */}
            <View style={styles.progressRow}>
              {Array.from({ length: TOTAL }).map((_, i) => (
                <View key={i} style={[styles.dot, {
                  flex: i < STEP ? 1 : undefined,
                  width: i < STEP ? undefined : 8,
                  backgroundColor: i < STEP ? theme.colors.primary : theme.colors.border,
                }]} />
              ))}
            </View>
            <Text style={[styles.stepLabel, { color: theme.colors.textTertiary }]}>
              Step {STEP} of {TOTAL}
            </Text>

            {/* Logo / Hero */}
            <View style={styles.heroSection}>
              <LinearGradient
                colors={theme.colors.gradientPrimary as any}
                style={styles.logoBox}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              >
                <Ionicons name="people" size={36} color="#FFF" />
              </LinearGradient>
              <Text style={[styles.title, { color: theme.colors.text }]}>
                Let's set up your profile 👋
              </Text>
              <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                Tell us a bit about yourself to find your tribe
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              <Input
                label="Full Name *"
                placeholder="What should we call you?"
                value={name}
                onChangeText={setName}
                leftIcon="person-outline"
                autoCapitalize="words"
              />
              <Input
                label="What do you do?"
                placeholder="Student, Developer, Artist..."
                value={occupation}
                onChangeText={setOccupation}
                leftIcon="briefcase-outline"
              />
              <View style={styles.bioWrapper}>
                <Text style={[styles.bioLabel, { color: theme.colors.textSecondary }]}>
                  Short Bio
                </Text>
                <View style={[styles.bioBox, {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                }]}>
                  <TextInput
                    value={bio}
                    onChangeText={setBio}
                    placeholder="A little about you (optional)..."
                    placeholderTextColor={theme.colors.textTertiary}
                    multiline
                    maxLength={160}
                    style={[styles.bioInput, { color: theme.colors.text }]}
                  />
                  <Text style={[styles.charCount, { color: theme.colors.textTertiary }]}>
                    {bio.length}/160
                  </Text>
                </View>
              </View>

              <Button
                title="Continue →"
                onPress={handleNext}
                variant="gradient"
                size="lg"
                fullWidth
                loading={loading}
                disabled={name.trim().length < 2}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll:       { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40 },
  progressRow:  { flexDirection: 'row', gap: 4, height: 4, alignItems: 'center', marginTop: 16 },
  dot: { height: 4, borderRadius: 2, width: 8, minWidth: 8 },
  stepLabel:    { fontSize: 12, fontFamily: 'Inter-Medium', marginTop: 8 },
  heroSection:  { alignItems: 'center', paddingVertical: 32, gap: 12 },
  logoBox: {
    width: 80, height: 80, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },
  title:        { fontSize: 24, fontFamily: 'Inter-Bold', textAlign: 'center', letterSpacing: -0.5 },
  subtitle:     { fontSize: 14, fontFamily: 'Inter-Regular', textAlign: 'center', lineHeight: 21 },
  form:         { gap: 16 },
  bioWrapper:   { gap: 6 },
  bioLabel:     { fontSize: 13, fontFamily: 'Inter-Medium', marginLeft: 2 },
  bioBox: {
    borderRadius: 12, borderWidth: 1.5, padding: 12, minHeight: 100,
  },
  bioInput: { fontSize: 14, fontFamily: 'Inter-Regular', lineHeight: 21 },
  charCount:    { fontSize: 11, fontFamily: 'Inter-Regular', textAlign: 'right', marginTop: 6 },
});
