import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, Alert, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Image } from 'expo-image';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { getFollowStats, checkIsFollowing, toggleFollow } from '@/lib/follows';
import { Button } from '@/components/ui/button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

function formatReviewDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  if (diff < 7) return `Hace ${diff} días`;
  if (diff < 30) return `Hace ${Math.floor(diff / 7)} semanas`;
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

export default function ProfessionalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useAuthStore((s) => s.session);
  const [professional, setProfessional] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [reviewStats, setReviewStats] = useState<{ average_rating: number; total_reviews: number } | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [userReview, setUserReview] = useState<any>(null);
  const [reviewFormRating, setReviewFormRating] = useState(0);
  const [reviewFormComment, setReviewFormComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);
  const [followStats, setFollowStats] = useState({ followers_count: 0, following_count: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const colorScheme = useColorScheme();
  const c = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const refreshFavorite = useCallback(async () => {
    if (!session?.user?.id || !id) return;
    const { data } = await supabase
      .from('user_favorites')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('professional_id', id)
      .maybeSingle();
    setIsFavorite(!!data);
  }, [session?.user?.id, id]);

  const loadReviews = useCallback(async () => {
    if (!professional?.user_id) return;
    try {
      const [statsRes, reviewsRes] = await Promise.all([
        supabase.from('professional_review_stats').select('average_rating, total_reviews').eq('professional_id', professional.user_id).maybeSingle(),
        supabase.from('reviews').select('*').eq('professional_id', professional.user_id).order('created_at', { ascending: false }),
      ]);
      if (statsRes.data) setReviewStats(statsRes.data);
      if (reviewsRes.data) {
        const patientIds = [...new Set((reviewsRes.data || []).map((r: any) => r.patient_id))];
        let profilesMap = new Map<string, { full_name?: string; email?: string }>();
        if (patientIds.length > 0) {
          const { data: profiles } = await supabase.from('profiles').select('id, first_name, last_name, email').in('id', patientIds);
          profilesMap = new Map((profiles || []).map((p: any) => [p.id, { full_name: [p.first_name, p.last_name].filter(Boolean).join(' ').trim() || undefined, email: p.email }]));
        }
        setReviews((reviewsRes.data || []).map((r: any) => ({ ...r, patient: profilesMap.get(r.patient_id) })));
      }
      if (session?.user?.id) {
        const { data: myReview } = await supabase
          .from('reviews')
          .select('*')
          .eq('professional_id', professional.user_id)
          .eq('patient_id', session.user.id)
          .maybeSingle();
        setUserReview(myReview);
        if (myReview) {
          setReviewFormRating(myReview.rating);
          setReviewFormComment(myReview.comment || '');
        } else {
          setReviewFormRating(0);
          setReviewFormComment('');
        }
      }
    } catch (e) {
      console.error('Load reviews:', e);
    }
  }, [professional?.user_id, session?.user?.id]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const { data } = await supabase
          .from('professional_applications')
          .select('*')
          .eq('id', id)
          .single();
        setProfessional(data);
        if (session?.user?.id) await refreshFavorite();
        if (data?.user_id) {
          const stats = await getFollowStats(data.user_id);
          setFollowStats(stats);
          if (session?.user?.id && session.user.id !== data.user_id) {
            const following = await checkIsFollowing(session.user.id, data.user_id);
            setIsFollowing(following);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, session?.user?.id]);

  useEffect(() => {
    if (professional?.user_id) loadReviews();
  }, [professional?.user_id, loadReviews]);

  const submitReview = async () => {
    if (!session?.user?.id || !professional?.user_id || reviewFormRating < 1) return;
    setReviewSubmitting(true);
    try {
      if (userReview) {
        await supabase
          .from('reviews')
          .update({ rating: reviewFormRating, comment: reviewFormComment.trim() || null })
          .eq('id', userReview.id);
        Alert.alert('Listo', 'Reseña actualizada');
      } else {
        await supabase.from('reviews').insert({
          professional_id: professional.user_id,
          patient_id: session.user.id,
          rating: reviewFormRating,
          comment: reviewFormComment.trim() || null,
        });
        Alert.alert('Listo', 'Reseña publicada');
      }
      loadReviews();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo guardar');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const deleteReview = (reviewId: string) => {
    Alert.alert('Eliminar reseña', '¿Seguro que quieres eliminar tu reseña?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          setDeletingReviewId(reviewId);
          try {
            await supabase.from('reviews').delete().eq('id', reviewId);
            loadReviews();
          } catch (e: any) {
            Alert.alert('Error', e?.message ?? 'No se pudo eliminar');
          } finally {
            setDeletingReviewId(null);
          }
        },
      },
    ]);
  };

  const toggleFavorite = async () => {
    if (!session?.user?.id || !id || favoriteLoading) return;
    setFavoriteLoading(true);
    try {
      if (isFavorite) {
        await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', session.user.id)
          .eq('professional_id', id);
        setIsFavorite(false);
      } else {
        await supabase
          .from('user_favorites')
          .insert({ user_id: session.user.id, professional_id: id });
        setIsFavorite(true);
      }
    } catch (e) {
      console.error('Favorite toggle error:', e);
    } finally {
      setFavoriteLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  if (!professional) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Text style={[styles.error, { color: c.foreground }]}>Profesional no encontrado</Text>
      </View>
    );
  }

  const name = `${professional.first_name || ''} ${professional.last_name || ''}`.trim() || 'Profesional';
  const photo = professional.profile_photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`;
  const canReview = session && session.user.id !== professional.user_id;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView style={[styles.container, { backgroundColor: c.background }]} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Image source={{ uri: photo }} style={styles.avatar} />
        {session && (
          <Pressable
            onPress={toggleFavorite}
            disabled={favoriteLoading}
            style={({ pressed }) => [
              styles.favBtn,
              { backgroundColor: c.card },
              pressed && styles.pressed,
            ]}
          >
            <IconSymbol
              name="heart.fill"
              size={28}
              color={isFavorite ? c.destructive : c.mutedForeground}
            />
          </Pressable>
        )}
      </View>
      <Text style={[styles.name, { color: c.foreground }]}>{name}</Text>
      {professional.profession ? (
        <Text style={[styles.profession, { color: c.primary }]}>{professional.profession}</Text>
      ) : null}
      {reviewStats && reviewStats.total_reviews > 0 && (
        <View style={[styles.ratingRow, { marginBottom: 8 }]}>
          <MaterialIcons name="star" size={18} color="#eab308" />
          <Text style={[styles.ratingText, { color: c.mutedForeground }]}>
            {Number(reviewStats.average_rating).toFixed(1)} · {reviewStats.total_reviews} reseñas
          </Text>
        </View>
      )}
      <View style={styles.followStatsRow}>
        <View style={styles.followStatBlock}>
          <Text style={[styles.followStatNum, { color: c.foreground }]}>{followStats.followers_count}</Text>
          <Text style={[styles.followStatLabel, { color: c.mutedForeground }]}>
            {followStats.followers_count === 1 ? 'seguidor' : 'seguidores'}
          </Text>
        </View>
        <View style={[styles.followStatDivider, { backgroundColor: c.border }]} />
        <View style={styles.followStatBlock}>
          <Text style={[styles.followStatNum, { color: c.foreground }]}>{followStats.following_count}</Text>
          <Text style={[styles.followStatLabel, { color: c.mutedForeground }]}>siguiendo</Text>
        </View>
      </View>
      {session?.user?.id && professional.user_id !== session.user.id && (
        <Pressable
          onPress={async () => {
            if (!professional?.user_id || followLoading) return;
            setFollowLoading(true);
            try {
              const { following } = await toggleFollow(session.user.id, professional.user_id);
              setIsFollowing(following);
              const stats = await getFollowStats(professional.user_id);
              setFollowStats(stats);
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? 'No se pudo actualizar.');
            } finally {
              setFollowLoading(false);
            }
          }}
          disabled={followLoading}
          style={({ pressed }) => [
            styles.followBtn,
            { backgroundColor: isFollowing ? c.muted : c.primary, borderColor: isFollowing ? c.border : c.primary },
            (pressed || followLoading) && styles.pressed,
          ]}>
          {followLoading ? (
            <ActivityIndicator size="small" color={isFollowing ? c.foreground : '#fff'} />
          ) : (
            <>
              <MaterialIcons name={isFollowing ? 'person-remove' : 'person-add'} size={20} color={isFollowing ? c.foreground : '#fff'} />
              <Text style={[styles.followBtnText, { color: isFollowing ? c.foreground : '#fff' }]}>
                {isFollowing ? 'Dejar de seguir' : 'Seguir'}
              </Text>
            </>
          )}
        </Pressable>
      )}
      {professional.biography ? (
        <Text style={[styles.bio, { color: c.foreground }]}>{professional.biography}</Text>
      ) : null}
      {session && (
        <View style={styles.actions}>
          <Button
            title="Reservar cita"
            onPress={() => router.push(`/book/${id}`)}
            variant="primary"
            style={styles.actionBtn}
          />
          <Button
            title="Enviar mensaje"
            onPress={async () => {
              try {
                const { data: existing } = await supabase
                  .from('direct_conversations')
                  .select('id')
                  .eq('user_id', session.user.id)
                  .eq('professional_id', id)
                  .maybeSingle();
                if (existing) {
                  (router as any).push(`/(patient)/conversation/${existing.id}`);
                } else {
                  const { data: created, error } = await supabase
                    .from('direct_conversations')
                    .insert({ user_id: session.user.id, professional_id: id })
                    .select('id')
                    .single();
                  if (error) throw error;
                  if (created) (router as any).push(`/(patient)/conversation/${created.id}`);
                }
              } catch (e) {
                console.error('Error al iniciar conversación:', e);
                Alert.alert('Error', 'No se pudo iniciar la conversación. Intenta de nuevo.');
              }
            }}
            variant="outline"
            style={styles.actionBtn}
          />
        </View>
      )}

      {canReview && (
        <View style={[styles.reviewSection, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.sectionTitle, { color: c.foreground }]}>{userReview ? 'Editar tu reseña' : 'Deja tu reseña'}</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((value) => (
              <Pressable key={value} onPress={() => setReviewFormRating(value)} style={{ padding: 4 }}>
                <MaterialIcons name={value <= reviewFormRating ? 'star' : 'star-border'} size={32} color="#eab308" />
              </Pressable>
            ))}
          </View>
          <TextInput
            style={[styles.commentInput, { backgroundColor: c.background, color: c.foreground, borderColor: c.border }]}
            value={reviewFormComment}
            onChangeText={setReviewFormComment}
            placeholder="Comentario (opcional)"
            placeholderTextColor={c.mutedForeground}
            multiline
            maxLength={1000}
          />
          <Button
            title={userReview ? 'Actualizar' : 'Publicar reseña'}
            onPress={submitReview}
            loading={reviewSubmitting}
            disabled={reviewFormRating < 1}
            style={{ marginTop: 8 }}
          />
        </View>
      )}

      <View style={[styles.reviewSection, { backgroundColor: c.card, borderColor: c.border }]}>
        <Text style={[styles.sectionTitle, { color: c.foreground }]}>
          Reseñas {reviews.length > 0 ? `(${reviews.length})` : ''}
        </Text>
        {reviews.length === 0 ? (
          <Text style={[styles.emptyReviews, { color: c.mutedForeground }]}>Aún no hay reseñas.</Text>
        ) : (
          reviews.map((r) => {
            const isOwn = session?.user?.id === r.patient_id;
            const patientName = isOwn ? 'Tú' : (r.patient?.full_name || r.patient?.email?.split('@')[0] || 'Usuario');
            return (
              <View key={r.id} style={[styles.reviewItem, { borderBottomColor: c.border }]}>
                <View style={styles.reviewHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.reviewAuthor, { color: c.foreground }]}>{patientName}</Text>
                    <View style={styles.starsRow}>
                      {[1, 2, 3, 4, 5].map((v) => (
                        <MaterialIcons key={v} name={v <= r.rating ? 'star' : 'star-border'} size={14} color="#eab308" />
                      ))}
                    </View>
                    <Text style={[styles.reviewDate, { color: c.mutedForeground }]}>{formatReviewDate(r.created_at)}</Text>
                  </View>
                  {isOwn && (
                    <Pressable
                      onPress={() => deleteReview(r.id)}
                      disabled={deletingReviewId === r.id}
                      style={[styles.deleteBtn, { backgroundColor: c.destructive }]}
                    >
                      <MaterialIcons name="delete" size={18} color="#fff" />
                    </Pressable>
                  )}
                </View>
                {r.comment ? <Text style={[styles.reviewComment, { color: c.foreground }]}>{r.comment}</Text> : null}
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, alignItems: 'center', paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: { fontSize: 16 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 16,
  },
  avatar: { width: 120, height: 120, borderRadius: 60 },
  favBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pressed: { opacity: 0.8 },
  name: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  profession: { fontSize: 16, marginTop: 4, marginBottom: 16 },
  bio: { fontSize: 15, lineHeight: 24, textAlign: 'center', marginBottom: 24 },
  actions: { width: '100%', paddingHorizontal: 20, gap: 12 },
  actionBtn: { marginBottom: 0 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 14 },
  followStatsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 12 },
  followStatBlock: { alignItems: 'center' },
  followStatNum: { fontSize: 17, fontWeight: '700' },
  followStatLabel: { fontSize: 12, marginTop: 2 },
  followStatDivider: { width: 1, height: 24 },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    width: '100%',
    maxWidth: 280,
    marginBottom: 16,
  },
  followBtnText: { fontSize: 15, fontWeight: '600' },
  reviewSection: {
    width: '100%',
    marginTop: 24,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  starsRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  commentInput: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  emptyReviews: { fontSize: 14, textAlign: 'center', paddingVertical: 16 },
  reviewItem: { paddingVertical: 12, borderBottomWidth: 1 },
  reviewHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  reviewAuthor: { fontSize: 15, fontWeight: '600' },
  reviewDate: { fontSize: 12, marginTop: 2 },
  reviewComment: { fontSize: 14, marginTop: 8, lineHeight: 20 },
  deleteBtn: { padding: 8, borderRadius: 8 },
});
