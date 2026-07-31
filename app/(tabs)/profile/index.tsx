import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Image, Alert, Modal, Switch, Platform,
  ActivityIndicator, Linking, KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppSelector, useAppDispatch } from '../../../store';
import { darkTheme, lightTheme } from '../../../constants/Theme';
import { Avatar } from '../../../components/ui/Avatar';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { signOut } from '../../../lib/auth';
import { clearAuth, updateProfile } from '../../../store/authSlice';
import { supabase } from '../../../lib/supabase';
import { setResolvedMode } from '../../../store/themeSlice';
import { uploadImage, deleteImage } from '../../../lib/storage';

// ── Settings Modal ──────────────────────────────────────────────
function SettingsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const isDark   = useAppSelector(s => s.theme.resolvedMode === 'dark');
  const theme    = isDark ? darkTheme : lightTheme;
  const dispatch = useAppDispatch();

  const toggleTheme = () => {
    dispatch(setResolvedMode(isDark ? 'light' : 'dark'));
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} activeOpacity={1} onPress={onClose} />
      <View style={[settingsStyles.sheet, { backgroundColor: theme.colors.surface }]}>
        <View style={settingsStyles.handle} />
        <Text style={[settingsStyles.title, { color: theme.colors.text }]}>Settings</Text>

        {/* Theme */}
        <View style={[settingsStyles.row, { borderColor: theme.colors.border }]}>
          <View style={settingsStyles.rowLeft}>
            <Ionicons name={isDark ? 'moon' : 'sunny'} size={20} color={theme.colors.primary} />
            <Text style={[settingsStyles.rowLabel, { color: theme.colors.text }]}>Dark Mode</Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: '#ccc', true: '#7C3AED' }}
            thumbColor="#FFF"
          />
        </View>

        {/* Privacy */}
        <TouchableOpacity
          style={[settingsStyles.row, { borderColor: theme.colors.border }]}
          onPress={() => Linking.openURL('https://tribelink.app/privacy')}
        >
          <View style={settingsStyles.rowLeft}>
            <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.primary} />
            <Text style={[settingsStyles.rowLabel, { color: theme.colors.text }]}>Privacy & Safety</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.textTertiary} />
        </TouchableOpacity>

        {/* Notifications */}
        <TouchableOpacity
          style={[settingsStyles.row, { borderColor: theme.colors.border }]}
          onPress={() => { onClose(); router.push('/notifications'); }}
        >
          <View style={settingsStyles.rowLeft}>
            <Ionicons name="notifications-outline" size={20} color={theme.colors.primary} />
            <Text style={[settingsStyles.rowLabel, { color: theme.colors.text }]}>Notifications</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.textTertiary} />
        </TouchableOpacity>

        {/* Help */}
        <TouchableOpacity
          style={[settingsStyles.row, { borderColor: theme.colors.border }]}
          onPress={() => Linking.openURL('https://tribelink.app/help')}
        >
          <View style={settingsStyles.rowLeft}>
            <Ionicons name="help-circle-outline" size={20} color={theme.colors.primary} />
            <Text style={[settingsStyles.rowLabel, { color: theme.colors.text }]}>Help & Support</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.textTertiary} />
        </TouchableOpacity>

        <View style={{ marginTop: 8 }}>
          <Text style={[settingsStyles.version, { color: theme.colors.textTertiary }]}>
            TribeLink v1.0.0
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const settingsStyles = StyleSheet.create({
  sheet:     { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 48, gap: 4 },
  handle:    { width: 36, height: 4, borderRadius: 2, backgroundColor: '#ccc', alignSelf: 'center', marginBottom: 20 },
  title:     { fontSize: 20, fontFamily: 'Inter-Bold', marginBottom: 12 },
  row:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1 },
  rowLeft:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowLabel:  { fontSize: 15, fontFamily: 'Inter-Regular' },
  version:   { fontSize: 12, fontFamily: 'Inter-Regular', textAlign: 'center', marginTop: 8 },
});

