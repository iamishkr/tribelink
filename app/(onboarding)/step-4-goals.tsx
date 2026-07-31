import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ScrollView, FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppSelector } from '../../store';
import { darkTheme, lightTheme } from '../../constants/Theme';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';

const STEP = 4;
const TOTAL = 6;

const SUGGESTED_GOALS = [
  'Learn a new programming language', 'Start a startup', 'Find a mentor',
  'Build a side project', 'Get a job offer', 'Publish research paper',
  'Learn guitar', 'Run a marathon', 'Read 24 books this year',
  'Launch a YouTube channel', 'Network with 50 professionals',
  'Learn photography', 'Travel to 5 countries', 'Get certified in cloud',
  'Build a mobile app', 'Learn machine learning', 'Start a podcast',
  'Lose 10kg', 'Learn to cook', 'Write a book',
];

export default function Step4Goals() {
  const isDark = useAppSelector(s => s.theme.resolvedMode === 'dark');
  const theme  = isDark ? darkTheme : lightTheme;
  const user   = useAppSelector(s => s.auth.user);

  const [goals, setGoals]     = useState<string[]>([]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);

  const addGoal = (goal: string) => {
    const g = goal.trim();
    if (g && !goals.includes(g) && goals.length < 10) {
      setGoals(prev => [...prev, g]);
      setInput('');
    }
  };

  const removeGoal = (goal: string) => {
    setGoals(prev => prev.filter(g => g !== goal));
  };

  const handleNext = async () => {
    setLoading(true);
    try {
      if (goals.length > 0) {
        await supabase.from('user_goals').insert(
          goals.map(goal => ({ user_id: user!.id, goal }))
        );
      }
      router.push('/(onboarding)/step-5-location');
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
        {/* Progress */}
        <View style={styles.header}>
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
          <Text style={[styles.title, { color: theme.colors.text }]}>What are your goals? 🎯</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Find people working toward the same things ({goals.length} added)
          </Text>

          {/* Goal input */}
          <View style={[styles.inputRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Add a goal..."
              placeholderTextColor={theme.colors.textTertiary}
              style={[styles.goalInput, { color: theme.colors.text }]}
              onSubmitEditing={() => addGoal(input)}
              returnKeyType="done"
            />
            <TouchableOpacity
              onPress={() => addGoal(input)}
              style={[styles.addBtn, { backgroundColor: theme.colors.primary, opacity: input.trim() ? 1 : 0.4 }]}
            >
              <Ionicons name="add" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* My goals */}
          {goals.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 8 }}>
                {goals.map(goal => (
                  <View key={goal} style={[styles.goalChip, { backgroundColor: theme.colors.primary }]}>
                    <Text style={styles.goalChipText} numberOfLines={1}>{goal}</Text>
                    <TouchableOpacity onPress={() => removeGoal(goal)}>
                      <Ionicons name="close" size={14} color="rgba(255,255,255,0.8)" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </View>

        {/* Suggestions */}
        <Text style={[styles.suggestLabel, { color: theme.colors.textSecondary }]}>
          Suggestions
        </Text>
        <FlatList
          data={SUGGESTED_GOALS.filter(g => !goals.includes(g))}
          keyExtractor={item => item}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100, gap: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => addGoal(item)}
              style={[styles.suggestion, {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.suggestionText, { color: theme.colors.text }]}>{item}</Text>
              <Ionicons name="add-circle-outline" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
          )}
        />

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
          <Button
            title={goals.length > 0 ? 'Continue →' : 'Skip for now'}
            onPress={handleNext}
            variant="gradient"
            size="lg"
            fullWidth
            loading={loading}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  header:        { paddingHorizontal: 20, paddingBottom: 8 },
  progressRow:   { flexDirection: 'row', gap: 4, height: 4, alignItems: 'center', marginTop: 16 },
  dot:           { height: 4, borderRadius: 2, width: 8, minWidth: 8 },
  stepLabel:     { fontSize: 12, fontFamily: 'Inter-Medium', marginTop: 8 },
  title:         { fontSize: 24, fontFamily: 'Inter-Bold', letterSpacing: -0.5, marginTop: 16 },
  subtitle:      { fontSize: 14, fontFamily: 'Inter-Regular', marginTop: 6, marginBottom: 16 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 12, height: 48,
  },
  goalInput:   { flex: 1, fontSize: 14, fontFamily: 'Inter-Regular' },
  addBtn:      { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  goalChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 9999,
    maxWidth: 200,
  },
  goalChipText: { color: '#FFF', fontSize: 12, fontFamily: 'Inter-Medium', flex: 1 },
  suggestLabel: { fontSize: 12, fontFamily: 'Inter-SemiBold', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  suggestion: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderRadius: 12, borderWidth: 1.5,
  },
  suggestionText: { fontSize: 14, fontFamily: 'Inter-Regular', flex: 1, marginRight: 8 },
  footer:         { padding: 20, borderTopWidth: 1 },
});
