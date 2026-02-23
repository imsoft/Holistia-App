import {
  useEffect,
  useState,
  useCallback,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useProfessionalStore } from '@/stores/professional-store';
import { useAuthStore } from '@/stores/auth-store';
import { supabase } from '@/lib/supabase';
import { webApiFetch } from '@/lib/web-api';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { EmptyState } from '@/components/ui/empty-state';

type Period = 'month' | 'quarter' | 'year' | 'all';

type Payment = {
  id: string;
  amount: number;
  transfer_amount: number | null;
  service_amount?: number | null;
  platform_fee?: number | null;
  status: string;
  payment_type: string | null;
  created_at: string;
  description: string | null;
};

function getPaymentTypeLabel(type: string | null): string {
  switch (type) {
    case 'appointment':
      return 'Pago de Cita';
    case 'event':
      return 'Pago de Evento';
    case 'quote_service':
      return 'Cotización';
    case 'challenge':
      return 'Reto';
    case 'digital_product':
      return 'Programa digital';
    default:
      return 'Pago';
  }
}

function getAmount(p: Payment): number {
  let amount = Number(p.transfer_amount) ?? 0;
  if (amount === 0 && p.service_amount != null) {
    const serviceAmount = Number(p.service_amount) ?? 0;
    const platformFee = Number(p.platform_fee) ?? 0;
    amount = serviceAmount - platformFee;
  }
  if (amount === 0) amount = Number(p.amount) ?? 0;
  return amount;
}

function getDateRange(period: Period): { start: Date; end: Date } {
  const end = new Date();
  let start: Date;
  switch (period) {
    case 'month':
      start = new Date(end.getFullYear(), end.getMonth(), 1);
      break;
    case 'quarter':
      const q = Math.floor(end.getMonth() / 3) * 3;
      start = new Date(end.getFullYear(), q, 1);
      break;
    case 'year':
      start = new Date(end.getFullYear(), 0, 1);
      break;
    default:
      start = new Date(2000, 0, 1);
  }
  return { start, end };
}

function getPeriodLabel(period: Period): string {
  switch (period) {
    case 'month':
      return 'Este mes';
    case 'quarter':
      return 'Este trimestre';
    case 'year':
      return 'Este año';
    default:
      return 'Todo';
  }
}