// ── Comprehensive Edit Profile Modal ────────────────────────────
function EditProfileModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const isDark   = useAppSelector(s => s.theme.resolvedMode === 'dark');
  const theme    = isDark ? darkTheme : lightTheme;
  const dispatch = useAppDispatch();
  const user     = useAppSelector(s => s.auth.user);

  const [activeTab, setActiveTab] = useState<'general' | 'preferences' | 'tags'>('general');

  // General fields
  const [name, setName]         = useState(user?.name ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [bio, setBio]           = useState(user?.bio ?? '');
  const [city, setCity]         = useState(user?.city ?? '');
  const [occupation, setOccupation] = useState(user?.occupation ?? '');

  // Preference / Privacy fields
  const [availability, setAvailability] = useState<'weekdays'|'weekends'|'evenings'|'flexible'>(user?.availability || 'flexible');
  const [languagesStr, setLanguagesStr] = useState((user?.languages || []).join(', '));
  const [showLocation, setShowLocation] = useState(user?.show_location ?? true);
  const [showAge, setShowAge]           = useState(user?.show_age ?? true);
  const [allowMessages, setAllowMessages] = useState<'everyone'|'connections'|'none'>(user?.allow_messages || 'everyone');

  // Tags fields
  const [interestsList, setInterestsList] = useState<string[]>(
    (user?.interests || []).map((i: any) => typeof i === 'string' ? i : i.interest)
  );
  const [newInterest, setNewInterest] = useState('');

  const [skillsList, setSkillsList] = useState<string[]>(
    (user?.skills || []).map((s: any) => typeof s === 'string' ? s : s.skill)
  );
  const [newSkill, setNewSkill] = useState('');

  const [loading, setLoading] = useState(false);

  const handleAddInterest = () => {
    const trimmed = newInterest.trim();
    if (trimmed && !interestsList.includes(trimmed)) {
      setInterestsList([...interestsList, trimmed]);
      setNewInterest('');
    }
  };

  const handleRemoveInterest = (item: string) => {
    setInterestsList(interestsList.filter(i => i !== item));
  };

  const handleAddSkill = () => {
    const trimmed = newSkill.trim();
    if (trimmed && !skillsList.includes(trimmed)) {
      setSkillsList([...skillsList, trimmed]);
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (item: string) => {
    setSkillsList(skillsList.filter(s => s !== item));
  };

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Name required', 'Please enter your name.'); return; }

    const cleanedUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (cleanedUsername.length < 3) {
      Alert.alert('Invalid username', 'Username must be at least 3 alphanumeric characters.');
      return;
    }

    setLoading(true);
    try {
      if (user!.id !== 'demo-user-123' && cleanedUsername !== user?.username) {
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', cleanedUsername)
          .maybeSingle();

        if (existing && existing.id !== user?.id) {
          Alert.alert('Username Taken', 'This username is already claimed by another member.');
          setLoading(false);
          return;
        }
      }

      const languagesArray = languagesStr
        .split(',')
        .map(l => l.trim())
        .filter(Boolean);

      const updates = {
        name: name.trim(),
        username: cleanedUsername,
        bio: bio.trim() || null,
        city: city.trim() || null,
        occupation: occupation.trim() || null,
        availability,
        languages: languagesArray,
        show_location: showLocation,
        show_age: showAge,
        allow_messages: allowMessages,
      };

      if (user!.id !== 'demo-user-123') {
        const { error } = await supabase.from('profiles').update(updates).eq('id', user!.id);
        if (error) throw error;

        await supabase.from('user_interests').delete().eq('user_id', user!.id);
        if (interestsList.length > 0) {
          await supabase.from('user_interests').insert(
            interestsList.map(interest => ({ user_id: user!.id, interest }))
          );
        }

        await supabase.from('user_skills').delete().eq('user_id', user!.id);
        if (skillsList.length > 0) {
          await supabase.from('user_skills').insert(
            skillsList.map(skill => ({ user_id: user!.id, skill }))
          );
        }
      }

      dispatch(updateProfile({
        ...updates,
        interests: interestsList as any,
        skills: skillsList as any,
      }));

      Alert.alert('✅ Profile updated!');
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not save profile updates.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} activeOpacity={1} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[editStyles.sheet, { backgroundColor: theme.colors.background }]}>
          <View style={editStyles.handle} />
          <View style={editStyles.header}>
            <Text style={[editStyles.title, { color: theme.colors.text }]}>Edit Profile</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={[editStyles.tabRow, { borderColor: theme.colors.border }]}>
            {(['general', 'preferences', 'tags'] as const).map(tab => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[
                  editStyles.tabBtn,
                  activeTab === tab && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 }
                ]}
              >
                <Text style={[
                  editStyles.tabText,
                  { color: activeTab === tab ? theme.colors.primary : theme.colors.textSecondary }
                ]}>
                  {tab === 'general' ? 'General' : tab === 'preferences' ? 'Privacy & Prefs' : 'Interests & Skills'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {activeTab === 'general' && (
              <>
                <Input label="Full Name" value={name} onChangeText={setName} leftIcon="person-outline" placeholder="Your name" />
                <Input label="Username" value={username} onChangeText={setUsername} leftIcon="at-outline" placeholder="username" autoCapitalize="none" />
                <Input label="Bio" value={bio} onChangeText={setBio} leftIcon="document-text-outline" placeholder="Tell people about you..." multiline numberOfLines={3} inputStyle={{ minHeight: 72, paddingTop: 14 }} />
                <Input label="City" value={city} onChangeText={setCity} leftIcon="location-outline" placeholder="e.g. Mumbai, India" />
                <Input label="Occupation" value={occupation} onChangeText={setOccupation} leftIcon="briefcase-outline" placeholder="e.g. Product Designer" />
              </>
            )}

            {activeTab === 'preferences' && (
              <>
                <Text style={[editStyles.sectionHeader, { color: theme.colors.text }]}>Availability</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {(['flexible', 'weekdays', 'weekends', 'evenings'] as const).map(opt => (
                    <TouchableOpacity
                      key={opt}
                      onPress={() => setAvailability(opt)}
                      style={[
                        editStyles.chip,
                        {
                          backgroundColor: availability === opt ? theme.colors.primary : theme.colors.surface,
                          borderColor: theme.colors.border,
                        }
                      ]}
                    >
                      <Text style={{ color: availability === opt ? '#FFF' : theme.colors.text, fontSize: 13, fontFamily: 'Inter-Medium', textTransform: 'capitalize' }}>
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Input label="Languages (comma separated)" value={languagesStr} onChangeText={setLanguagesStr} leftIcon="language-outline" placeholder="e.g. English, Hindi, Spanish" />

                <Text style={[editStyles.sectionHeader, { color: theme.colors.text, marginTop: 12 }]}>Privacy Settings</Text>
                <View style={[editStyles.switchRow, { borderColor: theme.colors.border }]}>
                  <Text style={[editStyles.switchLabel, { color: theme.colors.text }]}>Show City & Location</Text>
                  <Switch value={showLocation} onValueChange={setShowLocation} trackColor={{ false: '#ccc', true: '#7C3AED' }} thumbColor="#FFF" />
                </View>
                <View style={[editStyles.switchRow, { borderColor: theme.colors.border }]}>
                  <Text style={[editStyles.switchLabel, { color: theme.colors.text }]}>Show Age</Text>
                  <Switch value={showAge} onValueChange={setShowAge} trackColor={{ false: '#ccc', true: '#7C3AED' }} thumbColor="#FFF" />
                </View>

                <Text style={[editStyles.switchLabel, { color: theme.colors.text, marginTop: 8 }]}>Allow Direct Messages</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  {(['everyone', 'connections', 'none'] as const).map(opt => (
                    <TouchableOpacity
                      key={opt}
                      onPress={() => setAllowMessages(opt)}
                      style={[
                        editStyles.chip,
                        {
                          flex: 1, alignItems: 'center',
                          backgroundColor: allowMessages === opt ? theme.colors.primary : theme.colors.surface,
                          borderColor: theme.colors.border,
                        }
                      ]}
                    >
                      <Text style={{ color: allowMessages === opt ? '#FFF' : theme.colors.text, fontSize: 12, fontFamily: 'Inter-Medium', textTransform: 'capitalize' }}>
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {activeTab === 'tags' && (
              <>
                <Text style={[editStyles.sectionHeader, { color: theme.colors.text }]}>Interests</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Input placeholder="Add interest..." value={newInterest} onChangeText={setNewInterest} leftIcon="heart-outline" />
                  </View>
                  <Button title="Add" onPress={handleAddInterest} variant="primary" size="md" style={{ marginTop: 24 }} />
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 }}>
                  {interestsList.map(item => (
                    <TouchableOpacity key={item} onPress={() => handleRemoveInterest(item)}>
                      <Badge label={`${item} ✕`} color="primary" size="md" />
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[editStyles.sectionHeader, { color: theme.colors.text, marginTop: 12 }]}>Skills</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Input placeholder="Add skill..." value={newSkill} onChangeText={setNewSkill} leftIcon="flash-outline" />
                  </View>
                  <Button title="Add" onPress={handleAddSkill} variant="primary" size="md" style={{ marginTop: 24 }} />
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 }}>
                  {skillsList.map(item => (
                    <TouchableOpacity key={item} onPress={() => handleRemoveSkill(item)}>
                      <Badge label={`${item} ✕`} color="success" size="md" />
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <View style={{ marginTop: 12 }}>
              <Button title={loading ? 'Saving...' : 'Save Profile'} onPress={handleSave} variant="gradient" size="lg" fullWidth loading={loading} />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const editStyles = StyleSheet.create({
  sheet:  { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '85%' },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#ccc', alignSelf: 'center', marginBottom: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title:  { fontSize: 20, fontFamily: 'Inter-Bold' },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, marginBottom: 16 },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabText:{ fontSize: 13, fontFamily: 'Inter-SemiBold' },
  sectionHeader: { fontSize: 14, fontFamily: 'Inter-Bold', marginBottom: 8 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1 },
  switchLabel: { fontSize: 14, fontFamily: 'Inter-Regular' },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1 },
});

// ── Main Profile Screen ─────────────────────────────────────────
export default function ProfileScreen() {
  const isDark    = useAppSelector(s => s.theme.resolvedMode === 'dark');
  const theme     = isDark ? darkTheme : lightTheme;
  const user      = useAppSelector(s => s.auth.user);
  const dispatch  = useAppDispatch();
  const queryClient = useQueryClient();

  const [loggingOut, setLoggingOut] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showEdit,     setShowEdit]     = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover]   = useState(false);

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          try { await signOut(); } catch {}
          dispatch(clearAuth());
        },
      },
    ]);
  };

  // Avatar upload & delete logic
  const pickAndUploadAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo access to change your profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    setUploadingAvatar(true);
    try {
      const asset = result.assets[0];
      const ext   = asset.uri.split('.').pop() || 'jpg';
      const path  = `${user!.id}.${ext}`;

      const publicUrl = await uploadImage({
        uri: asset.uri,
        bucket: 'avatars',
        path,
      });

      if (user!.id !== 'demo-user-123') {
        await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user!.id);
      }
      dispatch(updateProfile({ avatar_url: publicUrl }));
      queryClient.invalidateQueries({ queryKey: ['profile-stats', user!.id] });
      Alert.alert('✅ Profile Picture Updated!');
    } catch (e: any) {
      Alert.alert('Upload Error', e.message || 'Could not upload profile picture.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleDeleteAvatar = async () => {
    Alert.alert(
      'Remove Profile Picture',
      'Are you sure you want to delete your profile picture?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setUploadingAvatar(true);
            try {
              if (user?.avatar_url) {
                await deleteImage('avatars', user.avatar_url);
              } else {
                await deleteImage('avatars', user!.id);
              }
              if (user!.id !== 'demo-user-123') {
                const { error } = await supabase
                  .from('profiles')
                  .update({ avatar_url: null })
                  .eq('id', user!.id);
                if (error) throw error;
              }
              dispatch(updateProfile({ avatar_url: null }));
              queryClient.invalidateQueries({ queryKey: ['profile-stats', user!.id] });
              Alert.alert('✅ Profile Picture Removed');
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Could not remove profile picture.');
            } finally {
              setUploadingAvatar(false);
            }
          },
        },
      ]
    );
  };

  const handleChangeAvatar = () => {
    if (user?.avatar_url) {
      Alert.alert('Profile Picture', 'Choose an option', [
        { text: '📷 Choose New Photo', onPress: pickAndUploadAvatar },
        { text: '🗑️ Remove Photo', style: 'destructive', onPress: handleDeleteAvatar },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } else {
      pickAndUploadAvatar();
    }
  };

  // Cover photo upload & delete logic
  const pickAndUploadCover = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo access to change your cover photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    setUploadingCover(true);
    try {
      const asset = result.assets[0];
      const ext   = asset.uri.split('.').pop() || 'jpg';
      const path  = `${user!.id}.${ext}`;

      const publicUrl = await uploadImage({
        uri: asset.uri,
        bucket: 'covers',
        path,
      });

      if (user!.id !== 'demo-user-123') {
        await supabase.from('profiles').update({ cover_url: publicUrl }).eq('id', user!.id);
      }
      dispatch(updateProfile({ cover_url: publicUrl }));
      queryClient.invalidateQueries({ queryKey: ['profile-stats', user!.id] });
      Alert.alert('✅ Cover Photo Updated!');
    } catch (e: any) {
      Alert.alert('Upload Error', e.message || 'Could not upload cover photo.');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleDeleteCover = async () => {
    Alert.alert(
      'Remove Cover Photo',
      'Are you sure you want to delete your cover photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setUploadingCover(true);
            try {
              if (user?.cover_url) {
                await deleteImage('covers', user.cover_url);
              } else {
                await deleteImage('covers', user!.id);
              }
              if (user!.id !== 'demo-user-123') {
                const { error } = await supabase
                  .from('profiles')
                  .update({ cover_url: null })
                  .eq('id', user!.id);
                if (error) throw error;
              }
              dispatch(updateProfile({ cover_url: null }));
              queryClient.invalidateQueries({ queryKey: ['profile-stats', user!.id] });
              Alert.alert('✅ Cover Photo Removed');
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Could not remove cover photo.');
            } finally {
              setUploadingCover(false);
            }
          },
        },
      ]
    );
  };

  const handleChangeCover = () => {
    if (user?.cover_url) {
      Alert.alert('Cover Photo', 'Choose an option', [
        { text: '📷 Choose New Photo', onPress: pickAndUploadCover },
        { text: '🗑️ Remove Cover Photo', style: 'destructive', onPress: handleDeleteCover },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } else {
      pickAndUploadCover();
    }
  };

  // Fetch profile stats
  const { data: statsData } = useQuery({
    queryKey: ['profile-stats', user?.id],
    queryFn: async () => {
      if (!user?.id || user.id === 'demo-user-123') return { followers: 0, following: 0, posts: 0 };
      const [followersRes, followingRes, postsRes] = await Promise.all([
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', user.id),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', user.id),
        supabase.from('posts').select('id', { count: 'exact', head: true }).eq('author_id', user.id),
      ]);
      return {
        followers: followersRes.count ?? 0,
        following: followingRes.count ?? 0,
        posts: postsRes.count ?? 0,
      };
    },
    enabled: !!user?.id,
  });

  if (!user) return null;

  const stats = [
    { label: 'Followers', value: statsData?.followers ?? 0 },
    { label: 'Following', value: statsData?.following ?? 0 },
    { label: 'Posts',     value: statsData?.posts ?? 0 },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Cover Photo */}
        <View style={styles.cover}>
          {user.cover_url
            ? <Image source={{ uri: user.cover_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            : <LinearGradient colors={theme.colors.gradientHero as any} style={StyleSheet.absoluteFill} />
          }
          <SafeAreaView style={styles.coverActions}>
            <View style={styles.coverActionsRow}>
              <View style={{ flex: 1 }} />

              {/* Direct Delete Trash Button for Cover Photo */}
              {!!user.cover_url && (
                <TouchableOpacity
                  style={[styles.coverBtn, { backgroundColor: 'rgba(239, 68, 68, 0.85)' }]}
                  onPress={handleDeleteCover}
                  disabled={uploadingCover}
                >
                  <Ionicons name="trash-outline" size={18} color="#FFF" />
                </TouchableOpacity>
              )}

              {/* Camera / Edit Button for Cover Photo */}
              <TouchableOpacity
                style={[styles.coverBtn, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
                onPress={handleChangeCover}
                disabled={uploadingCover}
              >
                {uploadingCover
                  ? <ActivityIndicator size={14} color="#FFF" />
                  : <Ionicons name="camera-outline" size={18} color="#FFF" />
                }
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.coverBtn, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
                onPress={() => setShowEdit(true)}
              >
                <Ionicons name="pencil-outline" size={18} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.coverBtn, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
                onPress={() => setShowSettings(true)}
              >
                <Ionicons name="settings-outline" size={18} color="#FFF" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>

        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: theme.colors.background }]}>
          {/* Avatar with camera & trash buttons */}
          <View style={styles.avatarSection}>
            <View style={[styles.avatarWrapper, { borderColor: theme.colors.background }]}>
              <Avatar uri={user.avatar_url} name={user.name} size="3xl" isOnline={user.is_online} isVerified={user.is_verified} showBorder />
            </View>

            {/* Direct Trash Button for Avatar */}
            {!!user.avatar_url && (
              <TouchableOpacity
                style={[styles.deleteAvatarBtn, { backgroundColor: '#EF4444' }]}
                onPress={handleDeleteAvatar}
                disabled={uploadingAvatar}
              >
                <Ionicons name="trash" size={12} color="#FFF" />
              </TouchableOpacity>
            )}

            {/* Camera Edit Button for Avatar */}
            <TouchableOpacity
              style={[styles.editAvatarBtn, { backgroundColor: theme.colors.primary }]}
              onPress={handleChangeAvatar}
              disabled={uploadingAvatar}
            >
              {uploadingAvatar
                ? <ActivityIndicator size={10} color="#FFF" />
                : <Ionicons name="camera" size={14} color="#FFF" />
              }
            </TouchableOpacity>
          </View>

          {/* Name & Role */}
          <View style={styles.nameSection}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: theme.colors.text }]}>{user.name}</Text>
              {user.is_verified && <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />}
              {user.is_premium && (
                <LinearGradient colors={['#F59E0B', '#EF4444']} style={styles.premiumBadge}>
                  <Ionicons name="star" size={10} color="#FFF" />
                  <Text style={styles.premiumText}>PRO</Text>
                </LinearGradient>
              )}
            </View>
            <Text style={[styles.username, { color: theme.colors.textSecondary }]}>
              @{user.username ?? user.email?.split('@')[0] ?? 'user'}
            </Text>
            {user.bio && <Text style={[styles.bio, { color: theme.colors.textSecondary }]}>{user.bio}</Text>}
            <View style={styles.metaRow}>
              {user.city && (
                <View style={styles.metaItem}>
                  <Ionicons name="location-outline" size={13} color={theme.colors.textTertiary} />
                  <Text style={[styles.metaText, { color: theme.colors.textTertiary }]}>{user.city}</Text>
                </View>
              )}
              {user.occupation && (
                <View style={styles.metaItem}>
                  <Ionicons name="briefcase-outline" size={13} color={theme.colors.textTertiary} />
                  <Text style={[styles.metaText, { color: theme.colors.textTertiary }]}>{user.occupation}</Text>
                </View>
              )}
              {user.availability && (
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={13} color={theme.colors.primary} />
                  <Text style={[styles.metaText, { color: theme.colors.primary, textTransform: 'capitalize' }]}>{user.availability}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              onPress={() => setShowEdit(true)}
              style={[styles.editProfileBtn, { borderColor: theme.colors.border }]}
            >
              <Ionicons name="create-outline" size={16} color={theme.colors.primary} />
              <Text style={[styles.editProfileText, { color: theme.colors.primary }]}>Edit Profile</Text>
            </TouchableOpacity>
          </View>

          {/* Stats */}
          <View style={[styles.stats, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            {stats.map((s, i) => (
              <React.Fragment key={s.label}>
                {i > 0 && <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />}
                <View style={styles.stat}>
                  <Text style={[styles.statNum, { color: theme.colors.text }]}>{s.value}</Text>
                  <Text style={[styles.statLabel, { color: theme.colors.textTertiary }]}>{s.label}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>

          {/* Trust & XP */}
          <View style={[styles.scoreRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.scoreItem}>
              <Text style={[styles.scoreLabel, { color: theme.colors.textTertiary }]}>Trust Score</Text>
              <View style={styles.scoreValueRow}>
                <Ionicons name="shield-checkmark" size={14} color={theme.colors.success} />
                <Text style={[styles.scoreNum, { color: theme.colors.text }]}>{user.trust_score ?? '--'}</Text>
              </View>
            </View>
            <View style={[styles.scoreDivider, { backgroundColor: theme.colors.border }]} />
            <View style={styles.scoreItem}>
              <Text style={[styles.scoreLabel, { color: theme.colors.textTertiary }]}>Level</Text>
              <View style={styles.scoreValueRow}>
                <Ionicons name="flash" size={14} color={theme.colors.warning} />
                <Text style={[styles.scoreNum, { color: theme.colors.text }]}>{user.level}</Text>
              </View>
            </View>
            <View style={[styles.scoreDivider, { backgroundColor: theme.colors.border }]} />
            <View style={styles.scoreItem}>
              <Text style={[styles.scoreLabel, { color: theme.colors.textTertiary }]}>XP</Text>
              <View style={styles.scoreValueRow}>
                <Ionicons name="star" size={14} color={theme.colors.primary} />
                <Text style={[styles.scoreNum, { color: theme.colors.text }]}>{user.xp.toLocaleString()}</Text>
              </View>
            </View>
          </View>

          {/* Interests */}
          {user.interests && user.interests.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Interests</Text>
              <View style={styles.chips}>
                {user.interests.map((i: any, idx) => (
                  <Badge key={idx} label={typeof i === 'string' ? i : i.interest} color="primary" size="md" />
                ))}
              </View>
            </View>
          )}

          {/* Skills */}
          {user.skills && user.skills.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Skills</Text>
              <View style={styles.chips}>
                {user.skills.map((s: any, idx) => (
                  <Badge key={idx} label={typeof s === 'string' ? s : s.skill} color="success" size="md" />
                ))}
              </View>
            </View>
          )}

          {/* Sign Out */}
          <View style={{ paddingTop: 16 }}>
            <Button title="Sign Out" onPress={handleSignOut} variant="outline" size="md" fullWidth loading={loggingOut} />
          </View>
        </View>
      </ScrollView>

      <SettingsModal  visible={showSettings} onClose={() => setShowSettings(false)} />
      <EditProfileModal visible={showEdit}  onClose={() => setShowEdit(false)}     />
    </View>
  );
}

const styles = StyleSheet.create({
  cover:            { height: 200, position: 'relative' },
  coverActions:     { flex: 1 },
  coverActionsRow:  { flexDirection: 'row', paddingHorizontal: 16, gap: 10 },
  coverBtn:         { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  profileCard:      { paddingHorizontal: 20, paddingBottom: 20 },
  avatarSection:    { marginTop: -56, marginBottom: 12, position: 'relative', alignSelf: 'flex-start' },
  avatarWrapper:    { borderWidth: 4, borderRadius: 9999 },
  editAvatarBtn:    { position: 'absolute', bottom: 4, right: 4, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  deleteAvatarBtn:  { position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  nameSection:      { gap: 4, marginBottom: 16 },
  nameRow:          { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name:             { fontSize: 22, fontFamily: 'Inter-Bold', letterSpacing: -0.5 },
  username:         { fontSize: 14, fontFamily: 'Inter-Regular' },
  bio:              { fontSize: 14, fontFamily: 'Inter-Regular', lineHeight: 21, marginTop: 4 },
  metaRow:          { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6 },
  metaItem:         { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText:         { fontSize: 12, fontFamily: 'Inter-Regular' },
  editProfileBtn:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingVertical: 7, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1.5, alignSelf: 'flex-start' },
  editProfileText:  { fontSize: 13, fontFamily: 'Inter-SemiBold' },
  premiumBadge:     { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  premiumText:      { color: '#FFF', fontSize: 9, fontFamily: 'Inter-Bold' },
  stats:            { flexDirection: 'row', borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 12 },
  stat:             { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statNum:          { fontSize: 18, fontFamily: 'Inter-Bold' },
  statLabel:        { fontSize: 11, fontFamily: 'Inter-Regular', marginTop: 2 },
  statDivider:      { width: 1 },
  scoreRow:         { flexDirection: 'row', borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 20 },
  scoreItem:        { flex: 1, alignItems: 'center', paddingVertical: 12, gap: 4 },
  scoreLabel:       { fontSize: 10, fontFamily: 'Inter-Medium' },
  scoreValueRow:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  scoreNum:         { fontSize: 16, fontFamily: 'Inter-Bold' },
  scoreDivider:     { width: 1 },
  section:          { marginBottom: 20 },
  sectionTitle:     { fontSize: 16, fontFamily: 'Inter-SemiBold', marginBottom: 10 },
  chips:            { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
