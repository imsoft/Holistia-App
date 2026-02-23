import type { Session } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

type ProfileAuth = {
  account_active: boolean;
  type: string | null;
};

/**
 * Obtiene el estado de autenticación del perfil del usuario.
 * Usado para verificar account_active (cuenta desactivada) y tipo de usuario.
 * Equivalente a getRedirectPathForUser en la web.
 */
export async function getProfileAuthStatus(
  supabase: SupabaseClient,
  userId: string
): Promise<ProfileAuth> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('type, account_active')
    .eq('id', userId)
    .maybeSingle();

  return {
    account_active: profile?.account_active ?? true,
    type: profile?.type ?? null,
  };
}

/**
 * Verifica si el usuario puede acceder tras login (email/password o OAuth).
 * Si account_active es false, devuelve deactivated: true (la pantalla account-deactivated
 * se encarga de cerrar sesión). Equivalente a la lógica de la web.
 */
export async function verifyLoginAndProfile(
  supabase: SupabaseClient,
  session: Session
): Promise<{ ok: true } | { ok: false; deactivated: true }> {
  const status = await getProfileAuthStatus(supabase, session.user.id);
  if (status.account_active === false) {
    return { ok: false, deactivated: true };
  }
  return { ok: true };
}
