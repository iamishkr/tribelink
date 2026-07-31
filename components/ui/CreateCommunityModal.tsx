import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, Modal, TouchableOpacity, ScrollView,
  StyleSheet, Animated, Dimensions, Alert, Platform,
  KeyboardAvoidingView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppSelector } from '../../store';
import { darkTheme, lightTheme } from '../../constants/Theme';
import { Input } from './Input';
import { supabase } from '../../lib/supabase';

const { height: SCREEN_H } = Dimensions.get('window');

const CATEGORIES = [
  { label: 'Tech',     icon: '💻', value: 'tech'     },
  { label: 'Study',    icon: '📚', value: 'study'    },
  { label: 'Startup',  icon: '🚀', value: 'startup'  },
  { label: 'Fitness',  icon: '💪', value: 'fitness'  },
  { label: 'Creative', icon: '🎨', value: 'creative' },
  { label: 'Gaming',   icon: '🎮', value: 'gaming'   },
  { label: 'Travel',   icon: '✈️', value: 'travel'   },
  { label: 'Music',    icon: '🎵', value: 'music'    },
  { label: 'General',  icon: '🌟', value: 'general'  },
];

const TYPES = [
  { label: 'Public',      icon: 'globe-outline',       value: 'public',      desc: 'Anyone can join' },
  { label: 'Private',     icon: 'lock-closed-outline',  value: 'private',     desc: 'Members approve requests' },
  { label: 'Invite Only', icon: 'mail-outline',         value: 'invite_only', desc: 'Invite-only access' },
] as const;

const schema = z.object({
  name:        z.string().min(3, 'Name must be at least 3 characters').max(50, 'Max 50 characters'),
  description: z.string().min(10, 'Add a short description').max(500, 'Max 500 characters'),
  category:    z.string().min(1, 'Pick a category'),
  type:        z.enum(['public', 'private', 'invite_only']),
});

