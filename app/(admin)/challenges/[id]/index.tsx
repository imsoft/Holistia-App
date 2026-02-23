import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, Image, RefreshControl } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

type Challenge = {
  id: string;
  title: string;
  description?: string;
  duration_days?: number;
  difficulty_level?: string;
  price?: number;
  is_active: boolean;
  cover_image_url?: string;
};

function formatPrice(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
}

const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
  expert: 'Experto',
};

export default function ChallengeDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id as string;
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!id) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data, error } = await supabase.from('challenges').select('id, title, description, duration_days, difficulty_level, price, is_active, cover_image_url').eq('id', id).single();
      if (error || !data) {
        setChallenge(null);
        return;
      }
      setChallenge(data as Challenge);
    } catch (e) {
      console.error('Load challenge error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !challenge) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }
  if (!challenge) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Text style={[styles.muted, { color: c.mutedForeground }]}>Reto no encontrado</Text>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: c.primary }]}>
          <Text style={[styles.backBtnText, { color: c.primaryForeground }]}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  const img = challenge.cover_image_url;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.primary} />}
    >
      {img ? <Image source={{ uri: img }} style={styles.hero} resizeMode="cover" /> : null}
      <View style={[styles.card, { backgroundColor: c.card }]}>
        <Text style={[styles.title, { color: c.foreground }]}>{challenge.title}</Text>
        <View style={styles.badges}>
          <View style={[styles.badge, challenge.is_active ? { backgroundColor: '#16a34a20' } : { backgroundColor: '#6b728020' }]}>
            <Text style={[styles.badgeText, { color: challenge.is_active ? '#16a34a' : '#6b7280' }]}>{challenge.is_active ? 'Activo' : 'Inactivo'}</Text>
          </View>
          {challenge.duration_days ? (
            <View style={[styles.badge, { backgroundColor: c.border }]}>
              <Text style={[styles.badgeText, { color: c.foreground }]}>{challenge.duration_days} días</Text>
            </View>
          ) : null}
          {challenge.price != null && challenge.price > 0 ? (
            <View style={[styles.badge, { backgroundColor: c.border }]}>
              <Text style={[styles.badgeText, { color: c.foreground }]}>{formatPrice(challenge.price)}</Text>
            </View>
          ) : (
            <View style={[styles.badge, { backgroundColor: c.border }]}>
              <Text style={[styles.badgeText, { color: c.foreground }]}>Gratis</Text>
            </View>
          )}
          {challenge.difficulty_level ? (
            <View style={[styles.badge, { backgroundColor: c.border }]}>
              <Text style={[styles.badgeText, { color: c.foreground }]}>{DIFFICULTY_LABELS[challenge.difficulty_level] || challenge.difficulty_level}</Text>
            </View>
          ) : null}
        </View>
        {challenge.description ? (
          <Text style={[styles.desc, { color: c.mutedForeground }]} numberOfLines={10}>{challenge.description}</Text>
        ) : null}
        <Pressable
          onPress={() => (router as any).push(`/(admin)/challenges/${id}/edit`)}
          style={({ pressed }) => [styles.editBtn, { backgroundColor: c.primary }, pressed && styles.pressed]}
        >
          <MaterialIcons name="edit" size={20} color={c.primaryForeground} />
          <Text style={[styles.editBtnText, { color: c.primaryForeground }]}>Editar reto</Text>
        </Pressable>
      </View>
      <View style={styles.bottomPad} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  hero: { width: '100%', height: 160, backgroundColor: '#e5e7eb' },
  card: { margin: 16, padding: 16, borderRadius: 12 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  badgeText: { fontSize: 14, fontWeight: '600' },
  desc: { fontSize: 15, lineHeight: 22 },
  editBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 10, marginTop: 20 },
  editBtnText: { fontSize: 16, fontWeight: '600' },
  pressed: { opacity: 0.8 },
  backBtn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
  backBtnText: { fontSize: 16, fontWeight: '600' },
  muted: { fontSize: 15 },
  bottomPad: { height: 24 },
});
