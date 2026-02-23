import { supabase } from '@/lib/supabase';

// Reacciones emoji (paridad con web post_reactions)
export const REACTION_TYPES = ['like', 'love', 'fire', 'strong', 'clap', 'wow'] as const;
export type ReactionType = (typeof REACTION_TYPES)[number];
export const REACTION_EMOJI: Record<ReactionType, string> = {
  like: '👍',
  love: '❤️',
  fire: '🔥',
  strong: '💪',
  clap: '👏',
  wow: '😮',
};

export type ReactionsData = {
  reactions: Record<string, { count: number }>;
  userReaction: ReactionType | null;
  totalCount: number;
};

export async function fetchReactions(checkinId: string): Promise<ReactionsData> {
  const { data: { user } } = await supabase.auth.getUser();

  const { data: rows, error } = await supabase
    .from('post_reactions')
    .select('reaction_type, user_id')
    .eq('checkin_id', checkinId);

  if (error) {
    return { reactions: {}, userReaction: null, totalCount: 0 };
  }

  const list = rows ?? [];
  const byType: Record<string, number> = {};
  list.forEach((r: any) => {
    byType[r.reaction_type] = (byType[r.reaction_type] || 0) + 1;
  });
  const reactions: Record<string, { count: number }> = {};
  Object.entries(byType).forEach(([type, count]) => {
    reactions[type] = { count };
  });

  const userReaction = user
    ? (list.find((r: any) => r.user_id === user.id) as any)?.reaction_type ?? null
    : null;

  return {
    reactions,
    userReaction: userReaction as ReactionType | null,
    totalCount: list.length,
  };
}

export async function setReaction(
  checkinId: string,
  reactionType: ReactionType
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  if (!REACTION_TYPES.includes(reactionType)) throw new Error('Reacción inválida');

  await supabase.from('post_reactions').upsert(
    {
      checkin_id: checkinId,
      user_id: user.id,
      reaction_type: reactionType,
    },
    { onConflict: 'checkin_id,user_id' }
  );
}

export async function removeReaction(checkinId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  await supabase
    .from('post_reactions')
    .delete()
    .eq('checkin_id', checkinId)
    .eq('user_id', user.id);
}

export async function fetchFeed(limit: number, offset: number, filter: string = 'all') {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], hasMore: false };

  if (filter === 'following') {
    const { data: following } = await supabase
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', user.id);
    const ids = following?.map((f) => f.following_id) ?? [];
    if (ids.length === 0) return { data: [], hasMore: false };

    const { data, count, error } = await supabase
      .from('social_feed_checkins')
      .select('*', { count: 'exact' })
      .in('user_id', ids)
      .order('checkin_time', { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return { data: data || [], hasMore: (count ?? 0) > offset + limit };
  }

  if (filter === 'recommended') {
    const { data, count, error } = await supabase
      .from('social_feed_checkins')
      .select('*', { count: 'exact' })
      .order('likes_count', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return { data: data || [], hasMore: (count ?? 0) > offset + limit };
  }

  const { data, count, error } = await supabase
    .from('social_feed_checkins')
    .select('*', { count: 'exact' })
    .order('checkin_time', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return { data: data || [], hasMore: (count ?? 0) > offset + limit };
}

export async function fetchSinglePost(checkinId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('social_feed_checkins')
    .select('*')
    .eq('checkin_id', checkinId)
    .single();

  if (error || !data) return null;
  return data;
}

export async function checkUserLiked(checkinId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from('challenge_checkin_likes')
    .select('id')
    .eq('checkin_id', checkinId)
    .eq('user_id', user.id)
    .maybeSingle();

  return !!data;
}

export async function toggleLike(checkinId: string): Promise<{ liked: boolean }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { liked: false };

  const liked = await checkUserLiked(checkinId);

  if (liked) {
    const { error } = await supabase
      .from('challenge_checkin_likes')
      .delete()
      .eq('checkin_id', checkinId)
      .eq('user_id', user.id);
    if (error) throw error;
    return { liked: false };
  } else {
    const { error } = await supabase
      .from('challenge_checkin_likes')
      .insert({ checkin_id: checkinId, user_id: user.id });
    if (error) throw error;
    return { liked: true };
  }
}

export type CommentWithProfile = {
  id: string;
  comment_text: string;
  created_at: string;
  user_id: string | null;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  };
};

export async function fetchComments(checkinId: string): Promise<CommentWithProfile[]> {
  const { data: comments, error } = await supabase
    .from('challenge_checkin_comments')
    .select('id, comment_text, created_at, user_id')
    .eq('checkin_id', checkinId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  const list = comments ?? [];

  const userIds = [...new Set(list.map((c) => c.user_id).filter(Boolean))];
  const profilesMap = new Map<string, { first_name: string | null; last_name: string | null; avatar_url: string | null }>();

  if (userIds.length > 0) {
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, avatar_url')
      .in('id', userIds);
    (profilesData ?? []).forEach((p) => {
      profilesMap.set(p.id, {
        first_name: p.first_name ?? null,
        last_name: p.last_name ?? null,
        avatar_url: p.avatar_url ?? null,
      });
    });
  }

  return list.map((c) => ({
    ...c,
    profiles: profilesMap.get(c.user_id!) ?? {
      first_name: null,
      last_name: null,
      avatar_url: null,
    },
  }));
}

export async function addComment(
  checkinId: string,
  commentText: string
): Promise<CommentWithProfile> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const { data: checkin } = await supabase
    .from('challenge_checkins')
    .select('id, is_public, allow_comments')
    .eq('id', checkinId)
    .single();

  if (!checkin || !checkin.is_public || !checkin.allow_comments) {
    throw new Error('Check-in no encontrado o no permite comentarios');
  }

  const { data: newComment, error } = await supabase
    .from('challenge_checkin_comments')
    .insert({
      checkin_id: checkinId,
      user_id: user.id,
      comment_text: commentText.trim(),
    })
    .select('id, comment_text, created_at, updated_at, user_id')
    .single();

  if (error) throw error;

  const { data: profileData } = await supabase
    .from('profiles')
    .select('first_name, last_name, avatar_url')
    .eq('id', user.id)
    .single();

  return {
    ...newComment!,
    profiles: profileData
      ? {
          first_name: profileData.first_name ?? null,
          last_name: profileData.last_name ?? null,
          avatar_url: profileData.avatar_url ?? null,
        }
      : { first_name: null, last_name: null, avatar_url: null },
  };
}

export async function deleteComment(commentId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');

  const { error } = await supabase
    .from('challenge_checkin_comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', user.id);

  if (error) throw error;
}
