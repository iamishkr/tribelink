import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppSelector, useAppDispatch } from '../../store';
import { darkTheme, lightTheme } from '../../constants/Theme';
import { Button } from '../../components/ui/Button';
import { supabase } from '../../lib/supabase';
import { updateProfile } from '../../store/authSlice';
import { uploadImage } from '../../lib/storage';

const STEP = 2;
const TOTAL = 6;

export default function Step2Photo() {
  const isDark   = useAppSelector(s => s.theme.resolvedMode === 'dark');
  const theme    = isDark ? darkTheme : lightTheme;
  const user     = useAppSelector(s => s.auth.user);
  const dispatch = useAppDispatch();

  const [avatarUri, setAvatarUri]   = useState<string | null>(user?.avatar_url ?? null);
  const [coverUri, setCoverUri]     = useState<string | null>(user?.cover_url ?? null);
  const [uploading, setUploading]   = useState(false);

  const pickImage = async (type: 'avatar' | 'cover') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo access to choose your profile photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: type === 'avatar' ? [1, 1] : [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      if (type === 'avatar') setAvatarUri(uri);
      else setCoverUri(uri);
    }
  };

  const uploadAndSave = async () => {
    setUploading(true);
    try {
      let avatarUrl = user?.avatar_url ?? null;
      let coverUrl  = user?.cover_url ?? null;

      // Upload avatar
      if (avatarUri && avatarUri !== user?.avatar_url && user?.id && user.id !== 'demo-user-123') {
        const ext  = avatarUri.split('.').pop() || 'jpg';
        const path = `${user.id}.${ext}`;
        avatarUrl = await uploadImage({
          uri: avatarUri,
          bucket: 'avatars',
          path,
        });
      }

      // Upload cover
      if (coverUri && coverUri !== user?.cover_url && user?.id && user.id !== 'demo-user-123') {
        const ext  = coverUri.split('.').pop() || 'jpg';
        const path = `${user.id}.${ext}`;
        coverUrl = await uploadImage({
          uri: coverUri,
          bucket: 'covers',
          path,
        });
      }

      if (user?.id && user.id !== 'demo-user-123') {
        await supabase.from('profiles').update({ avatar_url: avatarUrl, cover_url: coverUrl }).eq('id', user.id);
      }
      dispatch(updateProfile({ avatar_url: avatarUrl, cover_url: coverUrl }));
      router.push('/(onboarding)/step-3-interests');
    } catch (e: any) {
      Alert.alert('Upload failed', e.message || 'Could not upload profile photos.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <LinearGradient
        colors={isDark ? ['#13132E', '#0A0A1B'] : ['#F5F3FF', '#F8F7FF']}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.container}>
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

          <Text style={[styles.title, { color: theme.colors.text }]}>Add your photos 📸</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Help people recognize you in your tribe
          </Text>

          <TouchableOpacity onPress={() => pickImage('cover')} style={styles.coverPicker}>
            {coverUri ? (
              <Image source={{ uri: coverUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            ) : (
              <LinearGradient colors={theme.colors.gradientHero as any} style={StyleSheet.absoluteFill} />
            )}
            <View style={[styles.coverOverlay, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
              <Ionicons name="image-outline" size={28} color="#FFF" />
              <Text style={styles.coverOverlayText}>
                {coverUri ? 'Change Cover Photo' : 'Add Cover Photo'}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={() => pickImage('avatar')} style={styles.avatarPicker}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
              ) : (
                <LinearGradient colors={theme.colors.gradientPrimary as any} style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={40} color="#FFF" />
                </LinearGradient>
              )}
              <View style={[styles.avatarEdit, { backgroundColor: theme.colors.primary }]}>
                <Ionicons name="camera" size={16} color="#FFF" />
              </View>
            </TouchableOpacity>
            <Text style={[styles.avatarHint, { color: theme.colors.textTertiary }]}>
              Tap to add profile photo
            </Text>
          </View>

          <View style={{ flex: 1 }} />

          <View style={styles.actions}>
            <Button
              title="Skip for now"
              onPress={() => router.push('/(onboarding)/step-3-interests')}
              variant="ghost"
              size="md"
            />
            <Button
              title="Save & Continue →"
              onPress={uploadAndSave}
              variant="gradient"
              size="lg"
              style={{ flex: 1 }}
              loading={uploading}
            />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, paddingHorizontal: 24, paddingBottom: 32 },
  progressRow:  { flexDirection: 'row', gap: 4, height: 4, alignItems: 'center', marginTop: 16 },
  dot:          { height: 4, borderRadius: 2, width: 8, minWidth: 8 },
  stepLabel:    { fontSize: 12, fontFamily: 'Inter-Medium', marginTop: 8, marginBottom: 24 },
  title:        { fontSize: 24, fontFamily: 'Inter-Bold', letterSpacing: -0.5, marginBottom: 6 },
  subtitle:     { fontSize: 14, fontFamily: 'Inter-Regular', marginBottom: 24 },
  coverPicker:  { height: 140, borderRadius: 20, overflow: 'hidden', position: 'relative' },
  coverOverlay: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  coverOverlayText: { color: '#FFF', fontSize: 14, fontFamily: 'Inter-SemiBold' },
  avatarSection: { alignItems: 'center', marginTop: -48, gap: 8 },
  avatarPicker: { width: 100, height: 100, position: 'relative' },
  avatarImg:    { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: {
    width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center',
  },
  avatarEdit: {
    position: 'absolute', bottom: 2, right: 2,
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarHint: { fontSize: 12, fontFamily: 'Inter-Regular' },
  actions: { flexDirection: 'row', gap: 12, alignItems: 'center' },
});