export default function ExpertFinancesScreen() {
  const professional = useProfessionalStore((s) => s.professional);
  const session = useAuthStore((s) => s.session);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [byType, setByType] = useState<Record<string, number>>({});
  const [period, setPeriod] = useState<Period>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const load = useCallback(
    async (isRefresh = false) => {
      if (!professional) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const { start, end } = getDateRange(period);

        const { data: appointments } = await supabase
          .from('appointments')
          .select('id')
          .eq('professional_id', professional.id);
        const appointmentIds = appointments?.map((a) => a.id) ?? [];

        let query = supabase
          .from('payments')
          .select(
            'id, amount, transfer_amount, service_amount, platform_fee, status, payment_type, created_at, description'
          )
          .in('status', ['succeeded', 'processing', 'pending'])
          .order('created_at', { ascending: false })
          .limit(100);

        if (appointmentIds.length > 0) {
          query = query.or(
            `professional_id.eq.${professional.id},appointment_id.in.(${appointmentIds.join(',')})`
          );
        } else {
          query = query.eq('professional_id', professional.id);
        }

        if (period !== 'all') {
          query = query
            .gte('created_at', start.toISOString())
            .lte('created_at', end.toISOString());
        }

        const { data } = await query;
        const list = (data ?? []) as Payment[];

        setPayments(list);

        const sum = list.reduce((s, p) => s + getAmount(p), 0);
        setTotal(sum);

        const breakdown: Record<string, number> = {};
        list.forEach((p) => {
          const t = p.payment_type ?? 'other';
          breakdown[t] = (breakdown[t] ?? 0) + getAmount(p);
        });
        setByType(breakdown);
      } catch (e) {
        console.error('Finances load:', e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [professional?.id, period]
  );

  useEffect(() => {
    if (professional) load();
  }, [professional?.id, period]);

  const handleOpenDashboard = async () => {
    if (!professional?.id || !session) return;
    setDashboardLoading(true);
    try {
      const res = await webApiFetch('/api/stripe/connect/dashboard-link', session, {
        method: 'POST',
        body: JSON.stringify({ professional_id: professional.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error');
      if (data.url) await WebBrowser.openBrowserAsync(data.url);
    } catch {
      await WebBrowser.openBrowserAsync('https://dashboard.stripe.com');
    } finally {
      setDashboardLoading(false);
    }
  };

  const periods: { key: Period; label: string }[] = [
    { key: 'month', label: 'Mes' },
    { key: 'quarter', label: 'Trimestre' },
    { key: 'year', label: 'Año' },
    { key: 'all', label: 'Todo' },
  ];

  if (loading && payments.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  const renderBreakdown = () => {
    const types = [
      ['appointment', 'Citas'],
      ['event', 'Eventos'],
      ['quote_service', 'Cotizaciones'],
      ['challenge', 'Retos'],
      ['digital_product', 'Programas digitales'],
    ];
    const items = types.filter(([k]) => (byType[k] ?? 0) > 0);
    if (items.length === 0) return null;
    return (
      <View style={[styles.breakdownCard, { backgroundColor: c.card, borderColor: c.border }]}>
        <Text style={[styles.breakdownTitle, { color: c.foreground }]}>
          Desglose por tipo - {getPeriodLabel(period)}
        </Text>
        {items.map(([key, label]) => (
          <View key={key} style={styles.breakdownRow}>
            <Text style={[styles.breakdownLabel, { color: c.mutedForeground }]}>{label}</Text>
            <Text style={[styles.breakdownValue, { color: c.foreground }]}>
              ${(byType[key] ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const listHeader = (
    <>
      <View style={[styles.totalCard, { backgroundColor: c.card, borderColor: c.border }]}>
        <Text style={[styles.totalLabel, { color: c.mutedForeground }]}>
          Ingresos - {getPeriodLabel(period)}
        </Text>
        <Text style={[styles.totalValue, { color: c.foreground }]}>
          ${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
        </Text>
        <Text style={[styles.totalSub, { color: c.mutedForeground }]}>
          {payments.length} transaccion{payments.length !== 1 ? 'es' : ''}
        </Text>
      </View>

      <View style={[styles.periodRow, { borderColor: c.border }]}>
        {periods.map((p) => (
          <Pressable
            key={p.key}
            style={[
              styles.periodBtn,
              period === p.key && { backgroundColor: c.primary },
              { borderColor: c.border },
            ]}
            onPress={() => setPeriod(p.key)}
          >
            <Text
              style={[
                styles.periodBtnText,
                { color: period === p.key ? '#fff' : c.foreground },
              ]}
            >
              {p.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {renderBreakdown()}

      <Text style={[styles.listTitle, { color: c.foreground }]}>Transacciones</Text>
    </>
  );

  const listEmpty = (
    <EmptyState
      icon="payments"
      title="No hay transacciones"
      subtitle="Las transacciones de tus citas y ventas aparecerán aquí."
      iconColor={c.mutedForeground}
      titleColor={c.foreground}
      subtitleColor={c.mutedForeground}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <FlatList
        data={payments}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={c.primary}
          />
        }
        renderItem={({ item }) => {
          const display = getAmount(item);
          return (
            <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
              <View style={styles.cardRow}>
                <Text style={[styles.amount, { color: c.foreground }]}>
                  +${getAmount(item).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </Text>
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor:
                        item.status === 'succeeded'
                          ? '#22c55e'
                          : item.status === 'processing'
                            ? '#eab308'
                            : '#94a3b8',
                    },
                  ]}
                />
              </View>
              <Text style={[styles.meta, { color: c.mutedForeground }]} numberOfLines={1}>
                {item.description || getPaymentTypeLabel(item.payment_type)}
              </Text>
              <Text style={[styles.date, { color: c.mutedForeground }]}>
                {new Date(item.created_at).toLocaleDateString('es-MX', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </View>
          );
        }}
      />
      {professional?.stripe_account_id && (
        <View style={[styles.footer, { backgroundColor: c.background, borderTopColor: c.border }]}>
          <Pressable
            style={[styles.dashboardBtn, { backgroundColor: c.primary }]}
            onPress={handleOpenDashboard}
            disabled={dashboardLoading}
          >
            {dashboardLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.dashboardBtnText}>Dashboard de Stripe</Text>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  totalCard: {
    margin: 20,
    marginBottom: 12,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  totalLabel: { fontSize: 14 },
  totalValue: { fontSize: 28, fontWeight: '700', marginTop: 4 },
  totalSub: { fontSize: 12, marginTop: 4 },
  periodRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    gap: 8,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  periodBtnText: { fontSize: 13, fontWeight: '500' },
  breakdownCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  breakdownTitle: { fontSize: 14, fontWeight: '600', marginBottom: 12 },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  breakdownLabel: { fontSize: 14 },
  breakdownValue: { fontSize: 14, fontWeight: '600' },
  listTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12, marginHorizontal: 20 },
  list: { paddingBottom: 100 },
  card: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12, marginHorizontal: 20 },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  amount: { fontSize: 18, fontWeight: '700' },
  meta: { fontSize: 14, marginTop: 4 },
  date: { fontSize: 12, marginTop: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
  },
  dashboardBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  dashboardBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
