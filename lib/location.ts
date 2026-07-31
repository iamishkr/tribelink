import * as Location from 'expo-location';
import { Alert, Linking, Platform } from 'react-native';
import { supabase } from './supabase';

export interface LocationResult {
  granted: boolean;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  error?: string;
}

/**
 * Core Production Location Engine for TribeLink
 * Handles Android & iOS permissions, device GPS status, system settings redirects,
 * location fetching with fallback accuracy, reverse geocoding, and Supabase PostGIS syncing.
 */
export const requestLocationPermissionsAndPosition = async (
  userId?: string
): Promise<LocationResult> => {
  console.log('[LocationEngine] Starting location permission & position request...');

  try {
    // 1. Check Device GPS / Location Services Provider Status
    try {
      const providerStatus = await Location.getProviderStatusAsync();
      console.log('[LocationEngine] Provider Status:', providerStatus);

      if (!providerStatus.locationServicesEnabled) {
        Alert.alert(
          'Location Services Off 📍',
          'Location Services (GPS) are turned off on your device. Please turn on Location/GPS in your Android/iOS settings and try again.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => {
                if (Platform.OS === 'android') {
                  Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS').catch(() =>
                    Linking.openSettings()
                  );
                } else {
                  Linking.openSettings();
                }
              },
            },
          ]
        );
        return {
          granted: false,
          latitude: null,
          longitude: null,
          city: null,
          error: 'Location services are disabled on device.',
        };
      }
    } catch (providerErr) {
      console.warn('[LocationEngine] Could not check provider status:', providerErr);
    }

    // 2. Inspect Current Location Permission Status
    let { status: existingStatus, canAskAgain } =
      await Location.getForegroundPermissionsAsync();
    console.log('[LocationEngine] Initial Permission Status:', { existingStatus, canAskAgain });

    let finalStatus = existingStatus;

    // 3. Request Foreground Permission if not granted and can ask
    if (existingStatus !== 'granted') {
      if (canAskAgain !== false) {
        console.log('[LocationEngine] Invoking Location.requestForegroundPermissionsAsync()...');
        const reqResult = await Location.requestForegroundPermissionsAsync();
        finalStatus = reqResult.status;
        canAskAgain = reqResult.canAskAgain;
        console.log('[LocationEngine] Request Permission Result:', { finalStatus, canAskAgain });
      }
    }

    // 4. Handle Permission Denied / "Don't ask again" Fallback
    if (finalStatus !== 'granted') {
      console.warn('[LocationEngine] Permission not granted:', { finalStatus, canAskAgain });

      Alert.alert(
        'Location Permission Needed 📍',
        'TribeLink requires location permissions to find members near you. Please allow Location access in App Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => Linking.openSettings(),
          },
        ]
      );

      return {
        granted: false,
        latitude: null,
        longitude: null,
        city: null,
        error: 'Location permission was denied by user.',
      };
    }

    // 5. Fetch Device Location with Balanced Accuracy & Low Accuracy Fallback
    console.log('[LocationEngine] Fetching current position...');
    let locationObj: Location.LocationObject | null = null;

    try {
      locationObj = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
    } catch (posErr) {
      console.warn('[LocationEngine] Balanced accuracy fetch failed, falling back to Low accuracy:', posErr);
      try {
        locationObj = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Low,
        });
      } catch (lowPosErr) {
        console.warn('[LocationEngine] Low accuracy fetch failed, trying last known position:', lowPosErr);
        locationObj = await Location.getLastKnownPositionAsync();
      }
    }

    if (!locationObj) {
      throw new Error('Unable to retrieve location coordinates from GPS.');
    }

    const { latitude, longitude } = locationObj.coords;
    console.log('[LocationEngine] GPS Coordinates Obtained:', { latitude, longitude });

    // 6. Reverse Geocode City Name
    let cityName: string | null = null;
    try {
      const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (geocode && geocode.length > 0) {
        cityName = geocode[0].city ?? geocode[0].region ?? geocode[0].subregion ?? null;
      }
      console.log('[LocationEngine] Reverse Geocoded City:', cityName);
    } catch (geoErr) {
      console.warn('[LocationEngine] Reverse geocode warning:', geoErr);
    }

    // 7. Save Location & City to Supabase (if userId provided)
    if (userId && userId !== 'demo-user-123') {
      console.log('[LocationEngine] Upserting to user_locations in Supabase for user:', userId);

      const wktPoint = `POINT(${longitude} ${latitude})`;
      const { error: locErr } = await supabase.from('user_locations').upsert({
        user_id: userId,
        location: wktPoint,
        updated_at: new Date().toISOString(),
      });

      if (locErr) {
        console.error('[LocationEngine] Supabase user_locations error:', locErr);
      } else {
        console.log('[LocationEngine] Successfully saved user_locations to Supabase.');
      }

      if (cityName) {
        const { error: profileErr } = await supabase
          .from('profiles')
          .update({ city: cityName })
          .eq('id', userId);

        if (profileErr) {
          console.error('[LocationEngine] Supabase profile city error:', profileErr);
        }
      }
    }

    return {
      granted: true,
      latitude,
      longitude,
      city: cityName,
    };
  } catch (err: any) {
    console.error('[LocationEngine] Critical Exception during location request:', err);
    Alert.alert('Location Error', err.message || 'Could not retrieve your current location.');
    return {
      granted: false,
      latitude: null,
      longitude: null,
      city: null,
      error: err.message || 'An error occurred fetching location.',
    };
  }
};
