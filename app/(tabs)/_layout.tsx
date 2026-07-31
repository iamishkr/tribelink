import { Tabs, Redirect } from 'expo-router';
import { View, Text, Platform, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector } from '../../store';
import { darkTheme, lightTheme } from '../../constants/Theme';

type TabIcon = {
  name:    keyof typeof Ionicons.glyphMap;
  focused: boolean;
  color:   string;
  label:   string;
};

function TabBarIcon({ name, focused, color, label }: TabIcon) {
  return (
    <View style={styles.tabIcon}>
      <Ionicons name={name} size={24} color={color} />
      {focused && <View style={[styles.activeDot, { backgroundColor: color }]} />}
    </View>
  );
}

export default function TabsLayout() {
  const { isAuthenticated, onboardingComplete } = useAppSelector(s => s.auth);
  const isDark    = useAppSelector(s => s.theme.resolvedMode === 'dark');
  const theme     = isDark ? darkTheme : lightTheme;
  const unreadCount = useAppSelector(s => s.notifications.unreadCount);

  if (!isAuthenticated)   return <Redirect href="/(auth)/login" />;
  if (!onboardingComplete) return <Redirect href="/(onboarding)/step-1-name" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: 'absolute',
          borderTopWidth: 0,
          elevation: 0,
          backgroundColor: 'transparent',
          height: Platform.OS === 'ios' ? 84 : 64,
        },
        tabBarBackground: () => (
          <BlurView
            intensity={isDark ? 80 : 90}
            tint={isDark ? 'dark' : 'light'}
            style={[StyleSheet.absoluteFill, {
              backgroundColor: isDark
                ? 'rgba(10,10,27,0.85)'
                : 'rgba(255,255,255,0.85)',
              borderTopWidth: 1,
              borderTopColor: theme.colors.glassBorder,
            }]}
          />
        ),
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabBarIcon name={focused ? 'home' : 'home-outline'} focused={focused} color={color as string} label="Home" />
          ),
          tabBarActiveTintColor:   theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.tabBarInactive,
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabBarIcon name={focused ? 'compass' : 'compass-outline'} focused={focused} color={color as string} label="Discover" />
          ),
          tabBarActiveTintColor:   theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.tabBarInactive,
        }}
      />
      <Tabs.Screen
        name="communities"
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabBarIcon name={focused ? 'people' : 'people-outline'} focused={focused} color={color as string} label="Communities" />
          ),
          tabBarActiveTintColor:   theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.tabBarInactive,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabBarIcon name={focused ? 'calendar' : 'calendar-outline'} focused={focused} color={color as string} label="Events" />
          ),
          tabBarActiveTintColor:   theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.tabBarInactive,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabBarIcon name={focused ? 'person' : 'person-outline'} focused={focused} color={color as string} label="Profile" />
          ),
          tabBarActiveTintColor:   theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.tabBarInactive,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIcon:   { alignItems: 'center', justifyContent: 'center', gap: 4 },
  activeDot: { width: 4, height: 4, borderRadius: 2 },
});
