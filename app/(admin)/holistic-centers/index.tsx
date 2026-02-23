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

type Center = {
  id: string;
  name: string | null;
  is_active: boolean | null;
  city: string | null;
  created_at: string | null;
};

export default function AdminHolisticCentersIndexScreen() {
  const [list, setList] = useState<Center[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data, error } = await supabase
        .from('holistic_centers')
        .select('id, name, is_active, city, created_at')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      setList(data ?? []);
    } catch (e) {
      console.error('Holistic centers load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, []);

  const active = list.filter((x) => x.is_active).length;

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
      <View style={[styles.card, { backgroundColor: c.card }]}>
        <Text style={[styles.label, { color: c.mutedForeground }]}>Total · Activos</Text>
        <Text style={[styles.value, { color: c.foreground }]}>{list.length} · {active}</Text>
      </View>
      {list.map((x) => (
        <Pressable
          key={x.id}
          onPress={() => (router as any).push(`/(admin)/holistic-centers/${x.id}`)}
          style={({ pressed }) => [styles.row, { backgroundColor: c.card }, pressed && styles.pressed]}
        >
          <Text style={[styles.rowTitle, { color: c.foreground }]}>{x.name ?? 'Sin nombre'}</Text>
          <Text style={[styles.rowMeta, { color: c.mutedForeground }]}>
            {x.city ?? '—'} · {x.is_active ? 'Activo' : 'Inactivo'}
          </Text>
        </Pressable>
      ))}
      {list.length === 0 && (
        <Text style={[styles.empty, { color: c.mutedForeground }]}>No hay centros holísticos</Text>
      )}
      <View style={styles.bottomPad} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { padding: 16, borderRadius: 12, marginBottom: 16 },
  label: { fontSize: 12, marginBottom: 4 },
  value: { fontSize: 24, fontWeight: '700' },
  row: { padding: 14, borderRadius: 12, marginBottom: 8 },
  rowTitle: { fontSize: 16, fontWeight: '600' },
  rowMeta: { fontSize: 12, marginTop: 4 },
  empty: { textAlign: 'center', padding: 24 },
  bottomPad: { height: 24 },
  pressed: { opacity: 0.8 },
});
