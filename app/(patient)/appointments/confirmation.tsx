import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Linking,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function AppointmentConfirmationScreen() {
  const { appointment_id } = useLocalSearchParams<{ appointment_id: string }>();
  const session = useAuthStore((s) => s.session);
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{ appointment: any; professional: any } | null>(null);

  useEffect(() => {
    if (!appointment_id || typeof appointment_id !== 'string' || !session?.user?.id) {
      setError('Falta el identificador de la cita.');
      setLoading(false);
      return;
    }

    (async () => {
      const { data: apt, error: aptErr } = await supabase
        .from('appointments')
        .select('id, professional_id, appointment_date, appointment_time, duration_minutes, appointment_type, cost, location, meeting_link, status')
        .eq('id', appointment_id)
        .eq('patient_id', session.user.id)
        .single();

      if (aptErr || !apt) {
        setError('No se encontró la cita.');
        setLoading(false);
        return;
      }

      const { data: pro, error: proErr } = await supabase
        .from('professional_applications')
        .select('first_name, last_name, profession, profile_photo')
        .eq('id', apt.professional_id)
        .single();

      setData({ appointment: apt, professional: proErr ? {} : pro });
      setLoading(false);
    })();
  }, [appointment_id, session?.user?.id]);

  useEffect(() => {
    if (!data?.appointment || data.appointment.status !== 'pending') return;
    const t = setTimeout(async () => {
      const { data: apt } = await supabase
        .from('appointments')
        .select('status')
        .eq('id', data.appointment.id)
        .single();
      if (apt?.status && apt.status !== 'pending') {
        setData((prev) =>
          prev ? { ...prev, appointment: { ...prev.appointment, status: apt.status } } : null
        );
      }
    }, 2500);
    return () => clearTimeout(t);
  }, [data?.appointment?.id, data?.appointment?.status]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
        <Text style={[styles.muted, { color: c.mutedForeground, marginTop: 12 }]}>Cargando...</Text>
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={[styles.center, { backgroundColor: c.background, padding: 24 }]}>
        <MaterialIcons name="info" size={48} color={c.mutedForeground} />
        <Text style={[styles.error, { color: c.foreground, marginTop: 16, textAlign: 'center' }]}>
          {error}
        </Text>
        <Pressable
          onPress={() => router.replace('/(patient)/appointments' as any)}
          style={[styles.btn, { backgroundColor: c.primary, marginTop: 24 }]}>
          <Text style={[styles.btnText, { color: c.primaryForeground }]}>Ver mis citas</Text>
        </Pressable>
      </View>
    );
  }

  if (!data) return null;

  const { appointment, professional } = data;
  const profName = `${professional?.first_name || ''} ${professional?.last_name || ''}`.trim() || 'Profesional';
  const dateStr = appointment.appointment_date
    ? new Date(appointment.appointment_date).toLocaleDateString('es-MX', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';
  const timeStr = appointment.appointment_time ? String(appointment.appointment_time).slice(0, 5) : '';
  const isOnline = appointment.appointment_type === 'online';
  const isPaymentPending = appointment.status === 'pending';

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.background }]} contentContainerStyle={styles.content}>
      <View style={[styles.iconWrap, { backgroundColor: `${c.primary}20` }]}>
        {isPaymentPending ? (
          <ActivityIndicator size="large" color={c.primary} />
        ) : (
          <MaterialIcons name="check-circle" size={48} color={c.primary} />
        )}
      </View>
      <Text style={[styles.title, { color: c.foreground }]}>
        {isPaymentPending ? 'Reserva registrada' : 'Cita confirmada'}
      </Text>
      <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
        {isPaymentPending
          ? 'Estamos procesando tu pago. Te avisaremos cuando todo esté listo.'
          : 'Tu reserva y pago se han registrado correctamente.'}
      </Text>

      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={styles.row}>
          <MaterialIcons name="event" size={20} color={c.primary} />
          <Text style={[styles.value, { color: c.foreground }]}>{dateStr}</Text>
        </View>
        <View style={styles.row}>
          <MaterialIcons name="access-time" size={20} color={c.primary} />
          <Text style={[styles.value, { color: c.foreground }]}>
            {timeStr} · {appointment.duration_minutes ?? 50} min
          </Text>
        </View>
        <View style={styles.row}>
          <MaterialIcons name={isOnline ? 'videocam' : 'place'} size={20} color={c.primary} />
          <Text style={[styles.value, { color: c.foreground }]}>
            {isOnline ? 'En línea' : (appointment.location || 'Por definir')}
          </Text>
        </View>
        <Text style={[styles.profLine, { color: c.mutedForeground }]}>
          Con {profName} · {professional?.profession || 'Profesional'}
        </Text>
        {appointment.cost != null && (
          <Text style={[styles.costLine, { color: c.foreground }]}>
            ${Number(appointment.cost).toLocaleString()} MXN pagados
          </Text>
        )}
      </View>

      {isOnline && appointment.meeting_link && (
        <Pressable
          onPress={() => Linking.openURL(appointment.meeting_link)}
          style={[styles.linkCard, { backgroundColor: `${c.primary}10`, borderColor: c.primary }]}>
          <MaterialIcons name="videocam" size={24} color={c.primary} />
          <View style={styles.linkContent}>
            <Text style={[styles.linkTitle, { color: c.foreground }]}>Enlace de videollamada</Text>
            <Text style={[styles.linkUrl, { color: c.primary }]} numberOfLines={1}>
              {appointment.meeting_link}
            </Text>
            <Text style={[styles.linkHint, { color: c.mutedForeground }]}>
              Usa este enlace el día de la cita
            </Text>
          </View>
          <MaterialIcons name="open-in-new" size={20} color={c.primary} />
        </Pressable>
      )}

      <View style={styles.actions}>
        <Pressable
          onPress={() => router.replace('/(patient)/appointments' as any)}
          style={[styles.btn, { backgroundColor: c.primary }]}>
          <Text style={[styles.btnText, { color: c.primaryForeground }]}>Ver mis citas</Text>
          <MaterialIcons name="chevron-right" size={20} color={c.primaryForeground} />
        </Pressable>
        <Pressable
          onPress={() => router.replace('/(tabs)' as any)}
          style={[styles.btnOutline, { borderColor: c.border }]}>
          <Text style={[styles.btnTextOutline, { color: c.foreground }]}>Seguir explorando</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20, paddingBottom: 40 },
  muted: { fontSize: 15 },
  error: { fontSize: 16 },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 15, textAlign: 'center', marginBottom: 24 },
  card: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  value: { fontSize: 15 },
  profLine: { fontSize: 14, marginTop: 4 },
  costLine: { fontSize: 15, fontWeight: '600', marginTop: 12 },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  linkContent: { flex: 1, marginLeft: 12 },
  linkTitle: { fontSize: 15, fontWeight: '600' },
  linkUrl: { fontSize: 13, marginTop: 4 },
  linkHint: { fontSize: 12, marginTop: 4 },
  actions: { gap: 12 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 10,
  },
  btnText: { fontSize: 16, fontWeight: '600' },
  btnOutline: { padding: 16, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  btnTextOutline: { fontSize: 16, fontWeight: '600' },
});