type FormData = z.infer<typeof schema>;

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export function CreateCommunityModal({ visible, onClose, onCreated }: Props) {
  const isDark   = useAppSelector(s => s.theme.resolvedMode === 'dark');
  const theme    = isDark ? darkTheme : lightTheme;
  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '', category: '', type: 'public' },
  });

  const selectedCategory = watch('category');
  const selectedType     = watch('type');

  // Animate in/out
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 120 }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: SCREEN_H, duration: 250, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Sign in required', 'You need to be signed in to create a community.');
        return;
      }

      const { data: created, error } = await supabase
        .from('communities')
        .insert({
          name:        data.name.trim(),
          description: data.description.trim(),
          category:    data.category,
          type:        data.type,
          owner_id:    user.id,
        })
        .select('id')
        .single();

      if (error) throw error;

      if (created?.id) {
        await supabase.from('community_members').upsert({
          community_id: created.id,
          user_id: user.id,
          role: 'owner',
        });
      }

      Alert.alert('🎉 Community Created!', `"${data.name}" is live. Share it with your tribe!`);
      reset();
      onClose();
      onCreated?.();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create community. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={handleClose}>
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleClose} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          {/* Handle bar */}
          <View style={styles.handleWrap}>
            <View style={[styles.handle, { backgroundColor: theme.colors.border }]} />
          </View>

          {/* Header */}
          <LinearGradient
            colors={theme.colors.gradientPrimary as any}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.sheetHeader}
          >
            <View>
              <Text style={styles.sheetTitle}>Create Community</Text>
              <Text style={styles.sheetSubtitle}>Build your own tribe</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#FFF" />
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView
            style={[styles.body, { backgroundColor: theme.colors.background }]}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Name */}
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Community Name"
                  placeholder="e.g. React Native Builders"
                  value={value}
                  onChangeText={onChange}
                  leftIcon="people-outline"
                  error={errors.name?.message}
                />
              )}
            />

            {/* Description */}
            <Controller
              control={control}
              name="description"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Description"
                  placeholder="What's this community about?"
                  value={value}
                  onChangeText={onChange}
                  leftIcon="document-text-outline"
                  multiline
                  numberOfLines={3}
                  error={errors.description?.message}
                  inputStyle={{ minHeight: 72, paddingTop: 14 }}
                />
              )}
            />

            {/* Category */}
            <View style={{ gap: 8 }}>
              <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>
                Category
              </Text>
              {errors.category && (
                <Text style={[styles.errorText, { color: theme.colors.error }]}>
                  {errors.category.message}
                </Text>
              )}
              <View style={styles.chipGrid}>
                {CATEGORIES.map(cat => {
                  const active = selectedCategory === cat.value;
                  return (
                    <TouchableOpacity
                      key={cat.value}
                      onPress={() => setValue('category', cat.value, { shouldValidate: true })}
                      style={[styles.chip, {
                        backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                        borderColor:     active ? theme.colors.primary : theme.colors.border,
                      }]}
                    >
                      <Text style={{ fontSize: 14 }}>{cat.icon}</Text>
                      <Text style={[styles.chipText, { color: active ? '#FFF' : theme.colors.textSecondary }]}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Type */}
            <View style={{ gap: 8 }}>
              <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>
                Privacy
              </Text>
              {TYPES.map(t => {
                const active = selectedType === t.value;
                return (
                  <TouchableOpacity
                    key={t.value}
                    onPress={() => setValue('type', t.value, { shouldValidate: true })}
                    style={[styles.typeRow, {
                      backgroundColor: active ? (isDark ? 'rgba(124,58,237,0.18)' : 'rgba(124,58,237,0.08)') : theme.colors.surface,
                      borderColor:     active ? theme.colors.primary : theme.colors.border,
                    }]}
                  >
                    <View style={[styles.typeIconWrap, { backgroundColor: active ? theme.colors.primary : theme.colors.border }]}>
                      <Ionicons name={t.icon as any} size={16} color={active ? '#FFF' : theme.colors.textSecondary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.typeLabel, { color: theme.colors.text }]}>{t.label}</Text>
                      <Text style={[styles.typeDesc,  { color: theme.colors.textTertiary }]}>{t.desc}</Text>
                    </View>
                    {active && <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Submit */}
            <TouchableOpacity
              onPress={handleSubmit(onSubmit)}
              disabled={loading}
              style={[styles.submitBtn, loading && { opacity: 0.7 }]}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={theme.colors.gradientPrimary as any}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.submitGradient}
              >
                {loading
                  ? <ActivityIndicator color="#FFF" />
                  : <>
                      <Ionicons name="add-circle-outline" size={20} color="#FFF" />
                      <Text style={styles.submitText}>Create Community</Text>
                    </>
                }
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: SCREEN_H * 0.88,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#0A0A1B',
  },
  handleWrap:  { alignItems: 'center', paddingTop: 10, paddingBottom: 4, backgroundColor: '#0A0A1B' },
  handle:      { width: 36, height: 4, borderRadius: 2 },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 18,
  },
  sheetTitle:   { fontSize: 20, fontFamily: 'Inter-Bold', color: '#FFF' },
  sheetSubtitle:{ fontSize: 13, fontFamily: 'Inter-Regular', color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  closeBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  body:         { flex: 1 },
  bodyContent:  { padding: 24, gap: 20, paddingBottom: 40 },
  sectionLabel: { fontSize: 13, fontFamily: 'Inter-Medium' },
  errorText:    { fontSize: 12, fontFamily: 'Inter-Regular' },
  chipGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 9999, borderWidth: 1.5,
  },
  chipText:     { fontSize: 12, fontFamily: 'Inter-Medium' },
  typeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 14, borderRadius: 14, borderWidth: 1.5,
  },
  typeIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  typeLabel:    { fontSize: 14, fontFamily: 'Inter-SemiBold' },
  typeDesc:     { fontSize: 12, fontFamily: 'Inter-Regular', marginTop: 2 },
  submitBtn:    { marginTop: 8 },
  submitGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, height: 54, borderRadius: 16,
  },
  submitText:   { color: '#FFF', fontSize: 16, fontFamily: 'Inter-Bold' },
});

export default CreateCommunityModal;
