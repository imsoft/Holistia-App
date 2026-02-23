import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Share,
  Alert,
  Linking,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { API_BASE_URL } from '@/constants/auth';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const getShareUrl = (purchaseId: string) =>
  `${API_BASE_URL.replace(/\/$/, '')}/my-challenges?challenge=${purchaseId}`;

const getShareMessage = (title: string, purchaseId: string) =>
  `¡Completé el reto "${title}" en Holistia! 🎉 ${getShareUrl(purchaseId)}`;

export default function ChallengeCompletedScreen() {
  const { challenge: challengePurchaseId } = useLocalSearchParams<{ challenge: string }>();
  const session = useAuthStore((s) => s.session);
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    challenge_title: string;
    duration_days: number;
    total_points: number;
  } | null>(null);

  useEffect(() => {
    if (!challengePurchaseId || typeof challengePurchaseId !== 'string' || !session?.user?.id) {
      setLoading(false);
      return;
    }

    (async () => {
      const { data: purchase, error } = await supabase
        .from('challenge_purchases')
        .select('id, challenge_id, challenges(title, duration_days)')
        .eq('id', challengePurchaseId)
        .eq('participant_id', session.user.id)
        .single();

      if (error || !purchase) {
        setLoading(false);
        return;
      }

      const ch = Array.isArray((purchase as any).challenges)
        ? (purchase as any).challenges[0]
        : (purchase as any).challenges;

      const { data: progress } = await supabase
        .from('challenge_progress')
        .select('total_points')
        .eq('challenge_purchase_id', challengePurchaseId)
        .maybeSingle();

      setData({
        challenge_title: ch?.title || 'Tu reto',
        duration_days: ch?.duration_days || 0,
        total_points: progress?.total_points || 0,
      });
      setLoading(false);
    })();
  }, [challengePurchaseId, session?.user?.id]);

  const handleGoToChallenge = () => {
    router.replace(`/(patient)/my-challenges/${challengePurchaseId}` as any);
  };

  const handleShare = async () => {
    if (!data?.challenge_title || !challengePurchaseId) return;
    try {
      await Share.share({
        message: getShareMessage(data.challenge_title, challengePurchaseId),
        title: '¡Reto completado!',
      });
    } catch (e) {
      // User cancelled
    }
  };

  const handleShareWhatsApp = () => {
    if (!data?.challenge_title || !challengePurchaseId) return;
    const text = encodeURIComponent(getShareMessage(data.challenge_title, challengePurchaseId));
    Linking.openURL(`https://wa.me/?text=${text}`);
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  if (!data || !challengePurchaseId) {
    return (
      <View style={[styles.center, { backgroundColor: c.background, padding: 24 }]}>
        <Text style={[styles.error, { color: c.foreground }]}>No se encontró el reto</Text>
        <Pressable
          onPress={() => router.replace('/(patient)/my-challenges' as any)}
          style={[styles.btn, { backgroundColor: c.primary, marginTop: 24 }]}>
          <Text style={[styles.btnText, { color: c.primaryForeground }]}>Ver mis retos</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.background }]}
      contentContainerStyle={styles.content}>
      <View style={[styles.iconWrap, { backgroundColor: `${c.primary}20` }]}>
        <MaterialIcons name="emoji-events" size={56} color={c.primary} />
      </View>
      <Text style={[styles.title, { color: c.foreground }]}>¡Reto completado!</Text>
      <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
        Felicidades, terminaste <Text style={{ fontWeight: '600' }}>{data.challenge_title}</Text>
      </Text>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: `${c.primary}15`, borderColor: c.primary }]}>
          <Text style={[styles.statValue, { color: c.primary }]}>{data.duration_days}</Text>
          <Text style={[styles.statLabel, { color: c.mutedForeground }]}>Días completados</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: `${c.primary}15`, borderColor: c.primary }]}>
          <Text style={[styles.statValue, { color: c.primary }]}>{data.total_points}</Text>
          <Text style={[styles.statLabel, { color: c.mutedForeground }]}>Puntos totales</Text>
        </View>
      </View>

      <Text style={[styles.hint, { color: c.mutedForeground }]}>
        Tu dedicación y constancia te llevaron hasta la meta. Comparte tu logro o explora más retos.
      </Text>

      <View style={styles.actions}>
        <Pressable onPress={handleShare} style={[styles.outlineBtn, { borderColor: c.border }]}>
          <MaterialIcons name="share" size={20} color={c.foreground} />
          <Text style={[styles.outlineBtnText, { color: c.foreground }]}>Compartir</Text>
        </Pressable>
        <Pressable onPress={handleShareWhatsApp} style={[styles.outlineBtn, { borderColor: c.border }]}>
          <MaterialIcons name="chat" size={20} color={c.foreground} />
          <Text style={[styles.outlineBtnText, { color: c.foreground }]}>WhatsApp</Text>
        </Pressable>
      </View>

      <Pressable
        onPress={handleGoToChallenge}
        style={[styles.btn, { backgroundColor: c.primary }]}>
        <Text style={[styles.btnText, { color: c.primaryForeground }]}>Ver mi reto</Text>
        <MaterialIcons name="chevron-right" size={20} color={c.primaryForeground} />
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 24, paddingBottom: 40, alignItems: 'center' },
  error: { fontSize: 16 },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 24 },
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  statValue: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 13, marginTop: 4 },
  hint: { fontSize: 14, textAlign: 'center', marginBottom: 24 },
  actions: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
  },
  outlineBtnText: { fontSize: 15, fontWeight: '600' },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 10,
    minWidth: 200,
  },
  btnText: { fontSize: 16, fontWeight: '600' },
});
