import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { useAuthStore } from '@/stores/auth-store';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { EmptyState } from '@/components/ui/empty-state';

export default function AppointmentsListScreen() {
  const session = useAuthStore((s) => s.session);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const colorScheme = useColorScheme();
  const c = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const load = useCallback(async (isRefresh = false) => {
    if (!session?.user?.id) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data } = await supabase
        .from('appointments')
        .select(
          `id, status, appointment_date, appointment_time, professional_id,
           professional_applications(first_name, last_name, profile_photo)`
        )
        .eq('patient_id', session.user.id)
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: false });
      setAppointments(data || []);
    } catch (e) {
      console.error('Appointments error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (session) load();
  }, [session?.user?.id]);

  const statusLabel: Record<string, string> = {
    pending: 'Pendiente',
    confirmed: 'Confirmada',
    completed: 'Completada',
    cancelled: 'Cancelada',
    paid: 'Pagada',
    patient_no_show: 'No asististe',
    professional_no_show: 'Profesional no asistió',
  };

  const renderItem = ({ item }: { item: any }) => {
    const prof = Array.isArray(item.professional_applications)
      ? item.professional_applications[0]
      : item.professional_applications || {};
    const name = `${prof?.first_name || ''} ${prof?.last_name || ''}`.trim() || 'Profesional';
    const date = item.appointment_date
      ? new Date(item.appointment_date).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })
      : '';
    const time = item.appointment_time ? String(item.appointment_time).slice(0, 5) : '';

    return (
      <Pressable
        onPress={() => router.push(`/appointments/${item.id}`)}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: c.card, borderColor: c.border },
          pressed && styles.pressed,
        ]}>
        <View style={styles.cardRow}>
          <View style={styles.cardLeft}>
            <Text style={[styles.date, { color: c.foreground }]}>{date}</Text>
            <Text style={[styles.time, { color: c.mutedForeground }]}>{time}</Text>
          </View>
          <Text style={[styles.status, { color: c.primary }]}>{statusLabel[item.status] || item.status}</Text>
        </View>
        <View style={styles.profRow}>
          <Image
            source={{ uri: prof?.profile_photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}` }}
            style={styles.avatarSmall}
          />
          <Text style={[styles.profName, { color: c.foreground }]}>{name}</Text>
        </View>
      </Pressable>
    );
  };

  if (loading && appointments.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <FlatList
        data={appointments}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.primary} />}
        ListEmptyComponent={
          <EmptyState
            icon="event"
            title="No tienes citas programadas"
            subtitle="Reserva una cita con un profesional para comenzar."
            actionLabel="Explorar profesionales"
            onAction={() => router.push('/(tabs)' as any)}
            iconColor={c.mutedForeground}
            titleColor={c.foreground}
            subtitleColor={c.mutedForeground}
            buttonBgColor={c.primary}
          />
        }
      />
    </View>
  );
}

AppointmentsListScreen.options = { title: 'Mis citas' };

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 20, paddingBottom: 40 },
  card: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  pressed: { opacity: 0.9 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardLeft: {},
  date: { fontSize: 16, fontWeight: '600' },
  time: { fontSize: 14, marginTop: 2 },
  status: { fontSize: 13, fontWeight: '600' },
  profRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  avatarSmall: { width: 32, height: 32, borderRadius: 16, marginRight: 10, backgroundColor: 'transparent' },
  profName: { fontSize: 14 },
});
