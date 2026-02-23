import type { SupabaseClient } from '@supabase/supabase-js';

export type ProfessionalData = {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  profile_photo: string | null;
  status: string;
  [key: string]: unknown;
};

/**
 * Verifica si el usuario es profesional aprobado.
 * Usa profiles.type === 'professional' O professional_applications con status approved.
 */
export async function getProfessionalForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<ProfessionalData | null> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('type')
    .eq('id', userId)
    .maybeSingle();

  if (profile?.type === 'professional') {
    const { data: app } = await supabase
      .from('professional_applications')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'approved')
      .maybeSingle();
    return app as ProfessionalData | null;
  }

  const { data: app } = await supabase
    .from('professional_applications')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'approved')
    .maybeSingle();

  return app as ProfessionalData | null;
}
