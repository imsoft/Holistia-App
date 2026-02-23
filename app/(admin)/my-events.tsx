import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Image,
  Linking,
  Alert,
} from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/stores/auth-store';
import { supabase } from '@/lib/supabase';
import { API_BASE_URL } from '@/constants/auth';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

type EventRow = {
  id: string;
  name: string;
  event_date: string;
  event_time?: string;
  location: string;
  max_capacity: number;
  price: number;
  is_free: boolean;
  is_active: boolean;
  gallery_images?: string[];
};

type Registration = {
  id: string;
  user_id: string;
  status: string;
  confirmation_code: string;
  registration_date: string;
  user_name?: string;
  user_email?: string;
};

function formatPrice(n: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function AdminMyEventsScreen() {
  const session = useAuthStore((s) => s.session);
  const userId = session?.user?.id;
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!userId) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data, error } = await supabase
        .from('events_workshops')
        .select('id, name, event_date, event_time, location, max_capacity, price, is_free, is_active, gallery_images')
        .eq('owner_id', userId)
        .eq('owner_type', 'admin')
        .order('event_date', { ascending: false });

      if (error) throw error;
      setEvents((data as EventRow[]) ?? []);

      const { data: stripeCheck } = await supabase
        .from('events_workshops')
        .select('stripe_onboarding_completed')
        .eq('owner_id', userId)
        .eq('owner_type', 'admin')
        .not('stripe_account_id', 'is', null)
        .limit(1)
        .maybeSingle();
      setStripeConnected(!!stripeCheck?.stripe_onboarding_completed);
    } catch (e) {
      console.error('My events load error:', e);
      Alert.alert('Error', 'No se pudieron cargar tus eventos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const openStripeWeb = () => {
    const url = `${API_BASE_URL}/admin/${userId}/my-events`;
    Linking.openURL(url);
  };

  if (loading && events.length === 0) {
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
      {!stripeConnected && (
        <View style={[styles.stripeCard, { backgroundColor: c.card, borderColor: c.primary }]}>
          <MaterialIcons name="attach-money" size={28} color={c.primary} />
          <View style={styles.stripeContent}>
            <Text style={[styles.stripeTitle, { color: c.foreground }]}>Conecta tu cuenta Stripe</Text>
            <Text style={[styles.stripeDesc, { color: c.mutedForeground }]}>
              Para recibir pagos de tus eventos, conecta Stripe en la web
            </Text>
            <Pressable
              onPress={openStripeWeb}
              style={[styles.stripeBtn, { backgroundColor: c.primary }]}
            >
              <Text style={[styles.stripeBtnText, { color: c.primaryForeground }]}>
                Abrir panel web
              </Text>
              <MaterialIcons name="open-in-new" size={18} color={c.primaryForeground} />
            </Pressable>
          </View>
        </View>
      )}

      <Text style={[styles.sectionTitle, { color: c.foreground }]}>Mis eventos</Text>

      {events.length === 0 ? (
        <View style={[styles.card, { backgroundColor: c.card }]}>
          <MaterialIcons name="event" size={48} color={c.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: c.foreground }]}>No tienes eventos</Text>
          <Text style={[styles.muted, { color: c.mutedForeground }]}>
            Crea eventos desde el panel de administración de eventos
          </Text>
        </View>
      ) : (
        events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            isExpanded={expandedEventId === event.id}
            onToggle={() => setExpandedEventId((id) => (id === event.id ? null : event.id))}
            c={c}
          />
        ))
      )}
      <View style={styles.bottomPad} />
    </ScrollView>
  );
}

