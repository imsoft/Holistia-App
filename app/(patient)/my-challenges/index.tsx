import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { useAuthStore } from '@/stores/auth-store';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { EmptyState } from '@/components/ui/empty-state';

export default function MyChallengesScreen() {
  const session = useAuthStore((s) => s.session);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const colorScheme = useColorScheme();
  const c = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const load = useCallback(async (isRefresh = false) => {
    if (!session?.user?.id) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data } = await supabase
        .from('challenge_purchases')
        .select(
          `id, days_completed, access_granted, created_at,
           challenges(id, title, cover_image_url, duration_days, difficulty_level)`
        )
        .eq('participant_id', session.user.id)
        .eq('access_granted', true)
        .order('created_at', { ascending: false });
      setChallenges(data || []);
    } catch (e) {
      console.error('My challenges error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (session) load();
  }, [session?.user?.id]);

  const renderItem = ({ item }: { item: any }) => {
    const ch = Array.isArray(item.challenges) ? item.challenges[0] : item.challenges || {};
    return (
      <Pressable
        onPress={() => router.push(`/(patient)/my-challenges/${item.id}` as any)}
        style={({ pressed }) => [styles.card, { backgroundColor: c.card, borderColor: c.border }, pressed && styles.pressed]}>
        {ch.cover_image_url ? (
          <Image source={{ uri: ch.cover_image_url }} style={styles.cover} contentFit="cover" />
        ) : (
          <View style={[styles.cover, { backgroundColor: c.muted }]} />
        )}
        <Text style={[styles.title, { color: c.foreground }]} numberOfLines={2}>{ch.title || 'Reto'}</Text>
        <Text style={[styles.metaText, { color: c.mutedForeground }]}>
          {item.days_completed ?? 0} / {ch.duration_days ?? '?'} días
        </Text>
      </Pressable>
    );
  };

  if (loading && challenges.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={[styles.header, { borderColor: c.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: c.foreground }]}>Mis retos</Text>
          <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
            Gestiona tus retos y check-ins diarios
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/(patient)/my-challenges/new' as any)}
          style={[styles.createBtn, { backgroundColor: c.primary }]}>
          <Text style={styles.createBtnText}>Crear reto</Text>
        </Pressable>
      </View>
      <FlatList
        data={challenges}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.primary} />}
        ListEmptyComponent={
          <EmptyState
            icon="local-fire-department"
            title="No has adquirido retos aún"
            subtitle="Crea tu propio reto personal o explora retos de profesionales."
            actionLabel="Explorar retos"
            onAction={() => router.push('/(patient)/challenges' as any)}
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

MyChallengesScreen.options = { title: 'Mis retos' };

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 13, marginTop: 2 },
  createBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
  createBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  list: { padding: 20, paddingBottom: 40 },
  card: { borderRadius: 12, borderWidth: 1, marginBottom: 12, overflow: 'hidden' },
  pressed: { opacity: 0.9 },
  cover: { height: 120, width: '100%' },
  title: { fontSize: 16, fontWeight: '600', padding: 12 },
  meta: { paddingHorizontal: 12, paddingBottom: 12 },
  metaText: { fontSize: 13 },
  author: { fontSize: 12, marginTop: 2 },
});
