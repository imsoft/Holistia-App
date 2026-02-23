import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { useProfessionalStore } from '@/stores/professional-store';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { EmptyState } from '@/components/ui/empty-state';

export default function ExpertChallengesScreen() {
  const professional = useProfessionalStore((s) => s.professional);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const load = useCallback(async (isRefresh = false) => {
    if (!professional) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data } = await supabase
        .from('challenges')
        .select('*')
        .eq('created_by_user_id', professional.user_id)
        .eq('created_by_type', 'professional')
        .order('created_at', { ascending: false });
      setChallenges(data || []);
    } catch (e) {
      console.error('Challenges load:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [professional?.id, professional?.user_id]);

  useEffect(() => {
    if (professional) load();
  }, [professional?.id]);

  if (loading && challenges.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.push('/(expert)/challenges/participants' as any)}
          style={({ pressed }) => [styles.headerBtn, { borderColor: c.border }, pressed && { opacity: 0.8 }]}>
          <Text style={[styles.headerBtnText, { color: c.foreground }]}>Participantes</Text>
        </Pressable>
        <Button
          title="Nuevo reto"
          onPress={() => router.push('/challenges/new')}
          variant="primary"
        />
      </View>
      <FlatList
        data={challenges}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.primary} />
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/challenges/${item.id}/edit`)}
            style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}
          >
            {item.cover_image_url ? (
              <Image source={{ uri: item.cover_image_url }} style={styles.cover} contentFit="cover" />
            ) : (
              <View style={[styles.cover, { backgroundColor: c.muted }]} />
            )}
            <Text style={[styles.name, { color: c.foreground }]}>{item.title || 'Reto'}</Text>
            <Text style={[styles.meta, { color: c.mutedForeground }]}>
              {item.duration_days} días · {item.is_public ? 'Público' : 'Privado'}
            </Text>
            <View style={styles.cardActions}>
              <Pressable
                onPress={() => router.push(`/challenges/${item.id}/edit`)}
                style={({ pressed }) => [styles.cardBtn, pressed && { opacity: 0.8 }]}>
                <Text style={[styles.cardBtnText, { color: c.primary }]}>Editar</Text>
              </Pressable>
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  router.push(`/challenges/${item.id}/progress` as any);
                }}
                style={({ pressed }) => [styles.cardBtn, pressed && { opacity: 0.8 }]}>
                <Text style={[styles.cardBtnText, { color: c.primary }]}>Progreso</Text>
              </Pressable>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="local-fire-department"
            title="No tienes retos"
            subtitle="Crea retos para que los pacientes alcancen sus metas."
            actionLabel="Crear reto"
            onAction={() => router.push('/challenges/new')}
            iconColor={c.mutedForeground}
            titleColor={c.foreground}
            subtitleColor={c.mutedForeground}
            buttonBgColor={c.primary}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20, paddingBottom: 12 },
  headerBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1 },
  headerBtnText: { fontSize: 15, fontWeight: '600' },
  list: { padding: 20, paddingTop: 0 },
  card: { borderRadius: 12, borderWidth: 1, marginBottom: 12, overflow: 'hidden' },
  cover: { height: 100, width: '100%' },
  name: { fontSize: 16, fontWeight: '600', padding: 12 },
  meta: { fontSize: 13, paddingHorizontal: 12 },
  cardActions: { flexDirection: 'row', gap: 16, padding: 12, paddingTop: 8 },
  cardBtn: { paddingVertical: 4 },
  cardBtnText: { fontSize: 14, fontWeight: '600' },
});
