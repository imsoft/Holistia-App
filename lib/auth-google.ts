import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { router } from 'expo-router';
import { Platform } from 'react-native';
import { verifyLoginAndProfile } from './auth-helpers';
import { supabase } from './supabase';

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';

/**
 * Configura Google Sign-In. Llamar al iniciar la app (ej. en _layout.tsx o AuthInitializer).
 * - webClientId: OAuth tipo "Web application" (para idToken).
 * - iosClientId: OAuth tipo "iOS" (requerido en iOS si no usas Firebase/GoogleService-Info.plist).
 */
export function configureGoogleSignIn() {
  if (Platform.OS === 'web') return;
  if (!webClientId) return;
  GoogleSignin.configure({
    webClientId,
    ...(Platform.OS === 'ios' && iosClientId ? { iosClientId } : {}),
    offlineAccess: true,
  });
}

/**
 * Inicia sesión con Google usando el selector nativo de cuentas (sin WebView).
 * Solo funciona en iOS/Android con development build (no Expo Go).
 */
export async function signInWithGoogle(): Promise<{ error?: string }> {
  if (Platform.OS === 'web') {
    return { error: 'Google Sign-In nativo no disponible en web' };
  }

  if (!webClientId) {
    return {
      error:
        'Falta EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID en .env. Configura las credenciales de Google Cloud Console.',
    };
  }

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  } catch {
    return { error: 'Google Play Services no disponible' };
  }

  try {
    const signInResult = await GoogleSignin.signIn();

    if (signInResult.type === 'cancelled' || !signInResult.data) {
      return {};
    }

    const idToken = signInResult.data.idToken;

    if (!idToken) {
      return {
        error:
          'No se pudo obtener el token de Google. Verifica que EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID sea el Web Client ID (no Android/iOS).',
      };
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });

    if (error) {
      return { error: error.message };
    }

    if (data.session) {
      const result = await verifyLoginAndProfile(supabase, data.session);
      if (result.ok === false && result.deactivated) {
        router.replace('/(auth)/account-deactivated');
        return {};
      }
      router.replace('/(tabs)');
    }

    return {};
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err) {
      if (err.code === statusCodes.SIGN_IN_CANCELLED) {
        return {};
      }
      if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        return { error: 'Google Play Services no disponible' };
      }
      if (err.code === statusCodes.IN_PROGRESS) {
        return {};
      }
    }
    const message =
      err instanceof Error ? err.message : 'Error inesperado al iniciar sesión con Google';
    return { error: message };
  }
}
