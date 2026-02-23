import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { useProfessionalStore } from '@/stores/professional-store';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { getTimeSlotsForDate } from '@/lib/availability';
import { isSlotBlocked } from '@/lib/availability';
import { slotsOverlap } from '@/lib/appointment-conflict';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Patient = { patient_id: string; full_name: string; email: string; phone?: string | null };
type Service = { id: string; name: string; modality: string; duration: number; cost: number };

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function NewAppointmentScreen() {
  const professional = useProfessionalStore((s) => s.professional);
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [patients, setPatients] = useState<Patient[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [availableDates, setAvailableDates] = useState<{ date: string; display: string }[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState<{ time: string; display: string; status: string }[]>([]);
  const [selectedTime, setSelectedTime] = useState('');
  const [notes, setNotes] = useState('');
  const [slotsLoading, setSlotsLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!professional) return;
    setLoading(true);
    setError('');
    try {
      const [patientsRes, servicesRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, email, phone, first_name, last_name')
          .eq('type', 'patient')
          .eq('account_active', true)
          .order('full_name', { ascending: true }),
        supabase
          .from('professional_services')
          .select('id, name, modality, duration, cost, presencialcost')
          .eq('professional_id', professional.id)
          .eq('isactive', true)
          .order('name', { ascending: true }),
      ]);

      const pts = (patientsRes.data || []).map((p: any) => ({
        patient_id: p.id,
        full_name: p.full_name || `${(p.first_name || '').trim()} ${(p.last_name || '').trim()}`.trim() || 'Paciente',
        email: p.email || '',
        phone: p.phone || null,
      }));
      setPatients(pts);

      const svc = (servicesRes.data || [])
        .filter((s: any) => s.cost != null || s.presencialcost != null)
        .map((s: any) => ({
          id: s.id,
          name: s.name,
          modality: s.modality || 'both',
          duration: s.duration ?? 50,
          cost: Number(s.cost ?? s.presencialcost ?? 0),
        }));
      setServices(svc);

      const today = new Date();
      const dates: { date: string; display: string }[] = [];
      for (let i = 1; i <= 60; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        dates.push({
          date: formatDate(d),
          display: `${DAY_NAMES[d.getDay()]} ${d.getDate()}`,
        });
      }
      setAvailableDates(dates);
    } catch (e) {
      setError('Error al cargar datos');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [professional?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedService = services.find((s) => s.id === selectedServiceId);

  const loadSlots = useCallback(async () => {
    if (!professional || !selectedDate || !selectedService) return;
    setSlotsLoading(true);
    setSlots([]);
    setSelectedTime('');
    try {
      const list = await getTimeSlotsForDate(supabase, professional.id, selectedDate, selectedService.duration);
      const available = list.filter((s) => s.status === 'available');
      setSlots(available.map((s) => ({ time: s.time, display: s.display, status: s.status })));
    } catch (e) {
      console.error(e);
    } finally {
      setSlotsLoading(false);
    }
  }, [professional?.id, selectedDate, selectedService?.id]);

  useEffect(() => {
    if (selectedDate && selectedService) loadSlots();
  }, [selectedDate, selectedService?.id, loadSlots]);

  const handleSubmit = async () => {
    if (!professional) {
      Alert.alert('Error', 'No se encontró perfil profesional.');
      return;
    }
    if (!selectedPatientId || !selectedServiceId || !selectedDate || !selectedTime) {
      Alert.alert('Campos requeridos', 'Selecciona paciente, servicio, fecha y hora.');
      return;
    }

    const selectedDateTime = new Date(`${selectedDate}T${selectedTime}`);
    if (selectedDateTime <= new Date()) {
      Alert.alert('Error', 'La fecha y hora deben ser en el futuro.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const selectedService = services.find((s) => s.id === selectedServiceId);
      if (!selectedService) throw new Error('Servicio no encontrado');

      const { data: existingOnDate } = await supabase
        .from('appointments')
        .select('id, appointment_time, duration_minutes')
        .eq('professional_id', professional.id)
        .eq('appointment_date', selectedDate)
        .not('status', 'eq', 'cancelled');

      const exactMatch = existingOnDate?.find(
        (a) => String(a.appointment_time).slice(0, 5) === selectedTime.slice(0, 5)
      );
      if (exactMatch) {
        setError('Ya existe una cita en esta fecha y hora.');
        setSubmitting(false);
        return;
      }

      if (
        existingOnDate?.length &&
        slotsOverlap(
          { appointment_time: selectedTime, duration_minutes: selectedService.duration },
          existingOnDate.map((a) => ({
            appointment_time: String(a.appointment_time),
            duration_minutes: a.duration_minutes ?? 50,
          }))
        )
      ) {
        setError('Este horario se solapa con otra cita.');
        setSubmitting(false);
        return;
      }

      const { data: blocks } = await supabase
        .from('availability_blocks')
        .select('*')
        .eq('professional_id', professional.id);

      if (blocks?.length && isSlotBlocked(selectedDate, selectedTime.slice(0, 5), blocks, selectedService.duration)) {
        setError('Este horario no está disponible.');
        setSubmitting(false);
        return;
      }

      const { data: newAppointment, error: insertError } = await supabase
        .from('appointments')
        .insert({
          patient_id: selectedPatientId,
          professional_id: professional.id,
          appointment_date: selectedDate,
          appointment_time: selectedTime,
          duration_minutes: selectedService.duration,
          appointment_type: selectedService.modality === 'online' ? 'online' : 'presencial',
          cost: selectedService.cost ?? 0,
          location: selectedService.modality === 'online' ? 'Online' : null,
          notes: notes.trim() || null,
          status: 'pending',
        })
        .select()
        .single();

      if (insertError) {
        if (insertError.code === '23505') {
          setError('Este horario ya no está disponible.');
        } else {
          throw insertError;
        }
        setSubmitting(false);
        return;
      }

      Alert.alert('Cita creada', 'La cita se ha creado correctamente.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      setError(err?.message ?? 'Error al crear la cita');
      Alert.alert('Error', err?.message ?? 'Error al crear la cita');
    } finally {
      setSubmitting(false);
    }
  };

  if (!professional) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Text style={{ color: c.mutedForeground }}>Cargando...</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  if (services.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Text style={[styles.error, { color: c.foreground }]}>No tienes servicios activos. Configura tus servicios primero.</Text>
        <Button title="Volver" onPress={() => router.back()} style={{ marginTop: 16 }} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={[styles.label, { color: c.foreground }]}>Paciente *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
          {patients.slice(0, 50).map((p) => (
            <Pressable
              key={p.patient_id}
              onPress={() => setSelectedPatientId(p.patient_id)}
              style={[
                styles.chip,
                {
                  backgroundColor: selectedPatientId === p.patient_id ? c.primary : c.card,
                  borderColor: c.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: selectedPatientId === p.patient_id ? c.primaryForeground : c.foreground },
                ]}
                numberOfLines={1}
              >
                {p.full_name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        {patients.length > 50 && (
          <Text style={[styles.hint, { color: c.mutedForeground }]}>(Mostrando 50 de {patients.length})</Text>
        )}

        <Text style={[styles.label, { color: c.foreground }]}>Servicio *</Text>
        <View style={styles.serviceList}>
          {services.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => setSelectedServiceId(s.id)}
              style={[
                styles.serviceCard,
                {
                  backgroundColor: selectedServiceId === s.id ? c.primary : c.card,
                  borderColor: selectedServiceId === s.id ? c.primary : c.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.serviceName,
                  { color: selectedServiceId === s.id ? c.primaryForeground : c.foreground },
                ]}
              >
                {s.name}
              </Text>
              <Text
                style={[
                  styles.serviceMeta,
                  { color: selectedServiceId === s.id ? c.primaryForeground : c.mutedForeground },
                ]}
              >
                {s.duration} min · ${s.cost.toLocaleString()} MXN
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.label, { color: c.foreground }]}>Fecha *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
          {availableDates.map((d) => (
            <Pressable
              key={d.date}
              onPress={() => setSelectedDate(d.date)}
              style={[
                styles.chip,
                {
                  backgroundColor: selectedDate === d.date ? c.primary : c.card,
                  borderColor: c.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: selectedDate === d.date ? c.primaryForeground : c.foreground },
                ]}
              >
                {d.display}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={[styles.label, { color: c.foreground }]}>Hora *</Text>
        {slotsLoading ? (
          <ActivityIndicator size="small" color={c.primary} style={{ marginVertical: 12 }} />
        ) : (
          <View style={styles.slotsGrid}>
            {slots.map((s) => (
              <Pressable
                key={s.time}
                onPress={() => setSelectedTime(s.time)}
                style={[
                  styles.slotBtn,
                  {
                    backgroundColor: selectedTime === s.time ? c.primary : c.card,
                    borderColor: c.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.slotText,
                    { color: selectedTime === s.time ? c.primaryForeground : c.foreground },
                  ]}
                >
                  {s.display}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        <Input
          label="Notas (opcional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Instrucciones especiales..."
          multiline
          numberOfLines={3}
          style={styles.notes}
        />

        {error ? <Text style={[styles.errText, { color: c.destructive }]}>{error}</Text> : null}

        <View style={styles.actions}>
          <Button title="Cancelar" variant="outline" onPress={() => router.back()} style={styles.btn} />
          <Button
            title="Crear cita"
            onPress={handleSubmit}
            loading={submitting}
            disabled={!selectedPatientId || !selectedServiceId || !selectedDate || !selectedTime}
            style={styles.btn}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  hint: { fontSize: 12, marginTop: 4 },
  chipsScroll: { marginBottom: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  chipText: { fontSize: 14 },
  serviceList: { gap: 8 },
  serviceCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  serviceName: { fontSize: 16, fontWeight: '600' },
  serviceMeta: { fontSize: 13, marginTop: 4 },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  slotBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  slotText: { fontSize: 14 },
  notes: { minHeight: 80, textAlignVertical: 'top', marginTop: 8 },
  errText: { fontSize: 14, marginTop: 12 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  btn: { flex: 1 },
  error: { fontSize: 16, textAlign: 'center' },
});
