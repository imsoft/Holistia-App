import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { useProfessionalStore } from '@/stores/professional-store';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ExpertCotizacionesScreen() {
  const professional = useProfessionalStore((s) => s.professional);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const load = useCallback(async (isRefresh = false) => {
    if (!professional) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data } = await supabase
        .from('payments')
        .select('id, amount, transfer_amount, status, created_at, description')
        .eq('professional_id', professional.id)
        .eq('payment_type', 'quote_service')
        .order('created_at', { ascending: false });
      setPayments(data || []);
    } catch (e) {
      console.error('Cotizaciones load:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [professional?.id]);

  useEffect(() => {
    if (professional) load();
  }, [professional?.id]);

  if (loading && payments.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <FlatList
        data={payments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.primary} />
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.amount, { color: c.foreground }]}>
              ${(item.transfer_amount ?? item.amount ?? 0).toLocaleString('es-MX')}
            </Text>
            <Text style={[styles.meta, { color: c.mutedForeground }]} numberOfLines={1}>
              {item.description || 'Cotización'}
            </Text>
            <Text style={[styles.date, { color: c.mutedForeground }]}>
              {new Date(item.created_at).toLocaleDateString('es-MX')}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: c.mutedForeground }]}>No hay pagos por cotización</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 20 },
  card: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  amount: { fontSize: 18, fontWeight: '700' },
  meta: { fontSize: 14, marginTop: 4 },
  date: { fontSize: 12, marginTop: 4 },
  empty: { fontSize: 16, textAlign: 'center', marginTop: 24 },
});
