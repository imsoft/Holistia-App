import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useProfessionalStore } from '@/stores/professional-store';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { fetchDashboardData } from '@/lib/dashboard-data';
import type { AppointmentForDashboard, DashboardStats, MonthlyMetrics } from '@/lib/dashboard-data';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function ExpertDashboardScreen() {
  const professional = useProfessionalStore((s) => s.professional);
  const [data, setData] = useState<{
    appointments: AppointmentForDashboard[];
    stats: DashboardStats;
    monthlyMetrics: MonthlyMetrics;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const colorScheme = useColorScheme();
  const c = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const load = useCallback(async (isRefresh = false) => {
    if (!professional) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const d = await fetchDashboardData(professional.id, professional.user_id);
      setData(d);
    } catch (e) {
      console.error('Dashboard load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [professional?.id, professional?.user_id]);

  useEffect(() => {
    if (professional) load();
  }, [professional?.id]);

  if (loading && !data) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  const stats = data?.stats;
  const monthly = data?.monthlyMetrics;
  const appointments = data?.appointments || [];

  const statusLabel: Record<string, string> = {
    confirmed: 'Confirmada',
    pending: 'Pendiente',
    cancelled: 'Cancelada',
    completed: 'Completada',
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.primary} />
      }>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.foreground }]}>Dashboard</Text>
        <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
          Hola, {professional?.first_name} {professional?.last_name}
        </Text>
      </View>

      {monthly && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.foreground }]}>Este mes</Text>
          <View style={styles.metricsRow}>
            <View style={[styles.metricCard, { backgroundColor: c.card, borderColor: c.border }]}>
              <IconSymbol name="bell.fill" size={24} color={c.primary} />
              <Text style={[styles.metricValue, { color: c.foreground }]}>{monthly.profileViews}</Text>
              <Text style={[styles.metricLabel, { color: c.mutedForeground }]}>Visitas al perfil</Text>
            </View>
            <View style={[styles.metricCard, { backgroundColor: c.card, borderColor: c.border }]}>
              <IconSymbol name="calendar" size={24} color={c.primary} />
              <Text style={[styles.metricValue, { color: c.foreground }]}>{monthly.bookings}</Text>
              <Text style={[styles.metricLabel, { color: c.mutedForeground }]}>Citas reservadas</Text>
            </View>
            <View style={[styles.metricCard, { backgroundColor: c.card, borderColor: c.border }]}>
              <IconSymbol name="heart.fill" size={24} color={c.primary} />
              <Text style={[styles.metricValue, { color: c.foreground }]}>
                ${monthly.income.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </Text>
              <Text style={[styles.metricLabel, { color: c.mutedForeground }]}>Ingresos</Text>
            </View>
          </View>
        </View>
      )}

      {stats && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.foreground }]}>Resumen</Text>
          <View style={[styles.statsCard, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={styles.statRow}>
              <Text style={[styles.statLabel, { color: c.mutedForeground }]}>Citas próximas</Text>
              <Text style={[styles.statValue, { color: c.foreground }]}>{stats.upcomingCount}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={[styles.statLabel, { color: c.mutedForeground }]}>Pacientes activos</Text>
              <Text style={[styles.statValue, { color: c.foreground }]}>{stats.activePatients}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={[styles.statLabel, { color: c.mutedForeground }]}>Ingresos totales</Text>
              <Text style={[styles.statValue, { color: c.foreground }]}>
                ${stats.totalRevenue.toLocaleString('es-MX', { minimumFractionDigits: 0 })}
              </Text>
            </View>
            <View style={styles.statRow}>
              <Text style={[styles.statLabel, { color: c.mutedForeground }]}>Servicios</Text>
              <Text style={[styles.statValue, { color: c.foreground }]}>{stats.servicesCount}</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={[styles.statLabel, { color: c.mutedForeground }]}>Retos</Text>
              <Text style={[styles.statValue, { color: c.foreground }]}>{stats.challengesCount}</Text>
            </View>
            <View style={[styles.statRow, { borderBottomWidth: 0 }]}>
              <Text style={[styles.statLabel, { color: c.mutedForeground }]}>Programas</Text>
              <Text style={[styles.statValue, { color: c.foreground }]}>{stats.digitalProductsCount}</Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: c.foreground }]}>Próximas citas</Text>
          <Pressable onPress={() => (router as any).push('/(expert)/(tabs)/appointments')}>
            <Text style={[styles.seeAll, { color: c.primary }]}>Ver todas</Text>
          </Pressable>
        </View>
        {appointments.length === 0 ? (
          <Text style={[styles.empty, { color: c.mutedForeground }]}>No hay citas próximas</Text>
        ) : (
          appointments.map((apt) => (
            <View
              key={apt.id}
              style={[styles.aptCard, { backgroundColor: c.card, borderColor: c.border }]}>
              <Text style={[styles.aptPatient, { color: c.foreground }]}>{apt.patient.name}</Text>
              <Text style={[styles.aptMeta, { color: c.mutedForeground }]}>
                {apt.date} · {apt.time} · {apt.type}
              </Text>
              <Text style={[styles.aptStatus, { color: c.primary }]}>
                {statusLabel[apt.status] || apt.status}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 15, marginTop: 4 },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '600' },
  seeAll: { fontSize: 14, fontWeight: '600' },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metricCard: {
    flex: 1,
    minWidth: '30%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  metricValue: { fontSize: 20, fontWeight: '700' },
  metricLabel: { fontSize: 12 },
  statsCard: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  statLabel: { fontSize: 15 },
  statValue: { fontSize: 16, fontWeight: '600' },
  aptCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  aptPatient: { fontSize: 16, fontWeight: '600' },
  aptMeta: { fontSize: 13, marginTop: 4 },
  aptStatus: { fontSize: 12, marginTop: 6, fontWeight: '600' },
  empty: { fontSize: 15 },
});
