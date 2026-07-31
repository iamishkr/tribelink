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
const USE_NATIVE_DRIVER = Platform.OS !== 'web';

const CATEGORIES = [
  { label: 'Meetup',     icon: '🤝', value: 'meetup'     },
  { label: 'Workshop',   icon: '🛠️', value: 'workshop'   },
  { label: 'Hackathon',  icon: '⚡', value: 'hackathon'  },
  { label: 'Study',      icon: '📚', value: 'study'      },
  { label: 'Fitness',    icon: '💪', value: 'fitness'    },
  { label: 'Social',     icon: '🎉', value: 'social'     },
  { label: 'Gaming',     icon: '🎮', value: 'gaming'     },
  { label: 'Other',      icon: '🌟', value: 'other'      },
];

const EVENT_TYPES = [
  { label: 'Online',  icon: 'videocam-outline',  value: 'online',  desc: 'Virtual / video call' },
  { label: 'Offline', icon: 'location-outline',  value: 'offline', desc: 'In-person event'       },
  { label: 'Hybrid',  icon: 'git-merge-outline', value: 'hybrid',  desc: 'Both online & offline'  },
] as const;

const schema = z.object({
  title:         z.string().min(3, 'Title must be at least 3 characters').max(100),
  description:   z.string().min(10, 'Add a short description').max(1000),
  category:      z.string().min(1, 'Pick a category'),
  type:          z.enum(['online', 'offline', 'hybrid']),
  location_name: z.string().optional(),
  meeting_url:   z.string().url('Enter a valid URL').optional().or(z.literal('')),
  starts_at:     z.string().min(1, 'Pick a start date & time'),
  is_free:       z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export function CreateEventModal({ visible, onClose, onCreated }: Props) {
  const isDark    = useAppSelector(s => s.theme.resolvedMode === 'dark');
  const theme     = isDark ? darkTheme : lightTheme;
  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '', description: '', category: '',
      type: 'online', location_name: '', meeting_url: '',
      starts_at: '', is_free: true,
    },
  });

  const selectedCategory = watch('category');
  const selectedType     = watch('type');
  const isFree           = watch('is_free');

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: USE_NATIVE_DRIVER, damping: 18, stiffness: 120 }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: USE_NATIVE_DRIVER }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: SCREEN_H, duration: 250, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: USE_NATIVE_DRIVER }),
      ]).start();
    }
  }, [visible]);

  const handleClose = () => { reset(); onClose(); };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Sign in required', 'You need to be signed in to create an event.');
        return;
      }

      const { error } = await supabase.from('events').insert({
        title:         data.title.trim(),
        description:   data.description.trim(),
        category:      data.category,
        type:          data.type,
        location_name: data.location_name?.trim() || null,
        meeting_url:   data.meeting_url?.trim() || null,
        starts_at:     new Date(data.starts_at).toISOString(),
        ends_at:       new Date(data.starts_at).toISOString(), // same as start, user can edit later
        is_free:       data.is_free,
        creator_id:    user.id,
        rsvp_count:    0,
        waitlist_count: 0,
      });

      if (error) throw error;

      Alert.alert('🎉 Event Created!', `"${data.title}" is live. Invite your tribe!`);
      reset();
      onClose();
      onCreated?.();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to create event. Please try again.');
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
          {/* Handle */}
          <View style={styles.handleWrap}>
            <View style={[styles.handle, { backgroundColor: theme.colors.border }]} />
          </View>

          {/* Header */}
          <LinearGradient
            colors={['#7C3AED', '#6366F1'] as any}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.sheetHeader}
          >
            <View>
              <Text style={styles.sheetTitle}>Create Event</Text>
              <Text style={styles.sheetSubtitle}>Bring your tribe together</Text>
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
            {/* Title */}
            <Controller
              control={control}
              name="title"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Event Title"
                  placeholder="e.g. React Native Hackathon"
                  value={value}
                  onChangeText={onChange}
                  leftIcon="calendar-outline"
                  error={errors.title?.message}
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
                  placeholder="What will happen at this event?"
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

            {/* Start Date/Time */}
            <Controller
              control={control}
              name="starts_at"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Date & Time (YYYY-MM-DD HH:MM)"
                  placeholder="e.g. 2025-09-15 18:00"
                  value={value}
                  onChangeText={onChange}
                  leftIcon="time-outline"
                  error={errors.starts_at?.message}
                />
              )}
            />

            {/* Category */}
            <View style={{ gap: 8 }}>
              <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>Category</Text>
              {errors.category && (
                <Text style={{ fontSize: 12, color: theme.colors.error, fontFamily: 'Inter-Regular' }}>
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

            {/* Event Type */}
            <View style={{ gap: 8 }}>
              <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>Event Type</Text>
              {EVENT_TYPES.map(t => {
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

            {/* Location (for offline/hybrid) */}
            {(selectedType === 'offline' || selectedType === 'hybrid') && (
              <Controller
                control={control}
                name="location_name"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="Location"
                    placeholder="e.g. Mumbai, Maharashtra"
                    value={value ?? ''}
                    onChangeText={onChange}
                    leftIcon="location-outline"
                    error={errors.location_name?.message}
                  />
                )}
              />
            )}

            {/* Meeting URL (for online/hybrid) */}
            {(selectedType === 'online' || selectedType === 'hybrid') && (
              <Controller
                control={control}
                name="meeting_url"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="Meeting Link"
                    placeholder="https://meet.google.com/..."
                    value={value ?? ''}
                    onChangeText={onChange}
                    leftIcon="link-outline"
                    keyboardType="url"
                    autoCapitalize="none"
                    error={errors.meeting_url?.message}
                  />
                )}
              />
            )}

            {/* Free / Paid toggle */}
            <View style={{ gap: 8 }}>
              <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>Ticket Price</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {[{ label: '🎟️  Free', val: true }, { label: '💳  Paid', val: false }].map(opt => {
                  const active = isFree === opt.val;
                  return (
                    <TouchableOpacity
                      key={String(opt.val)}
                      onPress={() => setValue('is_free', opt.val)}
                      style={[styles.toggleBtn, {
                        flex: 1,
                        backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                        borderColor:     active ? theme.colors.primary : theme.colors.border,
                      }]}
                    >
                      <Text style={[styles.toggleBtnText, { color: active ? '#FFF' : theme.colors.textSecondary }]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Submit */}
            <TouchableOpacity
              onPress={handleSubmit(onSubmit)}
              disabled={loading}
              style={[styles.submitBtn, loading && { opacity: 0.7 }]}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#7C3AED', '#6366F1'] as any}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.submitGradient}
              >
                {loading
                  ? <ActivityIndicator color="#FFF" />
                  : <>
                      <Ionicons name="add-circle-outline" size={20} color="#FFF" />
                      <Text style={styles.submitText}>Create Event</Text>
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
    height: SCREEN_H * 0.92,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#0A0A1B',
  },
  handleWrap:     { alignItems: 'center', paddingTop: 10, paddingBottom: 4, backgroundColor: '#0A0A1B' },
  handle:         { width: 36, height: 4, borderRadius: 2 },
  sheetHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 18 },
  sheetTitle:     { fontSize: 20, fontFamily: 'Inter-Bold', color: '#FFF' },
  sheetSubtitle:  { fontSize: 13, fontFamily: 'Inter-Regular', color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  closeBtn:       { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  body:           { flex: 1 },
  bodyContent:    { padding: 24, gap: 20, paddingBottom: 50 },
  sectionLabel:   { fontSize: 13, fontFamily: 'Inter-Medium' },
  chipGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:           { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 9999, borderWidth: 1.5 },
  chipText:       { fontSize: 12, fontFamily: 'Inter-Medium' },
  typeRow:        { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 14, borderWidth: 1.5 },
  typeIconWrap:   { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  typeLabel:      { fontSize: 14, fontFamily: 'Inter-SemiBold' },
  typeDesc:       { fontSize: 12, fontFamily: 'Inter-Regular', marginTop: 2 },
  toggleBtn:      { height: 44, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  toggleBtnText:  { fontSize: 14, fontFamily: 'Inter-SemiBold' },
  submitBtn:      { marginTop: 8 },
  submitGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 54, borderRadius: 16 },
  submitText:     { color: '#FFF', fontSize: 16, fontFamily: 'Inter-Bold' },
});

export default CreateEventModal;
