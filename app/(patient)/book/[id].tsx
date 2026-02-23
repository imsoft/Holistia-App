import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useAuthStore } from '@/stores/auth-store';
import { supabase } from '@/lib/supabase';
import { webApiFetch } from '@/lib/web-api';
import { getTimeSlotsForDate } from '@/lib/availability';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type ServiceItem = {
  id: string;
  name: string;
  modality: string;
  duration: number;
  cost: number;
};

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function BookAppointmentScreen() {
  const { id: professionalId } = useLocalSearchParams<{ id: string }>();
  const session = useAuthStore((s) => s.session);
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const [professionalName, setProfessionalName] = useState('');
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [availableDates, setAvailableDates] = useState<{ date: string; display: string }[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState<{ time: string; display: string; status: string }[]>([]);
  const [selectedTime, setSelectedTime] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadInitial = useCallback(async () => {
    if (!professionalId) return;
    setLoading(true);
    setError('');
    try {
      const { data: prof } = await supabase
        .from('professional_applications')
        .select('first_name, last_name')
        .eq('id', professionalId)
        .single();
      if (prof) {
        setProfessionalName(`${prof.first_name || ''} ${prof.last_name || ''}`.trim() || 'Profesional');
      }

      const { data: svc } = await supabase
        .from('professional_services')
        .select('id, name, modality, duration, cost')
        .eq('professional_id', professionalId)
        .eq('isactive', true)
        .eq('pricing_type', 'fixed')
        .not('cost', 'is', null)
        .order('name');

      const valid = (svc || []).filter((s: any) => s.cost != null && Number(s.cost) > 0).map((s: any) => ({
        id: s.id,
        name: s.name,
        modality: s.modality || 'both',
        duration: s.duration ?? 50,
        cost: Number(s.cost),
      }));
      setServices(valid);

      const today = new Date();
      const dates: { date: string; display: string }[] = [];
      for (let i = 0; i < 60; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        dates.push({
          date: formatDate(d),
          display: `${DAY_NAMES[d.getDay()]} ${d.getDate()}`,
        });
      }
      setAvailableDates(dates);
    } catch (e) {
      setError('No se pudo cargar la información');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [professionalId]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const loadSlots = useCallback(async (date: string) => {
    if (!professionalId || !selectedService) return;
    setSlotsLoading(true);
    setSlots([]);
    setSelectedTime('');
    try {
      const list = await getTimeSlotsForDate(supabase, professionalId, date, selectedService.duration);
      const available = list.filter((s) => s.status === 'available');
      setSlots(available);
    } catch (e) {
      console.error(e);
    } finally {
      setSlotsLoading(false);
    }
  }, [professionalId, selectedService]);

  useEffect(() => {
    if (selectedDate && selectedService) loadSlots(selectedDate);
  }, [selectedDate, selectedService?.id, loadSlots]);

  const handleReserve = async () => {
    if (!session || !professionalId || !selectedService || !selectedDate || !selectedTime) {
      Alert.alert('Campos requeridos', 'Selecciona servicio, fecha y hora.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const appointmentType = selectedService.modality === 'both' ? 'presencial' : selectedService.modality;
      const res = await webApiFetch('/api/stripe/checkout', session, {
        method: 'POST',
        body: JSON.stringify({
          service_amount: selectedService.cost,
          professional_id: professionalId,
          appointment_date: selectedDate,
          appointment_time: selectedTime,
          appointment_type: appointmentType,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al crear la reserva');
      }

      const url = data.url;
      if (url) {
        const result = await WebBrowser.openBrowserAsync(url);
        if (result.type === 'cancel') {
          Alert.alert(
            'Pago pendiente',
            'Si no completaste el pago, tu cita no se ha reservado. Puedes intentar de nuevo.',
            [{ text: 'Entendido' }]
          );
        }
        // En éxito, el deep link holistia://checkout-success navega a confirmación automáticamente
      } else {
        throw new Error('No se recibió enlace de pago');
      }
    } catch (err: any) {
      const msg = err?.message ?? 'Error al reservar';
      setError(msg);
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  if (!session) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Text style={[styles.error, { color: c.foreground }]}>Inicia sesión para reservar</Text>
        <Button title="Volver" onPress={() => router.back()} style={{ marginTop: 16 }} />
      </View>
    );
  }

  if (services.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Text style={[styles.error, { color: c.foreground }]}>No hay servicios disponibles</Text>
        <Button title="Volver" onPress={() => router.back()} style={{ marginTop: 16 }} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: c.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: c.foreground }]}>Reservar con {professionalName}</Text>

        <Text style={[styles.label, { color: c.foreground }]}>Servicio *</Text>
        <View style={styles.serviceList}>
          {services.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => setSelectedService(s)}
              style={[styles.serviceCard, { backgroundColor: c.card, borderColor: selectedService?.id === s.id ? c.primary : c.border }]}
            >
              <Text style={[styles.serviceName, { color: c.foreground }]}>{s.name}</Text>
              <Text style={[styles.serviceMeta, { color: c.mutedForeground }]}>
                {s.duration} min · ${s.cost.toLocaleString()} MXN
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.label, { color: c.foreground }]}>Fecha *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.datesScroll}>
          {availableDates.map((d) => (
            <Pressable
              key={d.date}
              onPress={() => setSelectedDate(d.date)}
              style={[styles.dateChip, { backgroundColor: selectedDate === d.date ? c.primary : c.card, borderColor: c.border }]}
            >
              <Text style={[styles.dateChipText, { color: selectedDate === d.date ? c.primaryForeground : c.foreground }]}>{d.display}</Text>
              <Text style={[styles.dateChipSub, { color: selectedDate === d.date ? c.primaryForeground : c.mutedForeground }]}>
                {d.date.split('-')[2]}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {selectedDate && selectedService && (
          <>
            <Text style={[styles.label, { color: c.foreground }]}>Hora *</Text>
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

        <Input label="Notas (opcional)" value={notes} onChangeText={setNotes} placeholder="Ej: Preferir sala privada" />

        {error ? <Text style={[styles.errText, { color: c.destructive }]}>{error}</Text> : null}

        <Button
          title={submitting ? 'Procesando...' : 'Reservar y pagar'}
          onPress={handleReserve}
          loading={submitting}
          disabled={!selectedService || !selectedDate || !selectedTime || submitting}
          style={styles.submitBtn}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  serviceList: { marginBottom: 20 },
  serviceCard: { padding: 14, borderRadius: 12, borderWidth: 2, marginBottom: 8 },
  serviceName: { fontSize: 16, fontWeight: '600' },
  serviceMeta: { fontSize: 13, marginTop: 4 },
  datesScroll: { marginBottom: 20 },
  dateChip: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, marginRight: 8, minWidth: 70, alignItems: 'center' },
  dateChipText: { fontSize: 14, fontWeight: '600' },
  dateChipSub: { fontSize: 12, marginTop: 2 },
  slotsLoad: { marginVertical: 16 },
  hint: { fontSize: 14, marginBottom: 16 },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  slotBtn: { minWidth: 80 },
  errText: { fontSize: 14, marginBottom: 16 },
  error: { fontSize: 16 },
  submitBtn: { marginTop: 8 },
});
