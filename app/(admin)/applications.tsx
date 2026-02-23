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
  Alert,
} from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/stores/auth-store';
import { supabase } from '@/lib/supabase';
import { adminApiFetch } from '@/lib/admin-api';

type Application = {
  id: string;
  user_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  profession: string | null;
  status: string | null;
  submitted_at: string | null;
};

export default function AdminApplicationsScreen() {
  const [list, setList] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [actionId, setActionId] = useState<string | null>(null);
  const session = useAuthStore((s) => s.session);
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      let q = supabase
        .from('professional_applications')
        .select('id, user_id, first_name, last_name, email, profession, status, submitted_at')
        .order('submitted_at', { ascending: false })
        .limit(200);
      if (statusFilter !== 'all') {
        q = q.eq('status', statusFilter);
      }
      const { data, error } = await q;
      if (error) throw error;
      setList(data ?? []);
    } catch (e) {
      console.error('Applications load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [statusFilter]);

  const sendDecision = async (app: Application, decision: 'approved' | 'rejected') => {
    setActionId(app.id);
    try {
      const res = await adminApiFetch('/api/admin/send-application-decision', session, {
        method: 'POST',
        body: JSON.stringify({
          status: decision,
          professional_name: [app.first_name, app.last_name].filter(Boolean).join(' ') || 'Profesional',
          professional_email: app.email ?? '',
          profession: app.profession ?? '',
          review_notes: '',
          dashboard_url: 'https://www.holistia.io',
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      await load(true);
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setActionId(null);
    }
  };

  const filtered = search.trim()
    ? list.filter(
        (a) =>
          `${a.first_name ?? ''} ${a.last_name ?? ''} ${a.email ?? ''} ${a.profession ?? ''}`
            .toLowerCase()
            .includes(search.toLowerCase())
      )
    : list;

  const pending = list.filter((a) => a.status === 'pending' || a.status === 'under_review').length;
  const approved = list.filter((a) => a.status === 'approved').length;
  const rejected = list.filter((a) => a.status === 'rejected').length;

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
        <Text style={[styles.label, { color: c.mutedForeground }]}>Pendientes · Aprobadas · Rechazadas</Text>
        <Text style={[styles.value, { color: c.foreground }]}>
          {pending} · {approved} · {rejected}
        </Text>
      </View>
      <View style={styles.filterRow}>
        {(['all', 'pending', 'approved', 'rejected'] as const).map((s) => (
          <Pressable
            key={s}
            style={[
              styles.filterBtn,
              { backgroundColor: statusFilter === s ? c.primary : c.card },
            ]}
            onPress={() => setStatusFilter(s)}
          >
            <Text style={[styles.filterBtnText, { color: statusFilter === s ? c.primaryForeground : c.foreground }]}>
              {s === 'all' ? 'Todas' : s === 'pending' ? 'Pendientes' : s === 'approved' ? 'Aprobadas' : 'Rechazadas'}
            </Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        style={[styles.input, { backgroundColor: c.card, color: c.foreground, borderColor: c.border }]}
        placeholder="Buscar"
        placeholderTextColor={c.mutedForeground}
        value={search}
        onChangeText={setSearch}
      />
      {filtered.map((a) => (
        <View key={a.id} style={[styles.row, { backgroundColor: c.card }]}>
          <Text style={[styles.rowTitle, { color: c.foreground }]}>
            {[a.first_name, a.last_name].filter(Boolean).join(' ') || 'Sin nombre'}
          </Text>
          <Text style={[styles.rowMeta, { color: c.mutedForeground }]}>
            {a.profession ?? '—'} · {a.status ?? '—'}
          </Text>
          {(a.status === 'pending' || a.status === 'under_review') && (
            <View style={styles.actions}>
              <Pressable
                style={[styles.actionBtn, { backgroundColor: c.primary }]}
                onPress={() => sendDecision(a, 'approved')}
                disabled={actionId === a.id}
              >
                <Text style={[styles.actionBtnText, { color: c.primaryForeground }]}>Aprobar</Text>
              </Pressable>
              <Pressable
                style={[styles.actionBtn, { backgroundColor: c.destructive }]}
                onPress={() => sendDecision(a, 'rejected')}
                disabled={actionId === a.id}
              >
                <Text style={[styles.actionBtnText, { color: c.primaryForeground }]}>Rechazar</Text>
              </Pressable>
            </View>
          )}
        </View>
      ))}
      {filtered.length === 0 && (
        <Text style={[styles.empty, { color: c.mutedForeground }]}>
          {search ? 'Sin resultados' : 'No hay solicitudes'}
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
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  filterBtnText: { fontSize: 14, fontWeight: '600' },
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
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  actionBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  empty: { textAlign: 'center', padding: 24 },
  bottomPad: { height: 24 },
});
