import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

type Registration = {
  id: string;
  user_id: string;
  status: string;
  confirmation_code: string;
  registration_date: string;
  user_name?: string;
  user_email?: string;
  amount?: number;
};

function formatPrice(n: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
}

function formatDate(s: string): string {
  return new Date(s).toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

const STATUS_LABELS: Record<string, string> = {
  confirmed: 'Confirmado',
  pending: 'Pendiente',
  cancelled: 'Cancelado',
  completed: 'Completado',
};

const STATUS_COLORS: Record<string, string> = {
  confirmed: '#16a34a',
  pending: '#eab308',
  cancelled: '#dc2626',
  completed: '#6b7280',
};

export default function EventRegistrationsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const [eventName, setEventName] = useState('');
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!id) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data: eventData } = await supabase
        .from('events_workshops')
        .select('name')
        .eq('id', id)
        .single();
      setEventName((eventData as { name?: string })?.name ?? '');

      const { data: regs, error } = await supabase
        .from('event_registrations')
        .select('id, user_id, status, confirmation_code, registration_date')
        .eq('event_id', id)
        .order('registration_date', { ascending: false });

      if (error) throw error;

      const userIds = [...new Set((regs || []).map((r: { user_id: string }) => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .in('id', userIds);
      const profileMap = new Map(
        (profiles || []).map((p: { id: string; email?: string; first_name?: string; last_name?: string }) => [
          p.id,
          {
            name: p.first_name && p.last_name ? `${p.first_name} ${p.last_name}`.trim() : p.email,
            email: p.email,
          },
        ])
      );

      const regIds = (regs || []).map((r: { id: string }) => r.id);
      const { data: payments } = await supabase
        .from('payments')
        .select('event_registration_id, amount')
        .in('event_registration_id', regIds);
      const paymentMap = new Map(
        (payments || []).map((p: { event_registration_id: string; amount: number }) => [
          p.event_registration_id,
          p.amount,
        ])
      );

      const list: Registration[] = (regs || []).map((r: any) => ({
        ...r,
        user_name: profileMap.get(r.user_id)?.name ?? r.user_id,
        user_email: profileMap.get(r.user_id)?.email,
        amount: paymentMap.get(r.id),
      }));
      setRegistrations(list);
    } catch (e) {
      console.error('Load registrations error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const confirmed = registrations.filter((r) => r.status === 'confirmed').length;
  const totalRevenue = registrations
    .filter((r) => r.status === 'confirmed' && r.amount != null)
    .reduce((s, r) => s + (r.amount ?? 0), 0);

  if (loading && registrations.length === 0) {
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
      {eventName ? (
        <Text style={[styles.eventName, { color: c.foreground }]}>{eventName}</Text>
      ) : null}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: c.card }]}>
          <MaterialIcons name="people" size={24} color={c.primary} />
          <View>
            <Text style={[styles.statValue, { color: c.foreground }]}>{registrations.length}</Text>
            <Text style={[styles.statLabel, { color: c.mutedForeground }]}>Total</Text>
          </View>
        </View>
        <View style={[styles.statCard, { backgroundColor: c.card }]}>
          <MaterialIcons name="check-circle" size={24} color="#16a34a" />
          <View>
            <Text style={[styles.statValue, { color: c.foreground }]}>{confirmed}</Text>
            <Text style={[styles.statLabel, { color: c.mutedForeground }]}>Confirmados</Text>
          </View>
        </View>
        <View style={[styles.statCard, { backgroundColor: c.card }]}>
          <MaterialIcons name="attach-money" size={24} color="#16a34a" />
          <View>
            <Text style={[styles.statValue, { color: c.foreground }]}>{formatPrice(totalRevenue)}</Text>
            <Text style={[styles.statLabel, { color: c.mutedForeground }]}>Ingresos</Text>
          </View>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: c.foreground }]}>Registraciones</Text>
      {registrations.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: c.card }]}>
          <MaterialIcons name="event-busy" size={48} color={c.mutedForeground} />
          <Text style={[styles.emptyText, { color: c.mutedForeground }]}>No hay registraciones</Text>
        </View>
      ) : (
        registrations.map((r) => (
          <View key={r.id} style={[styles.regCard, { backgroundColor: c.card }]}>
            <View style={styles.regHeader}>
              <Text style={[styles.regName, { color: c.foreground }]}>{r.user_name || r.user_email}</Text>
              <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[r.status] || c.border) + '30' }]}>
                <Text style={{ color: STATUS_COLORS[r.status] || c.foreground, fontSize: 12, fontWeight: '600' }}>
                  {STATUS_LABELS[r.status] || r.status}
                </Text>
              </View>
            </View>
            {r.user_email ? (
              <Text style={[styles.regEmail, { color: c.mutedForeground }]}>{r.user_email}</Text>
            ) : null}
            <Text style={[styles.regCode, { color: c.mutedForeground }]}>
              Código: {r.confirmation_code || '—'}
            </Text>
            <Text style={[styles.regDate, { color: c.mutedForeground }]}>
              {formatDate(r.registration_date)}
            </Text>
            {r.amount != null && r.amount > 0 ? (
              <Text style={[styles.regAmount, { color: c.foreground }]}>{formatPrice(r.amount)}</Text>
            ) : null}
          </View>
        ))
      )}
      <View style={styles.bottomPad} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  eventName: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: {
    flex: 1,
    minWidth: '28%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
  },
  statValue: { fontSize: 18, fontWeight: '700' },
  statLabel: { fontSize: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  emptyCard: {
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: { fontSize: 15 },
  regCard: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  regHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  regName: { fontSize: 16, fontWeight: '600', flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  regEmail: { fontSize: 14, marginTop: 4 },
  regCode: { fontSize: 13, marginTop: 4 },
  regDate: { fontSize: 13, marginTop: 2 },
  regAmount: { fontSize: 14, fontWeight: '600', marginTop: 6 },
  bottomPad: { height: 24 },
});
