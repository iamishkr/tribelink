import { Stack, Redirect } from 'expo-router';
import { useAppSelector } from '../../store';

export default function OnboardingLayout() {
  const auth = useAppSelector(s => s?.auth);
  const isAuthenticated = auth?.isAuthenticated ?? false;
  const onboardingComplete = auth?.onboardingComplete ?? false;

  if (!isAuthenticated)      return <Redirect href="/(auth)/login" />;
  if (onboardingComplete)    return <Redirect href="/(tabs)/home" />;

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', gestureEnabled: false }}>
      <Stack.Screen name="step-1-name"        />
      <Stack.Screen name="step-2-photo"        />
      <Stack.Screen name="step-3-interests"    />
      <Stack.Screen name="step-4-goals"        />
      <Stack.Screen name="step-5-location"     />
      <Stack.Screen name="step-6-preferences"  />
    </Stack>
  );
}
