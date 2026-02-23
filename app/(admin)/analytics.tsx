import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/stores/auth-store';
import { adminApiJson } from '@/lib/admin-api';

type AnalyticsData = {
  monthlyData?: { month: string; appointments?: number; revenue?: number }[];
  topProfessionals?: { id: string; name: string; count: number }[];
  topPatients?: { id: string; name: string; count: number }[];
  revenue?: number;
  [key: string]: unknown;
};

export default function AdminAnalyticsScreen() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const session = useAuthStore((s) => s.session);
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await adminApiJson<AnalyticsData>('/api/admin/analytics', session);
      setData(res);
    } catch (e) {
      console.error('Analytics load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session]);

  useEffect(() => {
    load();
  }, []);

  if (loading && !data) {
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
      {data?.revenue != null && (
        <View style={[styles.card, { backgroundColor: c.card }]}>
          <Text style={[styles.label, { color: c.mutedForeground }]}>Ingresos (total)</Text>
          <Text style={[styles.value, { color: c.foreground }]}>
            ${Number(data.revenue).toLocaleString()}
          </Text>
        </View>
      )}
      {data?.monthlyData && data.monthlyData.length > 0 && (
        <View style={[styles.card, { backgroundColor: c.card }]}>
          <Text style={[styles.sectionTitle, { color: c.foreground }]}>Por mes</Text>
          {data.monthlyData.slice(-6).map((row, i) => (
            <View key={i} style={styles.row}>
              <Text style={[styles.rowText, { color: c.foreground }]}>{row.month}</Text>
              <Text style={[styles.rowText, { color: c.mutedForeground }]}>
                Citas: {row.appointments ?? 0} · ${Number(row.revenue ?? 0).toLocaleString()}
              </Text>
            </View>
          ))}
        </View>
      )}
      {data?.topProfessionals && data.topProfessionals.length > 0 && (
        <View style={[styles.card, { backgroundColor: c.card }]}>
          <Text style={[styles.sectionTitle, { color: c.foreground }]}>Top profesionales</Text>
          {data.topProfessionals.slice(0, 5).map((p, i) => (
            <View key={p.id} style={styles.row}>
              <Text style={[styles.rowText, { color: c.foreground }]}>{p.name}</Text>
              <Text style={[styles.rowText, { color: c.mutedForeground }]}>{p.count} citas</Text>
            </View>
          ))}
        </View>
      )}
      {!data && !loading && (
        <Text style={[styles.empty, { color: c.mutedForeground }]}>Sin datos de analíticas</Text>
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
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  rowText: { fontSize: 14 },
  empty: { textAlign: 'center', padding: 24 },
  bottomPad: { height: 24 },
});
