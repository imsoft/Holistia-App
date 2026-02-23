import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, Alert, TextInput } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useAuthStore } from '@/stores/auth-store';
import { supabase } from '@/lib/supabase';
import { webApiFetch } from '@/lib/web-api';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { createProductCheckout } from '@/lib/checkout-api';

export default function ProgramDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useAuthStore((s) => s.session);
  const [product, setProduct] = useState<any>(null);
  const [owned, setOwned] = useState(false);
  const [purchaseId, setPurchaseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);

  const [reviewStats, setReviewStats] = useState({ total_reviews: 0, average_rating: 0 });
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [userAlreadyReviewed, setUserAlreadyReviewed] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const colorScheme = useColorScheme();
  const c = colorScheme === 'dark' ? Colors.dark : Colors.light;

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const { data } = await supabase
          .from('digital_products')
          .select('*, professional_applications(first_name, last_name)')
          .eq('id', id)
          .eq('is_active', true)
          .single();
        setProduct(data);
        if (data && session?.user?.id) {
          const { data: purchase } = await supabase
            .from('digital_product_purchases')
            .select('id')
            .eq('buyer_id', session.user.id)
            .eq('product_id', id)
            .eq('payment_status', 'succeeded')
            .eq('access_granted', true)
            .maybeSingle();
          setOwned(!!purchase);
          setPurchaseId(purchase?.id ?? null);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, session?.user?.id]);

  const fetchReviews = useCallback(async () => {
    if (!id) return;
    setReviewsLoading(true);
    try {
      const res = await webApiFetch(`/api/programs/${id}/reviews`, session ?? null);
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setReviewStats(data.stats || { total_reviews: 0, average_rating: 0 });
        setReviews(data.reviews || []);
        if (purchaseId && data.reviews) {
          const hasUserReview = data.reviews.some((r: any) => r.purchase_id === purchaseId);
          setUserAlreadyReviewed(hasUserReview);
        } else {
          setUserAlreadyReviewed(false);
        }
      }
    } catch (e) {
      console.error('Reviews error:', e);
    } finally {
      setReviewsLoading(false);
    }
  }, [id, purchaseId]);

  useEffect(() => {
    if (id) fetchReviews();
  }, [id, fetchReviews]);

  const handleSubmitReview = async () => {
    if (!purchaseId || reviewRating < 1 || !session) return;
    setReviewSubmitting(true);
    try {
      const res = await webApiFetch(`/api/programs/${id}/reviews`, session, {
        method: 'POST',
        body: JSON.stringify({
          purchase_id: purchaseId,
          rating: reviewRating,
          comment: reviewComment.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Error al publicar');
      Alert.alert('Listo', 'Reseña publicada');
      setReviewRating(0);
      setReviewComment('');
      fetchReviews();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo publicar la reseña');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleBuy = async () => {
    if (!product) return;
    setBuying(true);
    try {
      const result = await createProductCheckout(product.id);
      if ('error' in result) {
        Alert.alert('Error', result.error);
        return;
      }
      if (result.success) {
        Alert.alert('¡Listo!', result.message ?? 'Acceso otorgado');
        return;
      }
      if (result.url) {
        await WebBrowser.openBrowserAsync(result.url);
        // En éxito, el deep link holistia://checkout-success navega a product-confirmation
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo completar');
    } finally {
      setBuying(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Text style={[styles.error, { color: c.foreground }]}>Programa no encontrado</Text>
      </View>
    );
  }

  const prof = product.professional_applications || {};
  const profName = `${prof.first_name || ''} ${prof.last_name || ''}`.trim();
  const price = product.price ?? 0;
  const isFree = price === 0 || price === null;

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.background }]} contentContainerStyle={styles.content}>
      {product.cover_image_url ? (
        <Image source={{ uri: product.cover_image_url }} style={styles.image} contentFit="cover" />
      ) : (
        <View style={[styles.imagePlaceholder, { backgroundColor: c.muted }]} />
      )}
      <Text style={[styles.title, { color: c.foreground }]}>{product.title || 'Programa'}</Text>
      {profName ? <Text style={[styles.author, { color: c.mutedForeground }]}>{profName}</Text> : null}
      {product.description ? (
        <Text style={[styles.desc, { color: c.foreground }]}>{product.description}</Text>
      ) : null}

      <View style={styles.buySection}>
        {owned ? (
          <View style={[styles.ownedBadge, { backgroundColor: c.primary + '20', borderColor: c.primary }]}>
            <Text style={[styles.ownedText, { color: c.primary }]}>✓ Ya tienes acceso a este programa</Text>
            <Text style={[styles.ownedHint, { color: c.mutedForeground }]}>
              Todo el contenido está disponible para ti
            </Text>
          </View>
        ) : (
          <Pressable
            onPress={handleBuy}
            disabled={buying}
            style={({ pressed }) => [
              styles.buyBtn,
              { backgroundColor: c.primary },
              (pressed || buying) && styles.pressed,
            ]}>
            {buying ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Text style={styles.buyBtnText}>
                  {isFree ? 'Obtener acceso' : `Comprar · $${price} MXN`}
                </Text>
                <Text style={[styles.buyHint, { color: c.mutedForeground }]}>
                  {isFree ? 'Acceso directo' : 'Pago seguro con tarjeta'}
                </Text>
              </>
            )}
          </Pressable>
        )}
      </View>

      {/* Reseñas */}
      <View style={[styles.reviewsSection, { backgroundColor: c.card, borderColor: c.border }]}>
        <Text style={[styles.reviewsTitle, { color: c.foreground }]}>
          Reseñas {reviewStats.total_reviews > 0 ? `(${reviewStats.total_reviews})` : ''}
        </Text>
        {reviewStats.total_reviews > 0 && (
          <View style={styles.reviewStatsRow}>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((v) => (
                <MaterialIcons
                  key={v}
                  name={v <= Math.round(reviewStats.average_rating) ? 'star' : 'star-border'}
                  size={18}
                  color="#eab308"
                />
              ))}
            </View>
            <Text style={[styles.reviewStatsText, { color: c.mutedForeground }]}>
              {reviewStats.average_rating.toFixed(1)} · {reviewStats.total_reviews} {reviewStats.total_reviews === 1 ? 'reseña' : 'reseñas'}
            </Text>
          </View>
        )}

        {owned && purchaseId && !userAlreadyReviewed && (
          <View style={[styles.reviewForm, { backgroundColor: c.muted + '40', borderColor: c.border }]}>
            <Text style={[styles.reviewFormLabel, { color: c.foreground }]}>¿Qué te pareció este programa?</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((v) => (
                <Pressable key={v} onPress={() => setReviewRating(v)} style={styles.starBtn}>
                  <MaterialIcons
                    name={v <= reviewRating ? 'star' : 'star-border'}
                    size={28}
                    color="#eab308"
                  />
                </Pressable>
              ))}
            </View>
            <TextInput
              placeholder="Comentario (opcional)"
              placeholderTextColor={c.mutedForeground}
              value={reviewComment}
              onChangeText={setReviewComment}
              multiline
              style={[styles.reviewInput, { color: c.foreground, borderColor: c.border }]}
            />
            <Pressable
              onPress={handleSubmitReview}
              disabled={reviewSubmitting || reviewRating < 1}
              style={[styles.submitReviewBtn, { backgroundColor: c.primary }, (reviewSubmitting || reviewRating < 1) && styles.disabled]}>
              {reviewSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitReviewText}>Publicar reseña</Text>
              )}
            </Pressable>
          </View>
        )}

        {reviewsLoading ? (
          <ActivityIndicator size="small" color={c.primary} style={styles.reviewsLoader} />
        ) : reviews.length === 0 ? (
          <Text style={[styles.emptyReviews, { color: c.mutedForeground }]}>
            {reviewStats.total_reviews === 0
              ? 'Aún no hay reseñas. ¡Sé el primero en opinar si ya lo compraste!'
              : 'No hay más reseñas.'}
          </Text>
        ) : (
          <View style={styles.reviewsList}>
            {reviews.map((r, idx) => (
              <View
                key={r.id}
                style={[
                  styles.reviewRow,
                  { borderColor: c.border },
                  idx === reviews.length - 1 && styles.reviewRowLast,
                ]}>
                <View style={styles.reviewRowHeader}>
                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((v) => (
                      <MaterialIcons
                        key={v}
                        name={v <= r.rating ? 'star' : 'star-border'}
                        size={14}
                        color="#eab308"
                      />
                    ))}
                  </View>
                  <Text style={[styles.reviewAuthor, { color: c.foreground }]}>{r.author_name}</Text>
                </View>
                <Text style={[styles.reviewDate, { color: c.mutedForeground }]}>
                  {formatReviewDate(r.created_at)}
                </Text>
                {r.comment ? (
                  <Text style={[styles.reviewComment, { color: c.mutedForeground }]}>{r.comment}</Text>
                ) : null}
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

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

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: { fontSize: 16 },
  image: { width: '100%', height: 200 },
  imagePlaceholder: { width: '100%', height: 200 },
  title: { fontSize: 22, fontWeight: '700', padding: 20, paddingBottom: 8 },
  author: { fontSize: 14, paddingHorizontal: 20, paddingTop: 4 },
  desc: { fontSize: 15, lineHeight: 24, padding: 20, paddingTop: 16 },
  buySection: { padding: 20, paddingTop: 24 },
  buyBtn: { padding: 16, borderRadius: 12, alignItems: 'center' },
  buyBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  buyHint: { fontSize: 12, marginTop: 6 },
  pressed: { opacity: 0.9 },
  ownedBadge: { padding: 20, borderRadius: 12, borderWidth: 2, alignItems: 'center' },
  ownedText: { fontSize: 16, fontWeight: '600' },
  ownedHint: { fontSize: 13, marginTop: 6 },
  reviewsSection: {
    margin: 20,
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  reviewsTitle: { fontSize: 17, fontWeight: '600', marginBottom: 12 },
  reviewStatsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  starsRow: { flexDirection: 'row', gap: 2 },
  starBtn: { padding: 4 },
  reviewStatsText: { fontSize: 14 },
  reviewForm: {
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  reviewFormLabel: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  reviewInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    fontSize: 15,
    marginTop: 12,
  },
  submitReviewBtn: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitReviewText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  disabled: { opacity: 0.6 },
  reviewsLoader: { marginVertical: 16 },
  emptyReviews: { fontSize: 14, fontStyle: 'italic', paddingVertical: 16 },
  reviewsList: { gap: 16 },
  reviewRow: {
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
  },
  reviewRowLast: { marginBottom: 0, borderBottomWidth: 0 },
  reviewRowHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reviewAuthor: { fontSize: 14, fontWeight: '500' },
  reviewDate: { fontSize: 12, marginTop: 4 },
  reviewComment: { fontSize: 14, marginTop: 8, lineHeight: 20 },
});
