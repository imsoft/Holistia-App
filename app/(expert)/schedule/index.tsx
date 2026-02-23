import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Switch,
  Alert,
  Linking,
  TextInput,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { webApiFetch } from '@/lib/web-api';
import { useAuthStore } from '@/stores/auth-store';
import { useProfessionalStore } from '@/stores/professional-store';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const DAYS = [
  { day: 1, name: 'Lunes' },
  { day: 2, name: 'Martes' },
  { day: 3, name: 'Miércoles' },
  { day: 4, name: 'Jueves' },
  { day: 5, name: 'Viernes' },
  { day: 6, name: 'Sábado' },
  { day: 7, name: 'Domingo' },
];

type DaySchedule = {
  day: number;
  isWorking: boolean;
  startTime: string;
  endTime: string;
};

export default function ScheduleScreen() {
  const professional = useProfessionalStore((s) => s.professional);
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const session = useAuthStore((s) => s.session);
  const [schedules, setSchedules] = useState<DaySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [googleConnecting, setGoogleConnecting] = useState(false);
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState<boolean | null>(null);
  const [googleDisconnecting, setGoogleDisconnecting] = useState(false);

  const loadWorkingHours = useCallback(async () => {
    if (!professional?.id) return;
    try {
      const { data, error } = await supabase
        .from('professional_applications')
        .select('working_days, working_start_time, working_end_time, per_day_schedule')
        .eq('id', professional.id)
        .single();

      if (error) throw error;

      const workingDays: number[] = data?.working_days ?? [];
      const globalStart = data?.working_start_time ?? '09:00';
      const globalEnd = data?.working_end_time ?? '18:00';
      const perDay = (data?.per_day_schedule ?? null) as Record<string, { start: string; end: string }> | null;

      const loaded: DaySchedule[] = DAYS.map((d) => {
        const isWorking = workingDays.includes(d.day);
        const dayConfig = perDay?.[String(d.day)];
        return {
          day: d.day,
          isWorking,
          startTime: dayConfig?.start ?? globalStart,
          endTime: dayConfig?.end ?? globalEnd,
        };
      });
      setSchedules(loaded);
    } catch (e) {
      console.error('Load working hours:', e);
      setSchedules(
        DAYS.map((d) => ({
          day: d.day,
          isWorking: d.day <= 5,
          startTime: '09:00',
          endTime: '18:00',
        }))
      );
    } finally {
      setLoading(false);
    }
  }, [professional?.id]);

  useEffect(() => {
    loadWorkingHours();
  }, [loadWorkingHours]);

  const loadGoogleCalendarStatus = useCallback(async () => {
    if (!session) {
      setGoogleCalendarConnected(false);
      return;
    }
    try {
      const res = await webApiFetch('/api/google-calendar/status', session);
      const data = await res.json().catch(() => ({}));
      setGoogleCalendarConnected(data.connected === true);
    } catch {
      setGoogleCalendarConnected(false);
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      loadGoogleCalendarStatus();
    }, [loadGoogleCalendarStatus])
  );

  const updateDay = (day: number, field: keyof DaySchedule, value: string | boolean) => {
    setSchedules((prev) =>
      prev.map((s) => (s.day === day ? { ...s, [field]: value } : s))
    );
  };

  const handleSave = async () => {
    if (!professional?.id) return;
    setSaving(true);
    try {
      const workingSchedules = schedules.filter((s) => s.isWorking);
      const workingDays = workingSchedules.map((s) => s.day).sort();
      const globalStart = workingSchedules[0]?.startTime ?? '09:00';
      const globalEnd = workingSchedules[0]?.endTime ?? '18:00';

      const perDaySchedule: Record<string, { start: string; end: string }> = {};
      for (const s of workingSchedules) {
        perDaySchedule[String(s.day)] = { start: s.startTime, end: s.endTime };
      }

      const { error } = await supabase
        .from('professional_applications')
        .update({
          working_days: workingDays,
          working_start_time: globalStart,
          working_end_time: globalEnd,
          per_day_schedule: workingSchedules.length > 0 ? perDaySchedule : null,
        })
        .eq('id', professional.id);

      if (error) throw error;
      Alert.alert('Éxito', 'Horarios guardados');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const openGoogleCalendar = async () => {
    if (!session) {
      Alert.alert('Sesión requerida', 'Inicia sesión para conectar Google Calendar.');
      return;
    }
    setGoogleConnecting(true);
    try {
      const res = await webApiFetch('/api/google-calendar/auth', session);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Error');
      if (data.authUrl) {
        await WebBrowser.openBrowserAsync(data.authUrl);
        await loadGoogleCalendarStatus();
        Alert.alert('Google Calendar', 'Si conectaste correctamente, tus citas se sincronizarán con tu calendario.');
      } else {
        throw new Error('No se recibió URL de autorización');
      }
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo conectar Google Calendar');
    } finally {
      setGoogleConnecting(false);
    }
  };

  const disconnectGoogleCalendar = () => {
    Alert.alert(
      'Desconectar Google Calendar',
      '¿Dejar de sincronizar tus citas con Google Calendar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desconectar',
          style: 'destructive',
          onPress: async () => {
            if (!session) return;
            setGoogleDisconnecting(true);
            try {
              const res = await webApiFetch('/api/google-calendar/disconnect', session, { method: 'POST' });
              const data = await res.json().catch(() => ({}));
              if (!res.ok) throw new Error(data.error ?? 'Error');
              setGoogleCalendarConnected(false);
              Alert.alert('Listo', 'Google Calendar se ha desconectado.');
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo desconectar');
            } finally {
              setGoogleDisconnecting(false);
            }
          },
        },
      ]
    );
  };

  const openAvailability = () => {
    router.push('/(expert)/availability');
  };

  if (loading && !professional) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  if (!professional) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Text style={[styles.muted, { color: c.mutedForeground }]}>No tienes perfil de profesional</Text>
        <Pressable onPress={() => router.back()} style={[styles.btn, { backgroundColor: c.primary }]}>
          <Text style={[styles.btnText, { color: c.primaryForeground }]}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.background }]}
      contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: c.foreground }]}>Gestión de Horarios</Text>
      <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
        Configura tus horarios de trabajo y bloqueos de disponibilidad
      </Text>

      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
        <Text style={[styles.sectionTitle, { color: c.foreground }]}>Horarios de Trabajo</Text>
        <Text style={[styles.hint, { color: c.mutedForeground }]}>
          Define cuándo estás disponible para recibir citas
        </Text>

        {schedules.map((s) => (
          <View key={s.day} style={[styles.dayRow, { borderColor: c.border }]}>
            <View style={styles.dayLeft}>
              <Switch
                value={s.isWorking}
                onValueChange={(v) => updateDay(s.day, 'isWorking', v)}
                trackColor={{ false: c.border, true: c.primary }}
                thumbColor="#fff"
              />
              <Text style={[styles.dayName, { color: c.foreground }]}>
                {DAYS.find((d) => d.day === s.day)?.name}
              </Text>
            </View>
            {s.isWorking && (
              <View style={styles.timeRow}>
                <Text style={[styles.timeLabel, { color: c.mutedForeground }]}>De</Text>
                <TextInput
                  style={[styles.timeInput, { backgroundColor: c.background, color: c.foreground, borderColor: c.border }]}
                  value={s.startTime}
                  onChangeText={(t) => updateDay(s.day, 'startTime', t)}
                  placeholder="09:00"
                  placeholderTextColor={c.mutedForeground}
                  maxLength={5}
                />
                <Text style={[styles.timeLabel, { color: c.mutedForeground }]}>a</Text>
                <TextInput
                  style={[styles.timeInput, { backgroundColor: c.background, color: c.foreground, borderColor: c.border }]}
                  value={s.endTime}
                  onChangeText={(t) => updateDay(s.day, 'endTime', t)}
                  placeholder="18:00"
                  placeholderTextColor={c.mutedForeground}
                  maxLength={5}
                />
              </View>
            )}
          </View>
        ))}

        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={[styles.saveBtn, { backgroundColor: c.primary }]}>
          {saving ? (
            <ActivityIndicator size="small" color={c.primaryForeground} />
          ) : (
            <Text style={[styles.saveBtnText, { color: c.primaryForeground }]}>Guardar horarios</Text>
          )}
        </Pressable>
      </View>

      <Pressable
        onPress={openAvailability}
        style={[styles.linkCard, { backgroundColor: c.card, borderColor: c.border }]}>
        <MaterialIcons name="block" size={24} color={c.primary} />
        <View style={styles.linkContent}>
          <Text style={[styles.linkTitle, { color: c.foreground }]}>Bloqueos de disponibilidad</Text>
          <Text style={[styles.linkDesc, { color: c.mutedForeground }]}>
            Bloquea días u horarios cuando no estés disponible
          </Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color={c.mutedForeground} />
      </Pressable>

      {googleCalendarConnected === true ? (
        <View style={[styles.linkCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <MaterialIcons name="check-circle" size={24} color={c.primary} />
          <View style={styles.linkContent}>
            <Text style={[styles.linkTitle, { color: c.foreground }]}>Google Calendar conectado</Text>
            <Text style={[styles.linkDesc, { color: c.mutedForeground }]}>
              Tus citas y bloqueos se sincronizan con tu calendario
            </Text>
          </View>
          <Pressable
            onPress={disconnectGoogleCalendar}
            disabled={googleDisconnecting}
            style={[styles.disconnectBtn, { borderColor: c.destructive }]}>
            {googleDisconnecting ? (
              <ActivityIndicator size="small" color={c.destructive} />
            ) : (
              <Text style={[styles.disconnectBtnText, { color: c.destructive }]}>Desconectar</Text>
            )}
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={openGoogleCalendar}
          disabled={googleConnecting}
          style={[styles.linkCard, { backgroundColor: c.card, borderColor: c.border }]}>
          {googleConnecting ? (
            <ActivityIndicator size="small" color={c.primary} />
          ) : (
            <MaterialIcons name="event" size={24} color={c.primary} />
          )}
          <View style={styles.linkContent}>
            <Text style={[styles.linkTitle, { color: c.foreground }]}>Conectar Google Calendar</Text>
            <Text style={[styles.linkDesc, { color: c.mutedForeground }]}>
              Sincroniza tus citas y bloqueos con tu calendario de Google
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={c.mutedForeground} />
        </Pressable>
      )}

      <View style={[styles.infoCard, { backgroundColor: '#fef3c7', borderColor: '#f59e0b' }]}>
        <MaterialIcons name="info" size={20} color="#92400e" />
        <Text style={styles.infoText}>
          Los bloqueos tienen prioridad sobre los horarios de trabajo. Si bloqueas un día, no estarás
          disponible aunque esté en tus horarios.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  muted: { fontSize: 15 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 15, marginBottom: 24 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  hint: { fontSize: 13, marginBottom: 16 },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  dayLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dayName: { fontSize: 16, fontWeight: '500' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeLabel: { fontSize: 13 },
  timeInput: {
    fontSize: 15,
    fontWeight: '600',
    width: 56,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    textAlign: 'center',
  },
  saveBtn: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveBtnText: { fontSize: 16, fontWeight: '600' },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    gap: 12,
  },
  linkContent: { flex: 1 },
  linkTitle: { fontSize: 16, fontWeight: '600' },
  linkDesc: { fontSize: 13, marginTop: 2 },
  disconnectBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  disconnectBtnText: { fontSize: 14, fontWeight: '600' },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 20 },
  btn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10, marginTop: 16 },
  btnText: { fontSize: 16, fontWeight: '600' },
});
