import { router } from 'expo-router';

/**
 * Safely navigates back if there is a previous screen in the navigation stack.
 * If no previous screen exists (e.g. direct link, app start), redirects to fallbackRoute.
 */
export function safeBack(fallbackRoute: string = '/(tabs)/home') {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallbackRoute as any);
  }
}
