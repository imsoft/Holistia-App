import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

type Challenge = {
  id: string;
  title: string | null;
  is_active: boolean | null;
  duration_days: number | null;
  price: number | null;
  created_at: string | null;
};

function formatPrice(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
}

export default function AdminChallengesIndexScreen() {
  const [list, setList] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data, error } = await supabase
        .from('challenges')
        .select('id, title, is_active, duration_days, price, created_at')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      setList(data ?? []);
    } catch (e) {
      console.error('Challenges load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, []);

  const active = list.filter((ch) => ch.is_active).length;

  if (loading && list.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.primary} />
      }
    >
      <View style={styles.headerRow}>
        <View style={[styles.card, { backgroundColor: c.card }]}>
          <Text style={[styles.label, { color: c.mutedForeground }]}>Total · Activos</Text>
          <Text style={[styles.value, { color: c.foreground }]}>{list.length} · {active}</Text>
        </View>
        <Pressable
          onPress={() => (router as any).push('/(admin)/challenges/new')}
          style={({ pressed }) => [styles.newBtn, { backgroundColor: c.primary }, pressed && styles.pressed]}
        >
          <MaterialIcons name="add" size={24} color={c.primaryForeground} />
          <Text style={[styles.newBtnText, { color: c.primaryForeground }]}>Nuevo</Text>
        </Pressable>
      </View>
      {list.map((ch) => (
        <Pressable
          key={ch.id}
          onPress={() => (router as any).push(`/(admin)/challenges/${ch.id}`)}
          style={({ pressed }) => [styles.row, { backgroundColor: c.card }, pressed && styles.pressed]}
        >
          <View style={styles.rowContent}>
            <Text style={[styles.rowTitle, { color: c.foreground }]} numberOfLines={2}>
              {ch.title ?? 'Sin título'}
            </Text>
            <Text style={[styles.rowMeta, { color: c.mutedForeground }]}>
              {ch.duration_days ? `${ch.duration_days} días` : '—'} ·{' '}
              {ch.price != null ? formatPrice(ch.price) : 'Gratis'} ·{' '}
              {ch.created_at ? new Date(ch.created_at).toLocaleDateString() : '—'}
            </Text>
            <Text style={[styles.badge, ch.is_active ? { color: c.primary } : { color: c.mutedForeground }]}>
              {ch.is_active ? 'Activo' : 'Inactivo'}
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={c.mutedForeground} />
        </Pressable>
      ))}
      {list.length === 0 && (
        <Text style={[styles.empty, { color: c.mutedForeground }]}>No hay retos</Text>
      )}
      <View style={styles.bottomPad} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12 },
  card: { flex: 1, padding: 16, borderRadius: 12 },
  label: { fontSize: 12, marginBottom: 4 },
  value: { fontSize: 24, fontWeight: '700' },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12 },
  newBtnText: { fontSize: 16, fontWeight: '600' },
  pressed: { opacity: 0.8 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 8 },
  rowContent: { flex: 1 },
  rowTitle: { fontSize: 16, fontWeight: '600' },
  rowMeta: { fontSize: 12, marginTop: 2 },
  badge: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  empty: { textAlign: 'center', padding: 24 },
  bottomPad: { height: 24 },
});
