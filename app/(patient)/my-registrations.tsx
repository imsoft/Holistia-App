import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useAuthStore } from '@/stores/auth-store';
import { supabase } from '@/lib/supabase';
import { webApiFetch } from '@/lib/web-api';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { EmptyState } from '@/components/ui/empty-state';

export default function MyRegistrationsScreen() {
  const session = useAuthStore((s) => s.session);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedbackGivenIds, setFeedbackGivenIds] = useState<Set<string>>(new Set());
  const [feedbackModal, setFeedbackModal] = useState<{
    eventId: string;
    eventName: string;
    eventRegistrationId: string;
  } | null>(null);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const colorScheme = useColorScheme();
  const c = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const load = useCallback(async (isRefresh = false) => {
    if (!session?.user?.id) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data } = await supabase
        .from('event_registrations')
        .select(
          `id, event_id, status, created_at,
           events_workshops(id, name, event_date, image_url)`
        )
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      setRegistrations(data || []);

      const { data: fbData } = await supabase
        .from('event_feedback')
        .select('event_registration_id')
        .eq('user_id', session.user.id);
      setFeedbackGivenIds(
        new Set((fbData || []).map((r: { event_registration_id: string }) => r.event_registration_id))
      );
    } catch (e) {
      console.error('My registrations error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.user?.id]);

  const submitEventFeedback = async () => {
    if (
      !session ||
      !feedbackModal ||
      feedbackRating < 1 ||
      feedbackRating > 5 ||
      feedbackSubmitting
    )
      return;
    setFeedbackSubmitting(true);
    try {
      const res = await webApiFetch(
        `/api/events/${feedbackModal.eventId}/feedback`,
        session,
        {
          method: 'POST',
          body: JSON.stringify({
            event_registration_id: feedbackModal.eventRegistrationId,
            rating: feedbackRating,
            comment: feedbackComment.trim() || undefined,
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Error al enviar');
      setFeedbackGivenIds((prev) =>
        new Set(prev).add(feedbackModal.eventRegistrationId)
      );
      setFeedbackModal(null);
      setFeedbackRating(0);
      setFeedbackComment('');
      Alert.alert('Gracias', 'Tu feedback ha sido registrado.');
      load(true);
    } catch (e: unknown) {
      Alert.alert('Error', (e as Error)?.message ?? 'No se pudo enviar el feedback.');
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  useEffect(() => {
    if (session) load();
  }, [session?.user?.id]);

  const isEventPast = (eventDate: string) => {
    const [y, m, d] = eventDate.split('-').map(Number);
    const d2 = new Date(y, m - 1, d);
    d2.setHours(23, 59, 59);
    return d2 < new Date();
  };

  const renderItem = ({ item }: { item: any }) => {
    const event = Array.isArray(item.events_workshops) ? item.events_workshops[0] : item.events_workshops || {};
    const date = event.event_date
      ? new Date(event.event_date).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
      : '';
    const past = event.event_date ? isEventPast(event.event_date) : false;
    const canFeedback =
      past &&
      item.status === 'confirmed' &&
      !feedbackGivenIds.has(item.id);

    return (
      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
        {event.image_url ? (
          <Image source={{ uri: event.image_url }} style={styles.cover} contentFit="cover" />
        ) : (
          <View style={[styles.cover, { backgroundColor: c.muted }]} />
        )}
        <Text style={[styles.title, { color: c.foreground }]} numberOfLines={2}>{event.name || 'Evento'}</Text>
        <Text style={[styles.date, { color: c.mutedForeground }]}>{date}</Text>
        {canFeedback && (
          <Pressable
            onPress={() =>
              setFeedbackModal({
                eventId: item.event_id,
                eventName: event.name || 'Evento',
                eventRegistrationId: item.id,
              })
            }
            style={[styles.feedbackBtn, { borderColor: c.primary }]}>
            <MaterialIcons name="star" size={18} color={c.primary} />
            <Text style={[styles.feedbackBtnText, { color: c.primary }]}>Dar feedback</Text>
          </Pressable>
        )}
      </View>
    );
  };

  if (loading && registrations.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <Modal
        visible={!!feedbackModal}
        transparent
        animationType="fade"
        onRequestClose={() => setFeedbackModal(null)}>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setFeedbackModal(null)}>
          <Pressable
            style={[styles.modalContent, { backgroundColor: c.card }]}
            onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: c.foreground }]}>
              ¿Cómo fue &quot;{feedbackModal?.eventName}&quot;?
            </Text>
            <Text style={[styles.modalSubtitle, { color: c.mutedForeground }]}>
              Tu opinión ayuda a mejorar futuros eventos
            </Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((value) => (
                <Pressable
                  key={value}
                  onPress={() => setFeedbackRating(value)}
                  style={{ padding: 4 }}>
                  <MaterialIcons
                    name={value <= feedbackRating ? 'star' : 'star-border'}
                    size={36}
                    color="#eab308"
                  />
                </Pressable>
              ))}
            </View>
            <TextInput
              style={[styles.modalInput, { backgroundColor: c.background, color: c.foreground, borderColor: c.border }]}
              placeholder="Comentario (opcional)"
              placeholderTextColor={c.mutedForeground}
              value={feedbackComment}
              onChangeText={setFeedbackComment}
              multiline
              maxLength={500}
            />
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setFeedbackModal(null)}
                disabled={feedbackSubmitting}
                style={[styles.modalBtn, { borderColor: c.border }]}>
                <Text style={{ color: c.foreground }}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={submitEventFeedback}
                disabled={feedbackRating < 1 || feedbackSubmitting}
                style={[styles.modalBtn, styles.modalBtnPrimary, { backgroundColor: c.primary }]}>
                {feedbackSubmitting ? (
                  <ActivityIndicator size="small" color={c.primaryForeground} />
                ) : (
                  <Text style={{ color: c.primaryForeground, fontWeight: '600' }}>Enviar</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      <FlatList
        data={registrations}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.primary} />}
        ListEmptyComponent={
          <EmptyState
            icon="confirmation-number"
            title="No te has inscrito a eventos aún"
            subtitle="Explora talleres y eventos para inscribirte."
            actionLabel="Ver eventos"
            onAction={() => router.push('/(patient)/events' as any)}
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

MyRegistrationsScreen.options = { title: 'Mis inscripciones' };

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 20, paddingBottom: 40 },
  card: { borderRadius: 12, borderWidth: 1, marginBottom: 12, overflow: 'hidden' },
  cover: { height: 100, width: '100%' },
  title: { fontSize: 16, fontWeight: '600', padding: 12 },
  date: { fontSize: 14, paddingHorizontal: 12, paddingBottom: 8 },
  feedbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginHorizontal: 12,
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  feedbackBtnText: { fontSize: 14, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: { width: '100%', maxWidth: 400, borderRadius: 16, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 4 },
  modalSubtitle: { fontSize: 14, marginBottom: 16 },
  starsRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 16 },
  modalInput: { borderWidth: 1, borderRadius: 8, padding: 12, minHeight: 80, marginBottom: 16, fontSize: 14 },
  modalActions: { flexDirection: 'row', gap: 12, justifyContent: 'flex-end' },
  modalBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, borderWidth: 1 },
  modalBtnPrimary: { borderWidth: 0 },
  author: { fontSize: 13, padding: 12, paddingTop: 4 },
});
