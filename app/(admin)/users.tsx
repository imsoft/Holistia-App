import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  type: string | null;
  account_status: string | null;
  created_at: string | null;
};

export default function AdminUsersScreen() {
  const [list, setList] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, type, account_status, created_at')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      setList(data ?? []);
    } catch (e) {
      console.error('Users load error:', e);
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
        (u) =>
          `${u.first_name ?? ''} ${u.last_name ?? ''} ${u.email ?? ''}`.toLowerCase().includes(search.toLowerCase())
      )
    : list;

  const patients = list.filter((u) => u.type === 'patient').length;
  const professionals = list.filter((u) => u.type === 'professional').length;
  const admins = list.filter((u) => u.type === 'admin').length;

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
        <Text style={[styles.label, { color: c.mutedForeground }]}>Total · Pacientes · Profesionales · Admins</Text>
        <Text style={[styles.value, { color: c.foreground }]}>
          {list.length} · {patients} · {professionals} · {admins}
        </Text>
      </View>
      <TextInput
        style={[styles.input, { backgroundColor: c.card, color: c.foreground, borderColor: c.border }]}
        placeholder="Buscar por nombre o email"
        placeholderTextColor={c.mutedForeground}
        value={search}
        onChangeText={setSearch}
      />
      {filtered.map((u) => (
        <View key={u.id} style={[styles.row, { backgroundColor: c.card }]}>
          <Text style={[styles.rowTitle, { color: c.foreground }]}>
            {[u.first_name, u.last_name].filter(Boolean).join(' ') || 'Sin nombre'}
          </Text>
          <Text style={[styles.rowMeta, { color: c.mutedForeground }]} numberOfLines={1}>
            {u.email ?? '—'}
          </Text>
          <Text style={[styles.badge, { color: c.primary }]}>
            {u.type ?? '—'} · {u.account_status ?? '—'}
          </Text>
        </View>
      ))}
      {filtered.length === 0 && (
        <Text style={[styles.empty, { color: c.mutedForeground }]}>
          {search ? 'Sin resultados' : 'No hay usuarios'}
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
  value: { fontSize: 18, fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  row: { padding: 14, borderRadius: 12, marginBottom: 8 },
  rowTitle: { fontSize: 16, fontWeight: '600' },
  rowMeta: { fontSize: 12, marginTop: 2 },
  badge: { fontSize: 12, marginTop: 4, fontWeight: '600' },
  empty: { textAlign: 'center', padding: 24 },
  bottomPad: { height: 24 },
});
