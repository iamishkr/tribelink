import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Switch, ScrollView, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppSelector, useAppDispatch } from '../../store';
import { darkTheme, lightTheme } from '../../constants/Theme';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';
import { setOnboardingComplete, updateProfile } from '../../store/authSlice';

const STEP = 6;
const TOTAL = 6;

export default function Step6Preferences() {
  const isDark   = useAppSelector(s => s.theme.resolvedMode === 'dark');
  const theme    = isDark ? darkTheme : lightTheme;
  const user     = useAppSelector(s => s.auth.user);
  const dispatch = useAppDispatch();

  const [showLocation, setShowLocation] = useState(true);
  const [showAge, setShowAge]           = useState(true);
  const [allowMessages, setAllowMessages] = useState<'everyone' | 'connections' | 'none'>('everyone');
  const [loading, setLoading]           = useState(false);

  const finish = async () => {
    setLoading(true);
    try {
      await supabase.from('profiles').update({
        show_location:    showLocation,
        show_age:         showAge,
        allow_messages:   allowMessages,
        onboarding_complete: true,
        profile_complete:    true,
      }).eq('id', user!.id);

      // Award first-login XP
      await supabase.rpc('award_xp', {
        p_user_id: user!.id,
        p_action:  'profileComplete',
        p_xp:      100,
      });

      dispatch(setOnboardingComplete());
      dispatch(updateProfile({
        show_location:    showLocation,
        show_age:         showAge,
        allow_messages:   allowMessages,
        onboarding_complete: true,
      }));

      router.replace('/(tabs)/home');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const ToggleRow = ({
    icon, title, description, value, onToggle,
  }: {
    icon: string; title: string; description: string;
    value: boolean; onToggle: (v: boolean) => void;
  }) => (
    <View style={[styles.toggleRow, { borderColor: theme.colors.border }]}>
      <View style={[styles.toggleIcon, { backgroundColor: isDark ? 'rgba(124,58,237,0.15)' : 'rgba(124,58,237,0.08)' }]}>
        <Text style={{ fontSize: 22 }}>{icon}</Text>
      </View>
      <View style={styles.toggleText}>
        <Text style={[styles.toggleTitle, { color: theme.colors.text }]}>{title}</Text>
        <Text style={[styles.toggleDesc, { color: theme.colors.textTertiary }]}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
        thumbColor="#FFF"
      />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <LinearGradient
        colors={isDark ? ['#13132E', '#0A0A1B'] : ['#F5F3FF', '#F8F7FF']}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Progress */}
          <View style={styles.progressRow}>
            {Array.from({ length: TOTAL }).map((_, i) => (
              <View key={i} style={[styles.dot, {
                flex: 1, backgroundColor: theme.colors.primary,
              }]} />
            ))}
          </View>
          <Text style={[styles.stepLabel, { color: theme.colors.primary }]}>
            ✅ Final Step!
          </Text>

          <Text style={[styles.title, { color: theme.colors.text }]}>Privacy Settings 🔒</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            You control who sees what. These can be changed anytime.
          </Text>

          <View style={styles.toggles}>
            <ToggleRow
              icon="📍"
              title="Show Approximate Location"
              description="People see '2km away' — never your exact address"
              value={showLocation}
              onToggle={setShowLocation}
            />
            <ToggleRow
              icon="🎂"
              title="Show Age"
              description="Display your age on your public profile"
              value={showAge}
              onToggle={setShowAge}
            />
          </View>

          {/* Messages preference */}
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Who can message you?
          </Text>
          {(['everyone', 'connections', 'none'] as const).map(opt => (
            <View
              key={opt}
              style={[styles.radioRow, {
                backgroundColor: allowMessages === opt
                  ? (isDark ? 'rgba(124,58,237,0.15)' : 'rgba(124,58,237,0.08)')
                  : theme.colors.surface,
                borderColor: allowMessages === opt ? theme.colors.primary : theme.colors.border,
              }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.radioTitle, { color: theme.colors.text }]}>
                  {opt === 'everyone' ? '🌍 Everyone' : opt === 'connections' ? '🤝 Connections only' : '🚫 No one'}
                </Text>
              </View>
              <View style={[styles.radio, {
                borderColor: allowMessages === opt ? theme.colors.primary : theme.colors.border,
              }]}>
                {allowMessages === opt && (
                  <View style={[styles.radioFill, { backgroundColor: theme.colors.primary }]} />
                )}
              </View>
              <View style={StyleSheet.absoluteFill}>
                <View onTouchEnd={() => setAllowMessages(opt)} style={{ flex: 1 }} />
              </View>
            </View>
          ))}

          <Button
            title="🚀 Let's Go!"
            onPress={finish}
            variant="gradient"
            size="xl"
            fullWidth
            loading={loading}
            style={{ marginTop: 24 }}
          />

          <Text style={[styles.note, { color: theme.colors.textTertiary }]}>
            You can update all privacy settings anytime from your profile.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll:       { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 60 },
  progressRow:  { flexDirection: 'row', gap: 4, height: 4, alignItems: 'center', marginTop: 16 },
  dot:          { height: 4, borderRadius: 2, minWidth: 8 },
  stepLabel:    { fontSize: 13, fontFamily: 'Inter-SemiBold', marginTop: 8, marginBottom: 24 },
  title:        { fontSize: 24, fontFamily: 'Inter-Bold', letterSpacing: -0.5, marginBottom: 8 },
  subtitle:     { fontSize: 14, fontFamily: 'Inter-Regular', lineHeight: 21, marginBottom: 24 },
  toggles:      { gap: 12, marginBottom: 24 },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderRadius: 16, borderWidth: 1.5,
  },
  toggleIcon:   { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  toggleText:   { flex: 1 },
  toggleTitle:  { fontSize: 14, fontFamily: 'Inter-SemiBold' },
  toggleDesc:   { fontSize: 12, fontFamily: 'Inter-Regular', marginTop: 2 },
  sectionTitle: { fontSize: 16, fontFamily: 'Inter-SemiBold', marginBottom: 12 },
  radioRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 16, borderRadius: 14, borderWidth: 1.5, marginBottom: 10,
    position: 'relative',
  },
  radioTitle:  { fontSize: 14, fontFamily: 'Inter-Medium' },
  radio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  radioFill:   { width: 10, height: 10, borderRadius: 5 },
  note: {
    fontSize: 12, fontFamily: 'Inter-Regular', textAlign: 'center',
    marginTop: 16, lineHeight: 18,
  },
});
