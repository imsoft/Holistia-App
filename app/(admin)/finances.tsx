import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

type PaymentRow = {
  id: string;
  amount?: number;
  status?: string;
  created_at?: string;
  appointment_id?: string;
};

export default function AdminFinancesScreen() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState<number>(0);
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data: list, error } = await supabase
        .from('payments')
        .select('id, amount, status, created_at, appointment_id')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      setPayments(list ?? []);
      const sum = (list ?? []).reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
      setTotal(sum);
    } catch (e) {
      console.error('Finances load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, []);

  if (loading && payments.length === 0) {
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
        <Text style={[styles.label, { color: c.mutedForeground }]}>Total (últimos 100 pagos)</Text>
        <Text style={[styles.value, { color: c.foreground }]}>
          ${total.toLocaleString()}
        </Text>
      </View>
      <Text style={[styles.sectionTitle, { color: c.foreground }]}>Transacciones recientes</Text>
      {payments.map((p) => (
        <View key={p.id} style={[styles.row, { backgroundColor: c.card }]}>
          <View>
            <Text style={[styles.rowAmount, { color: c.foreground }]}>
              ${Number(p.amount ?? 0).toLocaleString()}
            </Text>
            <Text style={[styles.rowMeta, { color: c.mutedForeground }]}>
              {p.status ?? '—'} · {p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}
            </Text>
          </View>
        </View>
      ))}
      {payments.length === 0 && (
        <Text style={[styles.empty, { color: c.mutedForeground }]}>No hay pagos</Text>
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
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  row: { padding: 14, borderRadius: 12, marginBottom: 8 },
  rowAmount: { fontSize: 16, fontWeight: '600' },
  rowMeta: { fontSize: 12, marginTop: 2 },
  empty: { textAlign: 'center', padding: 24 },
  bottomPad: { height: 24 },
});
