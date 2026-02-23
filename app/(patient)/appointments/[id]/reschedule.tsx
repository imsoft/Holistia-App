import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { supabase } from '@/lib/supabase';
import { webApiFetch } from '@/lib/web-api';
import { getTimeSlotsForDate } from '@/lib/availability';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function RescheduleAppointmentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useAuthStore((s) => s.session);
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const [appointment, setAppointment] = useState<any>(null);
  const [dates, setDates] = useState<{ date: string; display: string }[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState<{ time: string; display: string }[]>([]);
  const [selectedTime, setSelectedTime] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id || !session?.user?.id) return;
    (async () => {
      const { data } = await supabase.from('appointments').select('*').eq('id', id).eq('patient_id', session.user.id).single();
      setAppointment(data);
      if (data) {
        const today = new Date();
        const list: { date: string; display: string }[] = [];
        for (let i = 0; i < 60; i++) {
          const d = new Date(today);
          d.setDate(today.getDate() + i);
          list.push({ date: formatDate(d), display: `${DAY_NAMES[d.getDay()]} ${d.getDate()}` });
        }
        setDates(list);
      }
      setLoading(false);
    })();
  }, [id, session?.user?.id]);

  const loadSlots = useCallback(async (date: string) => {
    if (!appointment?.professional_id) return;
    setSlotsLoading(true);
    setSlots([]);
    setSelectedTime('');
    try {
      const list = await getTimeSlotsForDate(supabase, appointment.professional_id, date, appointment.duration_minutes ?? 50);
      const available = list.filter((s) => s.status === 'available');
      setSlots(available);
    } catch (e) {
      console.error(e);
    } finally {
      setSlotsLoading(false);
    }
  }, [appointment?.professional_id]);

  useEffect(() => {
    if (selectedDate && appointment) loadSlots(selectedDate);
  }, [selectedDate, appointment?.id, loadSlots]);

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime || !session) {
      Alert.alert('Campos requeridos', 'Selecciona fecha y hora.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await webApiFetch('/api/appointments/reschedule', session, {
        method: 'POST',
        body: JSON.stringify({
          appointmentId: id,
          newDate: selectedDate,
          newTime: selectedTime,
          rescheduledBy: 'patient',
          rescheduleReason: reason.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      Alert.alert('Cita reprogramada', 'Recibirás un correo con la confirmación.', [
        { text: 'OK', onPress: () => router.replace('/appointments') },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo reprogramar.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !appointment) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: c.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.label, { color: c.foreground }]}>Nueva fecha *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.datesScroll}>
          {dates.map((d) => (
            <Pressable
              key={d.date}
              onPress={() => setSelectedDate(d.date)}
              style={[styles.dateChip, { backgroundColor: selectedDate === d.date ? c.primary : c.card, borderColor: c.border }]}
            >
              <Text style={[styles.dateChipText, { color: selectedDate === d.date ? c.primaryForeground : c.foreground }]}>{d.display}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {selectedDate && (
          <>
            <Text style={[styles.label, { color: c.foreground }]}>Nueva hora *</Text>
            {slotsLoading ? (
              <ActivityIndicator size="small" color={c.primary} style={styles.slotsLoad} />
            ) : slots.length === 0 ? (
              <Text style={[styles.hint, { color: c.mutedForeground }]}>No hay horarios disponibles este día</Text>
            ) : (
              <View style={styles.slotsGrid}>
                {slots.map((slot) => (
                  <Button
                    key={slot.time}
                    title={slot.display}
                    variant={selectedTime === slot.time ? 'primary' : 'outline'}
                    onPress={() => setSelectedTime(slot.time)}
                    style={styles.slotBtn}
                  />
                ))}
              </View>
            )}
          </>
        )}

        <Input label="Motivo (opcional)" value={reason} onChangeText={setReason} placeholder="Ej: Cambio de horario..." />

        <View style={styles.actions}>
          <Button title="Volver" variant="outline" onPress={() => router.back()} style={styles.btn} />
          <Button title="Reprogramar" onPress={handleSubmit} loading={submitting} disabled={!selectedDate || !selectedTime} style={styles.btn} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  datesScroll: { marginBottom: 20 },
  dateChip: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, marginRight: 8, minWidth: 70, alignItems: 'center' },
  dateChipText: { fontSize: 14, fontWeight: '600' },
  slotsLoad: { marginVertical: 16 },
  hint: { fontSize: 14, marginBottom: 16 },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  slotBtn: { minWidth: 80 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  btn: { flex: 1 },
});
