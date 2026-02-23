import { supabase } from '@/lib/supabase';

export async function fetchConversation(conversationId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: conv, error } = await supabase
    .from('direct_conversations')
    .select('id, user_id, professional_id')
    .eq('id', conversationId)
    .single();

  if (error || !conv) return null;

  const { data: prof } = await supabase
    .from('professional_applications')
    .select('id, first_name, last_name, profile_photo, user_id')
    .eq('id', conv.professional_id)
    .single();

  const isProf = prof?.user_id === user.id;

  if (isProf) {
    const { data: patientProfile } = await supabase
      .from('profiles')
      .select('first_name, last_name, avatar_url')
      .eq('id', conv.user_id)
      .single();
    const name = patientProfile ? `${patientProfile.first_name || ''} ${patientProfile.last_name || ''}`.trim() || 'Paciente' : 'Paciente';
    return { id: conv.id, user_id: conv.user_id, professional_id: conv.professional_id, other: { name, avatar: patientProfile?.avatar_url } };
  }

  const name = prof ? `${prof.first_name || ''} ${prof.last_name || ''}`.trim() : 'Profesional';
  return { id: conv.id, user_id: conv.user_id, professional_id: conv.professional_id, other: { name, avatar: prof?.profile_photo } };
}

export async function fetchMessages(conversationId: string, limit = 50) {
  const { data, error } = await supabase
    .from('direct_messages')
    .select('id, sender_id, sender_type, content, is_read, metadata, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function sendMessage(
  conversationId: string,
  content: string,
  senderType: 'user' | 'professional',
  metadata?: Record<string, unknown>
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const insertData: Record<string, unknown> = {
    conversation_id: conversationId,
    sender_id: user.id,
    sender_type: senderType,
    content: content.trim(),
  };
  if (metadata && Object.keys(metadata).length > 0) {
    insertData.metadata = metadata;
  }

  const { data, error } = await supabase
    .from('direct_messages')
    .insert(insertData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function markConversationAsRead(conversationId: string, isProfessional: boolean) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: conv } = await supabase
    .from('direct_conversations')
    .select('user_id, professional_id')
    .eq('id', conversationId)
    .single();

  if (!conv) return;

  const professionalApp = await supabase
    .from('professional_applications')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'approved')
    .maybeSingle();

  const isProf = !!professionalApp.data;

  await supabase
    .from('direct_messages')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .neq('sender_id', user.id);

  if (isProf) {
    await supabase
      .from('direct_conversations')
      .update({ professional_unread_count: 0 })
      .eq('id', conversationId);
  } else {
    await supabase
      .from('direct_conversations')
      .update({ user_unread_count: 0 })
      .eq('id', conversationId);
  }
}
