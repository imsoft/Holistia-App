import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, Alert, TextInput } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { useAuthStore } from '@/stores/auth-store';
import { supabase } from '@/lib/supabase';
import { webApiFetch } from '@/lib/web-api';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente de pago',
  paid: 'Pagada',
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
  patient_no_show: 'No asististe',
  professional_no_show: 'Profesional no asistió',
};

export default function AppointmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useAuthStore((s) => s.session);
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const [appointment, setAppointment] = useState<any>(null);
  const [professional, setProfessional] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [payLoading, setPayLoading] = useState(false);
  const [hasFeedback, setHasFeedback] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  useEffect(() => {
    if (!id || !session?.user?.id) return;
    (async () => {
      const { data: apt, error: aptErr } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', id)
        .eq('patient_id', session.user.id)
        .single();
      if (aptErr || !apt) {
        setLoading(false);
        return;
      }
      setAppointment(apt);
      const { data: prof } = await supabase
        .from('professional_applications')
        .select('id, first_name, last_name, profession, profile_photo')
        .eq('id', apt.professional_id)
        .single();
      setProfessional(prof);
      const { data: fb } = await supabase
        .from('appointment_feedback')
        .select('id')
        .eq('appointment_id', id)
        .maybeSingle();
      setHasFeedback(!!fb);
      setLoading(false);
    })();
  }, [id, session?.user?.id]);

  const submitFeedback = async () => {
    if (!id || !session || feedbackRating < 1 || feedbackRating > 3 || feedbackSubmitting) return;
    setFeedbackSubmitting(true);
    try {
      const res = await webApiFetch(`/api/appointments/${id}/feedback`, session, {
        method: 'POST',
        body: JSON.stringify({ rating: feedbackRating, comment: feedbackComment.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Error al enviar');
      setHasFeedback(true);
      Alert.alert('Gracias', 'Tu feedback ha sido registrado.');
    } catch (e: unknown) {
      Alert.alert('Error', (e as Error)?.message ?? 'No se pudo enviar el feedback.');
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const canCancel = appointment && !['cancelled', 'completed', 'patient_no_show', 'professional_no_show'].includes(appointment.status);
  const canReschedule = canCancel;
  const canPay = appointment?.status === 'pending';
  const canNoShow = appointment && ['confirmed', 'paid'].includes(appointment.status) && isAppointmentPast(appointment);

  const handlePay = async () => {
    if (!session || !appointment || !professional) return;
    setPayLoading(true);
    try {
      const res = await webApiFetch('/api/stripe/checkout', session, {
        method: 'POST',
        body: JSON.stringify({
          appointment_id: appointment.id,
          service_amount: appointment.cost,
          professional_id: appointment.professional_id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      if (data.url) {
        await WebBrowser.openBrowserAsync(data.url);
        // La app recibe deep link holistia://checkout-success o checkout-cancel y navega automáticamente
        // No hacemos router.replace aquí para no pisar la navegación del deep link
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo abrir el pago.');
    } finally {
      setPayLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  if (!appointment) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Text style={[styles.error, { color: c.foreground }]}>Cita no encontrada</Text>
        <Pressable onPress={() => router.back()} style={[styles.btn, { borderColor: c.border }]}>
          <Text style={{ color: c.foreground }}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  const name = professional ? `${professional.first_name || ''} ${professional.last_name || ''}`.trim() : 'Profesional';
  const dateStr = appointment.appointment_date
    ? new Date(appointment.appointment_date).toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : '';
  const timeStr = appointment.appointment_time ? String(appointment.appointment_time).slice(0, 5) : '';

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.background }]} contentContainerStyle={styles.content}>
      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={styles.profRow}>
          <Image
            source={{ uri: professional?.profile_photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}` }}
            style={styles.avatar}
          />
          <View>
            <Text style={[styles.name, { color: c.foreground }]}>{name}</Text>
            {professional?.profession && (
              <Text style={[styles.profession, { color: c.mutedForeground }]}>{professional.profession}</Text>
            )}
          </View>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.label, { color: c.mutedForeground }]}>Fecha</Text>
          <Text style={[styles.value, { color: c.foreground }]}>{dateStr}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.label, { color: c.mutedForeground }]}>Hora</Text>
          <Text style={[styles.value, { color: c.foreground }]}>{timeStr}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.label, { color: c.mutedForeground }]}>Estado</Text>
          <Text style={[styles.value, { color: c.primary }]}>{STATUS_LABELS[appointment.status] || appointment.status}</Text>
        </View>
        {appointment.cost != null && (
          <View style={styles.detailRow}>
            <Text style={[styles.label, { color: c.mutedForeground }]}>Costo</Text>
            <Text style={[styles.value, { color: c.foreground }]}>${Number(appointment.cost).toLocaleString()} MXN</Text>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        {canPay && (
          <Pressable
            onPress={handlePay}
            disabled={payLoading}
            style={[styles.actionBtn, { backgroundColor: c.primary }]}
          >
            <Text style={[styles.actionText, { color: c.primaryForeground }]}>
              {payLoading ? 'Procesando...' : 'Pagar cita'}
            </Text>
          </Pressable>
        )}
        {canCancel && (
          <Pressable onPress={() => router.push(`/appointments/${id}/cancel`)} style={[styles.actionBtn, { borderColor: c.destructive }]}>
            <Text style={[styles.actionText, { color: c.destructive }]}>Cancelar cita</Text>
          </Pressable>
        )}
        {canReschedule && (
          <Pressable onPress={() => router.push(`/appointments/${id}/reschedule`)} style={[styles.actionBtn, { borderColor: c.border }]}>
            <Text style={[styles.actionText, { color: c.foreground }]}>Reprogramar</Text>
          </Pressable>
        )}
        {canNoShow && (
          <Pressable onPress={() => router.push(`/appointments/${id}/no-show`)} style={[styles.actionBtn, { borderColor: c.border }]}>
            <Text style={[styles.actionText, { color: c.foreground }]}>Marcar que no asistió el profesional</Text>
          </Pressable>
        )}
      </View>

      {appointment?.status === 'completed' && !hasFeedback && (
        <View style={[styles.feedbackCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.feedbackTitle, { color: c.foreground }]}>¿Todo bien con tu cita?</Text>
          <View style={styles.feedbackButtons}>
            {[
              { value: 1, label: 'Sí' },
              { value: 2, label: 'Más o menos' },
              { value: 3, label: 'No' },
            ].map(({ value, label }) => (
              <Pressable
                key={value}
                onPress={() => setFeedbackRating(value)}
                style={[
                  styles.feedbackBtn,
                  feedbackRating === value && { backgroundColor: c.primary },
                  { borderColor: c.border },
                ]}>
                <Text style={[styles.feedbackBtnText, { color: feedbackRating === value ? c.primaryForeground : c.foreground }]}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            style={[styles.feedbackInput, { backgroundColor: c.background, color: c.foreground, borderColor: c.border }]}
            placeholder="Comentario (opcional)"
            placeholderTextColor={c.mutedForeground}
            value={feedbackComment}
            onChangeText={setFeedbackComment}
            multiline
            maxLength={500}
          />
          <Pressable
            onPress={submitFeedback}
            disabled={feedbackRating < 1 || feedbackSubmitting}
            style={[styles.feedbackSubmit, { backgroundColor: c.primary }, (feedbackRating < 1 || feedbackSubmitting) && styles.disabled]}>
            {feedbackSubmitting ? (
              <ActivityIndicator size="small" color={c.primaryForeground} />
            ) : (
              <Text style={[styles.feedbackSubmitText, { color: c.primaryForeground }]}>Enviar feedback</Text>
            )}
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

function isAppointmentPast(apt: any): boolean {
  const d = String(apt.appointment_date).split('T')[0].split('-').map(Number);
  const t = String(apt.appointment_time).slice(0, 5).split(':').map(Number);
  const aptDate = new Date(d[0], d[1] - 1, d[2], t[0], t[1]);
  return aptDate < new Date();
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20, paddingBottom: 40 },
  card: { padding: 20, borderRadius: 12, borderWidth: 1, marginBottom: 20 },
  profRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: { width: 56, height: 56, borderRadius: 28, marginRight: 12 },
  name: { fontSize: 18, fontWeight: '600' },
  profession: { fontSize: 14, marginTop: 2 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(128,128,128,0.2)' },
  label: { fontSize: 14 },
  value: { fontSize: 14, fontWeight: '500' },
  actions: { gap: 12 },
  actionBtn: { padding: 16, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  actionText: { fontSize: 16, fontWeight: '600' },
  error: { fontSize: 16 },
  btn: { marginTop: 16, padding: 14, borderRadius: 10, borderWidth: 1 },
  feedbackCard: { padding: 20, borderRadius: 12, borderWidth: 1, marginTop: 20 },
  feedbackTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  feedbackButtons: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  feedbackBtn: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  feedbackBtnText: { fontSize: 14, fontWeight: '500' },
  feedbackInput: { borderWidth: 1, borderRadius: 8, padding: 12, minHeight: 80, marginBottom: 12, fontSize: 14 },
  feedbackSubmit: { padding: 14, borderRadius: 10, alignItems: 'center' },
  feedbackSubmitText: { fontSize: 16, fontWeight: '600' },
  disabled: { opacity: 0.5 },
});
