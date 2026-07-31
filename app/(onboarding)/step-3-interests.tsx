import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, TextInput, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppSelector } from '../../store';
import { darkTheme, lightTheme, INTERESTS } from '../../constants/Theme';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';

const STEP = 3;
const TOTAL = 6;

export default function InterestsStep() {
  const isDark = useAppSelector(s => s.theme.resolvedMode === 'dark');
  const theme  = isDark ? darkTheme : lightTheme;
  const userId = useAppSelector(s => s.auth.user?.id);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const filtered = INTERESTS.filter(i =>
    i.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (interest: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(interest) ? next.delete(interest) : next.add(interest);
      return next;
    });
  };

  const handleNext = async () => {
    if (selected.size < 3) {
      Alert.alert('Select at least 3 interests', 'Help us find your tribe!');
      return;
    }
    setLoading(true);
    try {
      const rows = Array.from(selected).map(interest => ({
        user_id: userId,
        interest,
        level: 'beginner' as const,
      }));
      await supabase.from('user_interests').upsert(rows, { onConflict: 'user_id,interest' });
      router.push('/(onboarding)/step-4-goals');
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
        {/* Header */}
        <View style={styles.header}>
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
        </View>

        <View style={styles.titleSection}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            What are you into? 🎯
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Pick 3+ interests to find your tribe ({selected.size} selected)
          </Text>
        </View>

        {/* Search */}
        <View style={[styles.searchBox, {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        }]}>
          <Ionicons name="search-outline" size={16} color={theme.colors.textTertiary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search interests..."
            placeholderTextColor={theme.colors.textTertiary}
            style={{ flex: 1, color: theme.colors.text, fontFamily: 'Inter-Regular', fontSize: 14 }}
          />
        </View>

        {/* Interests grid */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
        >
          {filtered.map(interest => {
            const isSelected = selected.has(interest);
            return (
              <TouchableOpacity
                key={interest}
                onPress={() => toggle(interest)}
                activeOpacity={0.8}
                style={[styles.chip, {
                  backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
                  borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                }]}
              >
                {isSelected && (
                  <Ionicons name="checkmark" size={12} color="#FFF" />
                )}
                <Text style={[styles.chipText, {
                  color: isSelected ? '#FFF' : theme.colors.text,
                }]}>
                  {interest}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* CTA */}
        <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
          <Button
            title={`Continue (${selected.size} selected)`}
            onPress={handleNext}
            variant="gradient"
            size="lg"
            fullWidth
            loading={loading}
            disabled={selected.size < 3}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  header:      { paddingHorizontal: 20, paddingTop: 12 },
  progressRow: { flexDirection: 'row', gap: 4, height: 4, alignItems: 'center' },
  dot: {
    height: 4,
    borderRadius: 2,
    width: 8,
    minWidth: 8,
  },
  stepLabel:   { fontSize: 12, fontFamily: 'Inter-Medium', marginTop: 8 },
  titleSection:{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  title:       { fontSize: 26, fontFamily: 'Inter-Bold', letterSpacing: -0.5 },
  subtitle:    { fontSize: 14, fontFamily: 'Inter-Regular', marginTop: 6 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 20, paddingHorizontal: 14,
    height: 44, borderRadius: 12, borderWidth: 1.5, marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
    borderWidth: 1.5,
  },
  chipText:    { fontSize: 13, fontFamily: 'Inter-Medium' },
  footer: {
    padding: 20,
    borderTopWidth: 1,
  },
});
