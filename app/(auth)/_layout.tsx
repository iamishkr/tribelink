import { Redirect, Stack } from 'expo-router';
import { useAppSelector } from '../../store';

export default function AuthLayout() {
  const auth = useAppSelector(s => s?.auth);
  const isAuthenticated = auth?.isAuthenticated ?? false;
  const onboardingComplete = auth?.onboardingComplete ?? false;

  if (isAuthenticated && onboardingComplete)   return <Redirect href="/(tabs)/home" />;
  if (isAuthenticated && !onboardingComplete)  return <Redirect href="/(onboarding)/step-1-name" />;

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade_from_bottom' }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="verify-otp" />
    </Stack>
  );
}