function EventCard({
  event,
  isExpanded,
  onToggle,
  c,
}: {
  event: EventRow;
  isExpanded: boolean;
  onToggle: () => void;
  c: typeof Colors.light;
}) {
  const [regs, setRegs] = useState<Registration[]>([]);
  const [regsLoading, setRegsLoading] = useState(false);

  useEffect(() => {
    if (!isExpanded || regs.length > 0) return;
    (async () => {
      setRegsLoading(true);
      try {
        const { data: raw } = await supabase
          .from('event_registrations')
          .select('id, user_id, status, confirmation_code, registration_date')
          .eq('event_id', event.id)
          .order('registration_date', { ascending: false });
        const userIds = [...new Set((raw || []).map((r: { user_id: string }) => r.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, first_name, last_name')
          .in('id', userIds);
        const map = new Map(
          (profiles || []).map((p: { id: string; email?: string; first_name?: string; last_name?: string }) => [
            p.id,
            {
              name:
                p.first_name && p.last_name
                  ? `${p.first_name} ${p.last_name}`.trim()
                  : p.email || '',
              email: p.email,
            },
          ])
        );
        const list: Registration[] = (raw || []).map((r: any) => ({
          ...r,
          user_name: map.get(r.user_id)?.name || r.user_id,
          user_email: map.get(r.user_id)?.email,
        }));
        setRegs(list);
      } catch (e) {
        console.error('Registrations load error:', e);
      } finally {
        setRegsLoading(false);
      }
    })();
  }, [isExpanded, event.id]);

  const img = event.gallery_images?.[0];
  const confirmed = regs.filter((r) => r.status === 'confirmed').length;
  const revenue = event.is_free ? 0 : confirmed * (event.price || 0);

  return (
    <View style={[styles.eventCard, { backgroundColor: c.card }]}>
      {img && (
        <Image
          source={{ uri: img }}
          style={styles.eventImage}
          resizeMode="cover"
        />
      )}
      <View style={styles.eventBody}>
        <Text style={[styles.eventName, { color: c.foreground }]} numberOfLines={2}>
          {event.name || 'Sin título'}
        </Text>
        <View style={styles.eventBadges}>
          <View style={[styles.badge, { backgroundColor: event.is_active ? '#16a34a20' : '#6b728020' }]}>
            <Text style={{ color: event.is_active ? '#16a34a' : '#6b7280', fontSize: 12 }}>
              {event.is_active ? 'Activo' : 'Inactivo'}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: c.border }]}>
            <Text style={[styles.badgeText, { color: c.foreground }]}>
              {event.is_free ? 'Gratis' : formatPrice(event.price)}
            </Text>
          </View>
        </View>
        <View style={styles.eventMeta}>
          <MaterialIcons name="event" size={16} color={c.mutedForeground} />
          <Text style={[styles.muted, { color: c.mutedForeground }]}>{formatDate(event.event_date)}</Text>
        </View>
        <View style={styles.eventMeta}>
          <MaterialIcons name="people" size={16} color={c.mutedForeground} />
          <Text style={[styles.muted, { color: c.mutedForeground }]}>Cupo: {event.max_capacity}</Text>
        </View>
        <View style={styles.eventMeta}>
          <MaterialIcons name="place" size={16} color={c.mutedForeground} />
          <Text style={[styles.muted, { color: c.mutedForeground }]} numberOfLines={1}>
            {event.location || '—'}
          </Text>
        </View>
        <Pressable
          onPress={onToggle}
          style={({ pressed }) => [
            styles.toggleBtn,
            { backgroundColor: isExpanded ? c.muted : c.primary },
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.toggleBtnText, { color: isExpanded ? c.foreground : c.primaryForeground }]}>
            {isExpanded ? 'Ocultar registraciones' : 'Ver registraciones'}
          </Text>
        </Pressable>

        {isExpanded && (
          <View style={[styles.regsSection, { borderTopColor: c.border }]}>
            {regsLoading ? (
              <ActivityIndicator size="small" color={c.primary} />
            ) : (
              <>
                <View style={styles.regsStats}>
                  <View style={styles.regStat}>
                    <Text style={[styles.regStatValue, { color: c.foreground }]}>{regs.length}</Text>
                    <Text style={[styles.muted, { color: c.mutedForeground }]}>Total</Text>
                  </View>
                  <View style={styles.regStat}>
                    <Text style={[styles.regStatValue, { color: '#16a34a' }]}>{confirmed}</Text>
                    <Text style={[styles.muted, { color: c.mutedForeground }]}>Confirmados</Text>
                  </View>
                  <View style={styles.regStat}>
                    <Text style={[styles.regStatValue, { color: c.foreground }]}>
                      {formatPrice(revenue)}
                    </Text>
                    <Text style={[styles.muted, { color: c.mutedForeground }]}>Ingresos</Text>
                  </View>
                </View>
                {regs.length === 0 ? (
                  <Text style={[styles.muted, { color: c.mutedForeground }]}>
                    No hay registraciones aún
                  </Text>
                ) : (
                  regs.map((r) => (
                    <View key={r.id} style={[styles.regRow, { borderBottomColor: c.border }]}>
                      <View style={styles.regInfo}>
                        <Text style={[styles.regName, { color: c.foreground }]}>{r.user_name || r.user_email}</Text>
                        <Text style={[styles.muted, { color: c.mutedForeground }]}>{r.user_email}</Text>
                        <Text style={[styles.regCode, { color: c.mutedForeground }]}>
                          Código: {r.confirmation_code}
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, getStatusStyle(r.status)]}>
                        <Text style={[styles.statusText, getStatusTextColor(r.status)]}>
                          {r.status === 'confirmed' ? 'Confirmado' : r.status === 'pending' ? 'Pendiente' : r.status === 'cancelled' ? 'Cancelado' : r.status}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

function getStatusStyle(status: string) {
  if (status === 'confirmed') return { backgroundColor: '#16a34a20' };
  if (status === 'pending') return { backgroundColor: '#eab30820' };
  if (status === 'cancelled') return { backgroundColor: '#dc262620' };
  return { backgroundColor: '#6b728020' };
}

function getStatusTextColor(status: string) {
  if (status === 'confirmed') return { color: '#16a34a' };
  if (status === 'pending') return { color: '#eab308' };
  if (status === 'cancelled') return { color: '#dc2626' };
  return { color: '#6b7280' };
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  stripeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  stripeContent: { flex: 1, marginLeft: 12 },
  stripeTitle: { fontSize: 16, fontWeight: '600' },
  stripeDesc: { fontSize: 14, marginTop: 4 },
  stripeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  stripeBtnText: { fontSize: 15, fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  card: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600' },
  muted: { fontSize: 13 },
  eventCard: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  eventImage: { width: '100%', height: 140, backgroundColor: '#e5e7eb' },
  eventBody: { padding: 16 },
  eventName: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  eventBadges: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 12, fontWeight: '500' },
  eventMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  toggleBtn: { paddingVertical: 10, borderRadius: 10, alignItems: 'center', marginTop: 12 },
  toggleBtnText: { fontSize: 15, fontWeight: '600' },
  pressed: { opacity: 0.8 },
  regsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  regsStats: { flexDirection: 'row', gap: 20, marginBottom: 16 },
  regStat: { flex: 1 },
  regStatValue: { fontSize: 18, fontWeight: '700' },
  regRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  regInfo: { flex: 1 },
  regName: { fontSize: 14, fontWeight: '600' },
  regCode: { fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 12, fontWeight: '600' },
  bottomPad: { height: 24 },
});
