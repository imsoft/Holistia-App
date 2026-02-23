import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { verifyLoginAndProfile } from './auth-helpers';
import { supabase } from './supabase';

/**
 * Extrae access_token y refresh_token de la URL de callback.
 * Supabase puede enviar los tokens en el hash (#) o en query params (?)
 */
function extractTokensFromUrl(url: string): { access_token?: string; refresh_token?: string } {
  try {
    const { params, errorCode } = QueryParams.getQueryParams(url);
    if (!errorCode && params.access_token) {
      return { access_token: params.access_token, refresh_token: params.refresh_token };
    }
  } catch {
    // Fallback: parsear hash manualmente (Supabase usa #access_token=...)
  }
  const hash = url.split('#')[1];
  if (!hash) return {};
  const params = Object.fromEntries(new URLSearchParams(hash));
  return { access_token: params.access_token, refresh_token: params.refresh_token };
}

/**
 * Crea la sesión a partir de la URL de callback de OAuth (con access_token y refresh_token)
 */
async function createSessionFromUrl(url: string) {
  const { access_token, refresh_token } = extractTokensFromUrl(url);

  if (!access_token) return;

  const { data, error } = await supabase.auth.setSession({
    access_token,
    refresh_token: refresh_token ?? '',
  });
  if (error) throw error;
  return data.session;
}

/**
 * Inicia el flujo de OAuth con Google.
 * Abre el navegador, el usuario inicia sesión con Google, y al completar
 * se establece la sesión y se redirige a la app principal.
 */
export async function signInWithGoogle(): Promise<{ error?: string }> {
  try {
    // Completar sesión pendiente (requerido en web)
    WebBrowser.maybeCompleteAuthSession();

    const redirectTo = makeRedirectUri({
      scheme: 'holistia',
      path: 'auth/callback',
    });

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      return { error: error.message };
    }

    if (!data?.url) {
      return { error: 'No se pudo obtener la URL de autenticación' };
    }

    const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

    if (res.type === 'success' && res.url) {
      const session = await createSessionFromUrl(res.url);
      if (session) {
        const result = await verifyLoginAndProfile(supabase, session);
        if (result.ok === false && result.deactivated) {
          // @ts-expect-error - ruta account-deactivated (tipos generados por Expo)
          router.replace('/(auth)/account-deactivated');
          return {};
        }
      }
      router.replace('/(tabs)');
      return {};
    }

    // Usuario canceló o cerró el navegador
    if (res.type === 'cancel' || res.type === 'dismiss') {
      return {};
    }

    return { error: 'No se pudo completar el inicio de sesión' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error inesperado al iniciar sesión con Google';
    return { error: message };
  }
}
