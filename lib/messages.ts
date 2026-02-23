import { supabase } from '@/lib/supabase';

export async function fetchConversations() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: professionalApp } = await supabase
    .from('professional_applications')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'approved')
    .maybeSingle();

  if (professionalApp) {
    const [asProf, asUser] = await Promise.all([
      supabase
        .from('direct_conversations')
        .select(
          `id, user_id, professional_id, last_message_at, last_message_preview, user_unread_count, professional_unread_count,
           professional_applications!direct_conversations_professional_id_fkey(first_name, last_name, profile_photo)`
        )
        .eq('professional_id', professionalApp.id)
        .order('last_message_at', { ascending: false }),
      supabase
        .from('direct_conversations')
        .select(
          `id, user_id, professional_id, last_message_at, last_message_preview, user_unread_count, professional_unread_count,
           professional_applications!direct_conversations_professional_id_fkey(first_name, last_name, profile_photo)`
        )
        .eq('user_id', user.id)
        .order('last_message_at', { ascending: false }),
    ]);
    const seen = new Set<string>();
    const merged: any[] = [];
    for (const c of asProf.data || []) {
      if (c?.id && !seen.has(c.id)) {
        seen.add(c.id);
        merged.push({ ...c, professional: c.professional_applications });
      }
    }
    for (const c of asUser.data || []) {
      if (c?.id && !seen.has(c.id)) {
        seen.add(c.id);
        merged.push({ ...c, professional: c.professional_applications });
      }
    }
    merged.sort((a, b) => new Date(b.last_message_at || 0).getTime() - new Date(a.last_message_at || 0).getTime());
    return merged;
  }

  const { data } = await supabase
    .from('direct_conversations')
    .select(
      `id, user_id, professional_id, last_message_at, last_message_preview, user_unread_count, professional_unread_count,
       professional_applications!direct_conversations_professional_id_fkey(first_name, last_name, profile_photo)`
    )
    .eq('user_id', user.id)
    .order('last_message_at', { ascending: false });

  return (data || []).map((c) => ({ ...c, professional: c.professional_applications }));
}
