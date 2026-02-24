import { makeRedirectUri } from 'expo-auth-session';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

/**
 * Inicia sesión con Google abriendo el navegador externo del sistema (no WebView).
 * Usa Supabase OAuth para generar la URL de autorización de Google.
 *
 * Requisito en Supabase Dashboard → Authentication → URL Configuration → Redirect URLs:
 *   holistia://auth/callback
 */
export async function signInWithGoogle(): Promise<{ error?: string }> {
  try {
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
      return { error: 'No se pudo obtener la URL de autorización de Google.' };
    }

    // Abre el navegador externo del sistema (Safari en iOS, Chrome en Android)
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

    if (result.type === 'cancel' || result.type === 'dismiss') {
      return {};
    }

    if (result.type === 'success' && result.url) {
      // Parsear el access_token y refresh_token del fragment (#) de la URL de callback
      const url = new URL(result.url);

      // Supabase devuelve los tokens en el fragment hash (PKCE los devuelve en query params)
      const hashParams = new URLSearchParams(url.hash.replace('#', ''));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token') ?? '';

      // Fallback: buscar en query params (usado por PKCE)
      const queryParams = url.searchParams;
      const code = queryParams.get('code');

      if (accessToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError) return { error: sessionError.message };
        router.replace('/');
      } else if (code) {
        // Intercambiar el code por una sesión (flujo PKCE)
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) return { error: exchangeError.message };
        router.replace('/');
      }
    }

    return {};
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Error inesperado al iniciar sesión con Google';
    return { error: message };
  }
}

/**
 * @deprecated No requerida con el flujo OAuth por navegador.
 * Se mantiene para compatibilidad con auth-initializer.tsx.
 */
export function configureGoogleSignIn() {
  // No-op: el flujo OAuth por navegador no requiere configuración previa.
}
