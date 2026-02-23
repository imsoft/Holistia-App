import { supabase } from '@/lib/supabase';

export type FollowStats = { followers_count: number; following_count: number };

export type FollowUser = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  username: string | null;
  type: string | null;
};

export async function getFollowStats(userId: string): Promise<FollowStats> {
  const [followersRes, followingRes] = await Promise.all([
    supabase.from('user_follows').select('id', { count: 'exact', head: true }).eq('following_id', userId),
    supabase.from('user_follows').select('id', { count: 'exact', head: true }).eq('follower_id', userId),
  ]);
  return {
    followers_count: followersRes.count ?? 0,
    following_count: followingRes.count ?? 0,
  };
}

export async function checkIsFollowing(followerId: string, followingId: string): Promise<boolean> {
  if (followerId === followingId) return false;
  const { data } = await supabase
    .from('user_follows')
    .select('id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .maybeSingle();
  return !!data;
}

export async function toggleFollow(
  followerId: string,
  followingId: string
): Promise<{ following: boolean }> {
  if (followerId === followingId) return { following: false };
  const isFollowing = await checkIsFollowing(followerId, followingId);
  if (isFollowing) {
    const { error } = await supabase
      .from('user_follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);
    if (error) throw error;
    return { following: false };
  } else {
    const { error } = await supabase.from('user_follows').insert({
      follower_id: followerId,
      following_id: followingId,
    });
    if (error) throw error;
    return { following: true };
  }
}

export async function getFollowList(
  userId: string,
  type: 'followers' | 'following'
): Promise<FollowUser[]> {
  if (type === 'followers') {
    const { data: rows } = await supabase
      .from('user_follows')
      .select('follower_id')
      .eq('following_id', userId);
    const ids = [...new Set((rows ?? []).map((r) => r.follower_id).filter(Boolean))];
    if (ids.length === 0) return [];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, avatar_url, username, type')
      .in('id', ids);
    const list = (profiles ?? []).map((p) => ({
      id: p.id,
      first_name: p.first_name ?? null,
      last_name: p.last_name ?? null,
      avatar_url: p.avatar_url ?? null,
      username: p.username ?? null,
      type: p.type ?? null,
    }));
    const proIds = list.filter((p) => p.type === 'professional').map((p) => p.id);
    if (proIds.length > 0) {
      const { data: proApps } = await supabase
        .from('professional_applications')
        .select('user_id, profile_photo')
        .in('user_id', proIds);
      const photoMap = new Map((proApps ?? []).map((pa) => [pa.user_id, pa.profile_photo]));
      list.forEach((u) => {
        if (photoMap.get(u.id)) (u as any).avatar_url = photoMap.get(u.id);
      });
    }
    return list;
  }
  const { data: rows } = await supabase
    .from('user_follows')
    .select('following_id')
    .eq('follower_id', userId);
  const ids = [...new Set((rows ?? []).map((r) => r.following_id).filter(Boolean))];
  if (ids.length === 0) return [];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, avatar_url, username, type')
    .in('id', ids);
  const list = (profiles ?? []).map((p) => ({
    id: p.id,
    first_name: p.first_name ?? null,
    last_name: p.last_name ?? null,
    avatar_url: p.avatar_url ?? null,
    username: p.username ?? null,
    type: p.type ?? null,
  }));
  const proIds = list.filter((p) => p.type === 'professional').map((p) => p.id);
  if (proIds.length > 0) {
    const { data: proApps } = await supabase
      .from('professional_applications')
      .select('user_id, profile_photo')
      .in('user_id', proIds);
    const photoMap = new Map((proApps ?? []).map((pa) => [pa.user_id, pa.profile_photo]));
    list.forEach((u) => {
      if (photoMap.get(u.id)) (u as any).avatar_url = photoMap.get(u.id);
    });
  }
  return list;
}
