import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

type Professional = {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  profession: string | null;
  city: string | null;
  status: string | null;
  is_active: boolean | null;
};

export default function AdminProfessionalsIndexScreen() {
  const [list, setList] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data, error } = await supabase
        .from('professional_applications')
        .select('id, user_id, first_name, last_name, profession, city, status, is_active')
        .eq('status', 'approved')
        .order('first_name');
      if (error) throw error;
      setList(data ?? []);
    } catch (e) {
      console.error('Professionals load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, []);

  const filtered = search.trim()
    ? list.filter(
        (p) =>
          `${p.first_name ?? ''} ${p.last_name ?? ''} ${p.profession ?? ''}`.toLowerCase().includes(search.toLowerCase())
      )
    : list;

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
        <Text style={[styles.label, { color: c.mutedForeground }]}>Total profesionales aprobados</Text>
        <Text style={[styles.value, { color: c.foreground }]}>{list.length}</Text>
      </View>
      <TextInput
        style={[styles.input, { backgroundColor: c.card, color: c.foreground, borderColor: c.border }]}
        placeholder="Buscar por nombre o profesión"
        placeholderTextColor={c.mutedForeground}
        value={search}
        onChangeText={setSearch}
      />
      {filtered.map((p) => (
        <Pressable
          key={p.id}
          onPress={() => (router as any).push(`/(admin)/professionals/${p.id}`)}
          style={({ pressed }) => [
            styles.row,
            { backgroundColor: c.card },
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.rowContent}>
            <Text style={[styles.rowTitle, { color: c.foreground }]}>
              {[p.first_name, p.last_name].filter(Boolean).join(' ') || 'Sin nombre'}
            </Text>
            <Text style={[styles.rowMeta, { color: c.mutedForeground }]}>
              {p.profession ?? '—'} · {p.city ?? '—'}
            </Text>
            <View style={styles.badgeRow}>
              <Text style={[styles.badge, p.is_active ? { color: c.primary } : { color: c.mutedForeground }]}>
                {p.is_active ? 'Activo' : 'Inactivo'}
              </Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={c.mutedForeground} />
        </Pressable>
      ))}
      {filtered.length === 0 && (
        <Text style={[styles.empty, { color: c.mutedForeground }]}>
          {search ? 'Sin resultados' : 'No hay profesionales'}
        </Text>
      )}
      <View style={styles.bottomPad} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { padding: 16, borderRadius: 12, marginBottom: 12 },
  label: { fontSize: 12, marginBottom: 4 },
  value: { fontSize: 24, fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  pressed: { opacity: 0.8 },
  rowContent: { flex: 1 },
  rowTitle: { fontSize: 16, fontWeight: '600' },
  rowMeta: { fontSize: 12, marginTop: 2 },
  badgeRow: { marginTop: 6 },
  badge: { fontSize: 12, fontWeight: '600' },
  empty: { textAlign: 'center', padding: 24 },
  bottomPad: { height: 24 },
});
