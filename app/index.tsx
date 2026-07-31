import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAppSelector } from '../store';

export default function Index() {
  const { isAuthenticated, onboardingComplete, isLoading } = useAppSelector(s => s.auth);
  const resolvedMode = useAppSelector(s => s.theme.resolvedMode);
  const isDark = resolvedMode === 'dark';

  // Wait for auth state to resolve before redirecting
  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: isDark ? '#0A0A1B' : '#F8F7FF' }}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  if (isAuthenticated && onboardingComplete) {
    return <Redirect href="/(tabs)/home" />;
  }

  if (isAuthenticated && !onboardingComplete) {
    return <Redirect href="/(onboarding)/step-1-name" />;
  }

  return <Redirect href="/(auth)/login" />;
}