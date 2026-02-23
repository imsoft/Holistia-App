import type { Session } from '@supabase/supabase-js';
import { webApiFetch } from '@/lib/web-api';

export type PrivacySettings = {
  profile_visibility: 'public' | 'followers' | 'private';
  show_challenges: boolean;
  show_stats: boolean;
  show_achievements: boolean;
  show_followers: boolean;
  show_activity: boolean;
  who_can_follow: 'everyone' | 'no_one';
  who_can_message: 'everyone' | 'followers' | 'no_one';
  who_can_see_posts: 'everyone' | 'followers' | 'private';
  who_can_comment: 'everyone' | 'followers' | 'no_one';
  email_notifications: boolean;
  push_notifications: boolean;
  notify_on_follow: boolean;
  notify_on_like: boolean;
  notify_on_comment: boolean;
  notify_on_team_invite: boolean;
  notify_on_challenge_update: boolean;
  allow_search_by_email: boolean;
  allow_search_by_name: boolean;
  show_online_status: boolean;
};

const DEFAULTS: PrivacySettings = {
  profile_visibility: 'public',
  show_challenges: true,
  show_stats: true,
  show_achievements: true,
  show_followers: true,
  show_activity: true,
  who_can_follow: 'everyone',
  who_can_message: 'everyone',
  who_can_see_posts: 'everyone',
  who_can_comment: 'everyone',
  email_notifications: true,
  push_notifications: true,
  notify_on_follow: true,
  notify_on_like: true,
  notify_on_comment: true,
  notify_on_team_invite: true,
  notify_on_challenge_update: true,
  allow_search_by_email: false,
  allow_search_by_name: true,
  show_online_status: true,
};

export async function fetchPrivacy(session: Session | null): Promise<PrivacySettings> {
  const res = await webApiFetch('/api/privacy', session);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error || 'Error al cargar privacidad');
  }
  const data = await res.json();
  const raw = (data.data || data) as Partial<PrivacySettings>;
  return { ...DEFAULTS, ...raw };
}

export async function updatePrivacy(
  session: Session | null,
  settings: Partial<PrivacySettings>
): Promise<PrivacySettings> {
  const res = await webApiFetch('/api/privacy', session, {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error || 'Error al guardar');
  }
  const data = await res.json();
  const raw = (data.data || data) as Partial<PrivacySettings>;
  return { ...DEFAULTS, ...raw };
}
