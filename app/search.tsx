import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Image,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector } from '../store';
import { darkTheme, lightTheme } from '../constants/Theme';
import { Avatar } from '../components/ui/Avatar';
import { supabase } from '../lib/supabase';
import { safeBack } from '../lib/navigation';

type ResultKind = 'user' | 'community';
interface SearchResult {
  id:         string;
  kind:       ResultKind;
  title:      string;
  subtitle:   string;
  avatar_url: string | null;
  meta:       string;
}

async function runSearch(query: string): Promise<SearchResult[]> {
  const q = `%${query.trim()}%`;

  const [usersRes, commRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, name, username, avatar_url, occupation, city')
      .or(`name.ilike.${q},username.ilike.${q},occupation.ilike.${q}`)
      .limit(10),
    supabase
      .from('communities')
      .select('id, name, description, avatar_url, category, member_count')
      .or(`name.ilike.${q},description.ilike.${q},category.ilike.${q}`)
      .limit(10),
  ]);

  const users: SearchResult[] = (usersRes.data ?? []).map((u: any) => ({
    id:         u.id,
    kind:       'user',
    title:      u.name,
    subtitle:   `@${u.username}`,
    avatar_url: u.avatar_url,
    meta:       [u.occupation, u.city].filter(Boolean).join(' · '),
  }));

  const comms: SearchResult[] = (commRes.data ?? []).map((c: any) => ({
    id:         c.id,
    kind:       'community',
    title:      c.name,
    subtitle:   c.category,
    avatar_url: c.avatar_url,
    meta:       `${(c.member_count ?? 0).toLocaleString()} members`,
  }));

  return [...users, ...comms];
}

export default function SearchScreen() {
  const isDark = useAppSelector(s => s.theme.resolvedMode === 'dark');
  const theme  = isDark ? darkTheme : lightTheme;
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback((text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.trim().length < 2) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await runSearch(text);
        setResults(data);
        setSearched(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
  }, []);

  const handlePress = (item: SearchResult) => {
    if (item.kind === 'user')      router.push(`/user/${item.id}`);
    else if (item.kind === 'community') router.push(`/community/${item.id}`);
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => safeBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <View style={[s.searchBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.glassBorder }]}>
          <Ionicons name="search" size={18} color={theme.colors.textSecondary} />
          <TextInput
            style={[s.input, { color: theme.colors.text }]}
            placeholder="Search people, communities..."
            placeholderTextColor={theme.colors.textSecondary}
            value={query}
            onChangeText={handleSearch}
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); setResults([]); setSearched(false); }}>
              <Ionicons name="close-circle" size={18} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Results */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
        </View>
      ) : searched && results.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="search-outline" size={52} color={theme.colors.textTertiary} />
          <Text style={[s.hint, { color: theme.colors.textSecondary }]}>No results for "{query}"</Text>
        </View>
      ) : !searched ? (
        <View style={s.center}>
          <Ionicons name="search-outline" size={52} color={theme.colors.primary} style={{ opacity: 0.4 }} />
          <Text style={[s.hint, { color: theme.colors.textSecondary }]}>Start typing to search</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={item => `${item.kind}-${item.id}`}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handlePress(item)}
              style={[s.resultRow, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
              activeOpacity={0.8}
            >
              <Avatar uri={item.avatar_url} name={item.title} size="lg" />
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[s.resultTitle, { color: theme.colors.text }]} numberOfLines={1}>{item.title}</Text>
                  <View style={[s.kindBadge, { backgroundColor: item.kind === 'user' ? theme.colors.primary : theme.colors.secondary }]}>
                    <Text style={s.kindText}>{item.kind === 'user' ? 'Person' : 'Community'}</Text>
                  </View>
                </View>
                <Text style={[s.resultSub, { color: theme.colors.textSecondary }]} numberOfLines={1}>{item.subtitle}</Text>
                {item.meta ? <Text style={[s.resultMeta, { color: theme.colors.textTertiary }]} numberOfLines={1}>{item.meta}</Text> : null}
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1 },
  header:      { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  searchBox:   { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, borderWidth: 1 },
  input:       { flex: 1, fontSize: 15, fontFamily: 'Inter-Regular' },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  hint:        { fontSize: 15, fontFamily: 'Inter-Regular', opacity: 0.7 },
  resultRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1 },
  resultTitle: { fontSize: 15, fontFamily: 'Inter-SemiBold', flex: 1 },
  resultSub:   { fontSize: 12, fontFamily: 'Inter-Regular' },
  resultMeta:  { fontSize: 11, fontFamily: 'Inter-Regular' },
  kindBadge:   { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  kindText:    { color: '#FFF', fontSize: 9, fontFamily: 'Inter-Bold' },
});