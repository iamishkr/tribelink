import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppSelector } from '../../store';
import { darkTheme, lightTheme } from '../../constants/Theme';
import { Button } from '../../components/ui/Button';
import { requestLocationPermissionsAndPosition } from '../../lib/location';

const STEP = 5;
const TOTAL = 6;

export default function Step5Location() {
  const isDark = useAppSelector(s => s.theme.resolvedMode === 'dark');
  const theme  = isDark ? darkTheme : lightTheme;
  const user   = useAppSelector(s => s.auth.user);

  const [status, setStatus]   = useState<'idle' | 'loading' | 'granted' | 'denied'>('idle');
  const [city, setCity]       = useState<string | null>(null);

  const handleRequestLocation = async () => {
    setStatus('loading');
    console.log('[Step5Location] User pressed Enable Location button.');

    const res = await requestLocationPermissionsAndPosition(user?.id);

    if (res.granted) {
      setCity(res.city || 'Current Location');
      setStatus('granted');
      console.log('[Step5Location] Location granted & saved successfully.');
    } else {
      setStatus('denied');
      console.warn('[Step5Location] Location request failed/denied:', res.error);
    }
  };

  const handleNext = () => router.push('/(onboarding)/step-6-preferences');
  const handleSkip = () => router.push('/(onboarding)/step-6-preferences');

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <LinearGradient
        colors={isDark ? ['#13132E', '#0A0A1B'] : ['#F5F3FF', '#F8F7FF']}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.container}>
          {/* Progress */}
          <View style={styles.progressRow}>
            {Array.from({ length: TOTAL }).map((_, i) => (
              <View key={i} style={[styles.dot, {
                flex: i < STEP ? 1 : undefined, width: i < STEP ? undefined : 8,
                backgroundColor: i < STEP ? theme.colors.primary : theme.colors.border,
              }]} />
            ))}
          </View>
          <Text style={[styles.stepLabel, { color: theme.colors.textTertiary }]}>
            Step {STEP} of {TOTAL}
          </Text>

          <View style={styles.hero}>
            <View style={[styles.mapIcon, { backgroundColor: isDark ? 'rgba(124,58,237,0.2)' : 'rgba(124,58,237,0.1)' }]}>
              <Ionicons name="location" size={52} color={theme.colors.primary} />
            </View>
            <Text style={[styles.title, { color: theme.colors.text }]}>Where are you based? 📍</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              We only show approximate location to protect your privacy.
              Your exact coordinates are never shared.
            </Text>
          </View>

          {/* Privacy note */}
          <View style={[styles.privacyNote, {
            backgroundColor: isDark ? 'rgba(124,58,237,0.1)' : 'rgba(124,58,237,0.06)',
            borderColor: theme.colors.border,
          }]}>
            <Ionicons name="shield-checkmark-outline" size={18} color={theme.colors.primary} />
            <Text style={[styles.privacyText, { color: theme.colors.textSecondary }]}>
              We show only approximate distance (e.g. "2km away") — never your exact address.
            </Text>
          </View>

          {/* Status display */}
          {status === 'granted' && (
            <View style={[styles.granted, { backgroundColor: 'rgba(52,211,153,0.1)', borderColor: 'rgba(52,211,153,0.3)' }]}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
              <Text style={[styles.grantedText, { color: theme.colors.success }]}>
                Location set: {city || 'Location Active'}
              </Text>
            </View>
          )}
          {status === 'denied' && (
            <View style={[styles.granted, { backgroundColor: 'rgba(251,113,133,0.1)', borderColor: 'rgba(251,113,133,0.3)' }]}>
              <Ionicons name="close-circle" size={20} color={theme.colors.error} />
              <Text style={[styles.grantedText, { color: theme.colors.error }]}>
                Location permission denied. Please allow location in device Settings.
              </Text>
            </View>
          )}

          <View style={{ flex: 1 }} />

          <View style={styles.actions}>
            {status === 'idle' || status === 'denied' || status === 'loading' ? (
              <Button
                title={status === 'denied' ? 'Try Again' : '📍 Enable Location'}
                onPress={handleRequestLocation}
                variant="gradient"
                size="lg"
                fullWidth
                loading={status === 'loading'}
              />
            ) : (
              <Button
                title="Continue →"
                onPress={handleNext}
                variant="gradient"
                size="lg"
                fullWidth
              />
            )}
            <TouchableOpacity onPress={handleSkip} style={{ alignItems: 'center', padding: 12 }}>
              <Text style={[{ color: theme.colors.textTertiary, fontSize: 14, fontFamily: 'Inter-Regular' }]}>
                Skip for now
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, paddingHorizontal: 24, paddingBottom: 32 },
  progressRow: { flexDirection: 'row', gap: 4, height: 4, alignItems: 'center', marginTop: 16 },
  dot:         { height: 4, borderRadius: 2, width: 8, minWidth: 8 },
  stepLabel:   { fontSize: 12, fontFamily: 'Inter-Medium', marginTop: 8 },
  hero:        { alignItems: 'center', paddingVertical: 40, gap: 16 },
  mapIcon: {
    width: 100, height: 100, borderRadius: 50,
    alignItems: 'center', justifyContent: 'center',
  },
  title:       { fontSize: 24, fontFamily: 'Inter-Bold', textAlign: 'center', letterSpacing: -0.5 },
  subtitle:    { fontSize: 14, fontFamily: 'Inter-Regular', textAlign: 'center', lineHeight: 21 },
  privacyNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 16,
  },
  privacyText: { flex: 1, fontSize: 13, fontFamily: 'Inter-Regular', lineHeight: 20 },
  granted: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14, borderRadius: 14, borderWidth: 1,
  },
  grantedText:  { fontSize: 14, fontFamily: 'Inter-SemiBold', flex: 1 },
  actions:      { gap: 4 },
});
