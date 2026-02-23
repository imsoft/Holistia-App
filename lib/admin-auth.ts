import type { SupabaseClient } from '@supabase/supabase-js';

export type ProfileType = 'admin' | 'professional' | 'patient' | null;

/**
 * Obtiene el tipo de perfil del usuario (profiles.type).
 * Usado para redirigir: admin → (admin), professional → (expert), resto → (tabs) paciente.
 */
export async function getProfileType(
  supabase: SupabaseClient,
  userId: string
): Promise<ProfileType> {
  const { data } = await supabase
    .from('profiles')
    .select('type')
    .eq('id', userId)
    .maybeSingle();

  const t = data?.type;
  if (t === 'admin' || t === 'professional' || t === 'patient') return t;
  return null;
}

export function isAdmin(type: ProfileType): boolean {
  return type === 'admin';
}
