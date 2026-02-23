import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

type CompanyLead = {
  id: string;
  company_name: string | null;
  contact_name: string | null;
  email: string | null;
  status: string | null;
  created_at: string | null;
};

export default function AdminCompaniesScreen() {
  const [list, setList] = useState<CompanyLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data, error } = await supabase
        .from('company_leads')
        .select('id, company_name, contact_name, email, status, created_at')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      setList(data ?? []);
    } catch (e) {
      console.error('Companies load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, []);

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
        <Text style={[styles.label, { color: c.mutedForeground }]}>Leads / Empresas</Text>
        <Text style={[styles.value, { color: c.foreground }]}>{list.length}</Text>
      </View>
      {list.map((x) => (
        <View key={x.id} style={[styles.row, { backgroundColor: c.card }]}>
          <Text style={[styles.rowTitle, { color: c.foreground }]}>
            {x.company_name ?? 'Sin nombre'}
          </Text>
          <Text style={[styles.rowMeta, { color: c.mutedForeground }]}>
            {x.contact_name ?? '—'} · {x.email ?? '—'}
          </Text>
          <Text style={[styles.badge, { color: c.primary }]}>{x.status ?? '—'}</Text>
        </View>
      ))}
      {list.length === 0 && (
        <Text style={[styles.empty, { color: c.mutedForeground }]}>No hay empresas/leads</Text>
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
  rowMeta: { fontSize: 12, marginTop: 2 },
  badge: { fontSize: 12, marginTop: 4, fontWeight: '600' },
  empty: { textAlign: 'center', padding: 24 },
  bottomPad: { height: 24 },
});
