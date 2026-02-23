import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  Linking,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '@/stores/auth-store';
import { supabase } from '@/lib/supabase';
import { webApiFetch } from '@/lib/web-api';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface Checkin {
  id: string;
  day_number: number;
  checkin_date: string;
  evidence_type: string;
  evidence_url?: string;
  notes?: string;
  points_earned: number;
}

interface Resource {
  id: string;
  title: string;
  description?: string;
  resource_type: string;
  url: string;
}

interface Meeting {
  id: string;
  title: string;
  description?: string;
  meeting_url: string;
  scheduled_date: string;
  scheduled_time: string;
  platform?: string;
}

export default function EnrolledChallengeDetailScreen() {
  const { id: purchaseId } = useLocalSearchParams<{ id: string }>();
  const session = useAuthStore((s) => s.session);
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const [purchase, setPurchase] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [loadingMeetings, setLoadingMeetings] = useState(false);
  const [participants, setParticipants] = useState<
    Array<{ id: string; first_name: string | null; last_name: string | null; avatar_url: string | null; type?: string | null }>
  >([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [evidenceUri, setEvidenceUri] = useState<string | null>(null);
  const [evidenceType, setEvidenceType] = useState<'photo' | 'video' | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const challenge = purchase?.challenge;
  const challengeId = challenge?.id;
  const startRef = purchase?.started_at || purchase?.created_at;
  const scheduleDays: number[] = purchase?.schedule_days ?? [];
  const durationDays = challenge?.duration_days ?? 30;

  const nextDayNumber = (() => {
    if (!startRef) return 1;
    const start = new Date(startRef);
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const todayParsed = new Date(todayStr + 'T12:00:00Z');
    const startOnly = { y: start.getUTCFullYear(), m: start.getUTCMonth(), d: start.getUTCDate() };
    const todayOnly = { y: todayParsed.getUTCFullYear(), m: todayParsed.getUTCMonth(), d: todayParsed.getUTCDate() };
    const diffDays = Math.floor(
      (Date.UTC(todayOnly.y, todayOnly.m, todayOnly.d) - Date.UTC(startOnly.y, startOnly.m, startOnly.d)) /
        (24 * 60 * 60 * 1000)
    );
    return Math.min(Math.max(diffDays + 1, 1), durationDays);
  })();

  const loadPurchase = useCallback(async (): Promise<{ challengeId: string; challenge?: any } | null> => {
    if (!purchaseId || !session?.user?.id) return null;
    try {
      const { data, error } = await supabase
        .from('challenge_purchases')
        .select(
          `id, challenge_id, access_granted, started_at, created_at, schedule_days,
           challenges(id, title, cover_image_url, duration_days, created_by_type, created_by_user_id,
             professional_applications(first_name, last_name))`
        )
        .eq('id', purchaseId)
        .eq('participant_id', session.user.id)
        .single();
      if (error || !data) {
        Alert.alert('Error', 'No se encontró el reto');
        router.back();
        return null;
      }
      const ch = Array.isArray(data.challenges) ? data.challenges[0] : data.challenges;
      setPurchase({ ...data, challenge: ch });
      return { challengeId: data.challenge_id ?? ch?.id, challenge: ch };
    } catch (e) {
      console.error(e);
      router.back();
      return null;
    } finally {
      setLoading(false);
    }
  }, [purchaseId, session?.user?.id]);

  const fetchParticipants = useCallback(async (challengeId: string, createdByType?: string, createdByUserId?: string) => {
    try {
      const { data: purchases, error } = await supabase
        .from('challenge_purchases')
        .select('participant_id')
        .eq('challenge_id', challengeId)
        .eq('access_granted', true);
      if (error) throw error;
      let participantIds = [...new Set((purchases || []).map((p: any) => p.participant_id).filter(Boolean))];
      if (createdByType === 'professional' && createdByUserId && !participantIds.includes(createdByUserId)) {
        participantIds = [...participantIds, createdByUserId];
      }
      if (participantIds.length === 0) {
        setParticipants([]);
        return;
      }
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, type')
        .in('id', participantIds);
      if (profilesError) throw profilesError;
      const professionalIds = (profilesData || []).filter((p: any) => p.type === 'professional').map((p: any) => p.id);
      const photoMap = new Map<string, string>();
      if (professionalIds.length > 0) {
        const { data: proApps } = await supabase
          .from('professional_applications')
          .select('user_id, profile_photo')
          .in('user_id', professionalIds);
        (proApps || []).forEach((pa: any) => {
          if (pa.profile_photo) photoMap.set(pa.user_id, pa.profile_photo);
        });
      }
      setParticipants(
        (profilesData || []).map((p: any) => ({
          id: p.id,
          first_name: p.first_name ?? null,
          last_name: p.last_name ?? null,
          avatar_url: photoMap.get(p.id) ?? p.avatar_url ?? null,
          type: p.type ?? null,
        }))
      );
    } catch (e) {
      console.error('Participants error:', e);
      setParticipants([]);
    }
  }, []);

  const fetchCheckins = useCallback(async () => {
    if (!purchaseId || !session) return;
    try {
      const res = await webApiFetch(`/api/challenges/checkins?challenge_purchase_id=${purchaseId}`, session);
      const data = await res.json().catch(() => ({}));
      if (res.ok) setCheckins(data.checkins || []);
    } catch (e) {
      console.error('Checkins error:', e);
    }
  }, [purchaseId, session]);

  const load = useCallback(async (isRefresh = false) => {
    if (!purchaseId || !session) return;
    if (isRefresh) setRefreshing(true);
    const result = await loadPurchase();
    await fetchCheckins();
    if (result?.challengeId && session) {
      setLoadingResources(true);
      setLoadingMeetings(true);
      try {
        fetchParticipants(result.challengeId, result.challenge?.created_by_type, result.challenge?.created_by_user_id);
        const [rResp, mResp] = await Promise.all([
          webApiFetch(`/api/challenges/${result.challengeId}/resources`, session),
          webApiFetch(`/api/challenges/${result.challengeId}/meetings`, session),
        ]);
        const rData = await rResp.json().catch(() => ({}));
        const mData = await mResp.json().catch(() => ({}));
        if (rResp.ok) setResources(rData.resources || []);
        if (mResp.ok) setMeetings(mData.meetings || []);
      } finally {
        setLoadingResources(false);
        setLoadingMeetings(false);
      }
    }
    if (isRefresh) setRefreshing(false);
  }, [loadPurchase, purchaseId, session, fetchCheckins, fetchParticipants]);

  useEffect(() => {
    if (purchaseId && session) {
      setLoading(true);
      load();
    } else {
      setLoading(false);
    }
  }, [purchaseId, session?.user?.id]);

  const handlePickMedia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso necesario', 'Necesitamos acceso a tus fotos para subir evidencia.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
      videoMaxDuration: 30,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setEvidenceUri(asset.uri);
    setEvidenceType(asset.type === 'video' ? 'video' : 'photo');
  };

  const uploadEvidence = async (): Promise<string | null> => {
    if (!evidenceUri || !evidenceType || !purchaseId || !session) return null;
    setUploading(true);
    try {
      const ext = evidenceUri.split('.').pop() || (evidenceType === 'video' ? 'mp4' : 'jpg');
      const fileName = `evidence-${Date.now()}.${ext}`;
      const formData = new FormData();
      formData.append('file', {
        uri: evidenceUri,
        name: fileName,
        type: evidenceType === 'video' ? 'video/mp4' : 'image/jpeg',
      } as any);
      formData.append('challenge_purchase_id', purchaseId);
      formData.append('evidence_type', evidenceType);

      const res = await webApiFetch('/api/challenges/checkins/upload', session, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Error al subir');
      return data.url ?? null;
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo subir el archivo');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitCheckin = async () => {
    if (!notes.trim() && !evidenceUri) {
      Alert.alert('Requerido', 'Agrega una descripción o sube una foto/video.');
      return;
    }
    if (!purchaseId || !session) return;

    setSubmitting(true);
    try {
      let evidenceUrl: string | null = null;
      if (evidenceUri && evidenceType) {
        evidenceUrl = await uploadEvidence();
        if (!evidenceUrl) {
          setSubmitting(false);
          return;
        }
      }

      const now = new Date();
      const checkinDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      const res = await webApiFetch('/api/challenges/checkins', session, {
        method: 'POST',
        body: JSON.stringify({
          challenge_purchase_id: purchaseId,
          checkin_date: checkinDate,
          evidence_type: evidenceUrl && evidenceType ? evidenceType : 'text',
          evidence_url: evidenceUrl,
          notes: notes.trim() || null,
          is_public: false,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Error al crear el check-in');

      setModalOpen(false);
      setNotes('');
      setEvidenceUri(null);
      setEvidenceType(null);
      await fetchCheckins();
      await loadPurchase();
      Alert.alert('¡Listo!', `Check-in completado. +${data.checkin?.points_earned ?? 0} puntos`);
      if (data.completed && data.challenge_purchase_id) {
        router.replace(`/(patient)/my-challenges/completed?challenge=${data.challenge_purchase_id}` as any);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo guardar el check-in');
    } finally {
      setSubmitting(false);
    }
  };

  const openUrl = (url: string) => {
    if (url) Linking.openURL(url);
  };

  if (loading && !purchase) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  if (!purchase) return null;

  const daysCompleted = checkins.length;
  const prof = challenge?.professional_applications;
  const profName = prof ? `${prof.first_name || ''} ${prof.last_name || ''}`.trim() : '';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.primary} />
      }>
      <Pressable onPress={() => router.back()} style={styles.backRow}>
        <Text style={[styles.backText, { color: c.primary }]}>← Mis retos</Text>
      </Pressable>

      {challenge?.cover_image_url ? (
        <Image source={{ uri: challenge.cover_image_url }} style={styles.cover} contentFit="cover" />
      ) : (
        <View style={[styles.coverPlaceholder, { backgroundColor: c.muted }]} />
      )}

      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: c.foreground }]}>{challenge?.title || 'Reto'}</Text>
          {profName ? <Text style={[styles.author, { color: c.mutedForeground }]}>{profName}</Text> : null}
        </View>
        {session?.user?.id && challenge?.created_by_user_id === session.user.id && (
          <Pressable
            onPress={() => router.push(`/(patient)/my-challenges/edit/${challengeId}` as any)}
            style={[styles.editBtn, { borderColor: c.primary }]}>
            <Text style={[styles.editBtnText, { color: c.primary }]}>Editar</Text>
          </Pressable>
        )}
      </View>

      <View style={[styles.progressCard, { backgroundColor: c.card, borderColor: c.border }]}>
        <Text style={[styles.sectionTitle, { color: c.foreground }]}>Progreso</Text>
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${Math.min(100, (daysCompleted / durationDays) * 100)}%`,
                backgroundColor: c.primary,
              },
            ]}
          />
        </View>
        <Text style={[styles.progressText, { color: c.mutedForeground }]}>
          {daysCompleted} / {durationDays} días
        </Text>
      </View>

      {/* Check-ins */}
      <View style={[styles.section, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: c.foreground }]}>Check-ins</Text>
          <Pressable
            onPress={() => setModalOpen(true)}
            disabled={!purchase.access_granted}
            style={[styles.addBtn, { backgroundColor: c.primary }]}>
            <Text style={styles.addBtnText}>Nuevo check-in</Text>
          </Pressable>
        </View>
        {checkins.length === 0 ? (
          <Text style={[styles.emptyText, { color: c.mutedForeground }]}>Aún no hay check-ins</Text>
        ) : (
          <View style={styles.checkinList}>
            {checkins.map((ck) => (
              <View key={ck.id} style={[styles.checkinRow, { borderColor: c.border }]}>
                <Text style={[styles.checkinDay, { color: c.foreground }]}>Día {ck.day_number}</Text>
                {ck.notes ? <Text style={[styles.checkinNotes, { color: c.mutedForeground }]} numberOfLines={2}>{ck.notes}</Text> : null}
                {ck.evidence_url && ck.evidence_type === 'photo' ? (
                  <Image source={{ uri: ck.evidence_url }} style={styles.thumb} />
                ) : null}
                <Text style={[styles.checkinMeta, { color: c.mutedForeground }]}>
                  +{ck.points_earned} pts · {new Date(ck.checkin_date + 'T12:00:00Z').toLocaleDateString('es-MX')}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Recursos */}
      <View style={[styles.section, { backgroundColor: c.card, borderColor: c.border }]}>
        <Text style={[styles.sectionTitle, { color: c.foreground }]}>Recursos</Text>
        {loadingResources ? (
          <ActivityIndicator size="small" color={c.primary} style={styles.loader} />
        ) : resources.length === 0 ? (
          <Text style={[styles.emptyText, { color: c.mutedForeground }]}>No hay recursos</Text>
        ) : (
          resources.map((r) => (
            <Pressable
              key={r.id}
              onPress={() => openUrl(r.url)}
              style={[styles.resourceRow, { borderColor: c.border }]}>
              <Text style={[styles.resourceTitle, { color: c.foreground }]}>{r.title}</Text>
              <Text style={[styles.resourceLink, { color: c.primary }]}>Abrir recurso →</Text>
            </Pressable>
          ))
        )}
      </View>

      {/* Reuniones */}
      <View style={[styles.section, { backgroundColor: c.card, borderColor: c.border }]}>
        <Text style={[styles.sectionTitle, { color: c.foreground }]}>Reuniones</Text>
        {loadingMeetings ? (
          <ActivityIndicator size="small" color={c.primary} style={styles.loader} />
        ) : meetings.length === 0 ? (
          <Text style={[styles.emptyText, { color: c.mutedForeground }]}>No hay reuniones programadas</Text>
        ) : (
          meetings.map((m) => (
            <Pressable
              key={m.id}
              onPress={() => openUrl(m.meeting_url)}
              style={[styles.meetingRow, { borderColor: c.border }]}>
              <Text style={[styles.meetingTitle, { color: c.foreground }]}>{m.title}</Text>
              <Text style={[styles.meetingMeta, { color: c.mutedForeground }]}>
                {m.scheduled_date} {m.scheduled_time}
              </Text>
              <Text style={[styles.meetingLink, { color: c.primary }]}>Unirse →</Text>
            </Pressable>
          ))
        )}
      </View>

      {/* Participantes */}
      {participants.length > 0 && (
        <View style={[styles.section, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.sectionTitle, { color: c.foreground }]}>Participantes</Text>
          <View style={styles.participantsGrid}>
            {participants.map((p) => {
              const name = [p.first_name, p.last_name].filter(Boolean).join(' ').trim() || 'Usuario';
              return (
                <Pressable
                  key={p.id}
                  onPress={() => router.push(`/(patient)/profile/${p.id}` as any)}
                  style={({ pressed }) => [styles.participantCard, { borderColor: c.border }, pressed && styles.pressed]}>
                  {p.avatar_url ? (
                    <Image source={{ uri: p.avatar_url }} style={styles.participantAvatar} />
                  ) : (
                    <View style={[styles.participantAvatarPlaceholder, { backgroundColor: c.muted }]}>
                      <Text style={[styles.participantInitials, { color: c.mutedForeground }]}>
                        {name
                          .split(' ')
                          .map((s) => s[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase() || '?'}
                      </Text>
                    </View>
                  )}
                  <Text style={[styles.participantName, { color: c.foreground }]} numberOfLines={1}>
                    {name}
                  </Text>
                  <Text style={[styles.participantType, { color: c.mutedForeground }]}>
                    {p.type === 'professional' ? 'Profesional' : p.type === 'admin' ? 'Admin' : 'Paciente'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      <View style={{ height: 40 }} />

      {/* Modal check-in */}
      <Modal visible={modalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: c.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.foreground }]}>Check-in Día {nextDayNumber}</Text>
              <Pressable onPress={() => setModalOpen(false)}>
                <Text style={[styles.modalClose, { color: c.primary }]}>Cerrar</Text>
              </Pressable>
            </View>
            <TextInput
              placeholder="¿Qué hiciste hoy? (opcional)"
              placeholderTextColor={c.mutedForeground}
              value={notes}
              onChangeText={setNotes}
              multiline
              style={[styles.input, { color: c.foreground, borderColor: c.border, backgroundColor: c.card }]}
            />
            <View style={styles.evidenceRow}>
              {evidenceUri ? (
                <View style={styles.evidencePreview}>
                  {evidenceType === 'photo' ? (
                    <Image source={{ uri: evidenceUri }} style={styles.previewImg} />
                  ) : (
                    <Text style={[styles.previewVideo, { color: c.mutedForeground }]}>Video seleccionado</Text>
                  )}
                  <Pressable onPress={() => { setEvidenceUri(null); setEvidenceType(null); }} style={styles.removeEvidence}>
                    <Text style={[styles.removeText, { color: c.destructive }]}>Quitar</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={handlePickMedia}
                  disabled={uploading}
                  style={[styles.pickBtn, { borderColor: c.border }]}>
                  {uploading ? (
                    <ActivityIndicator size="small" color={c.primary} />
                  ) : (
                    <Text style={[styles.pickText, { color: c.primary }]}>Foto o video (máx 30 s)</Text>
                  )}
                </Pressable>
              )}
            </View>
            <Pressable
              onPress={handleSubmitCheckin}
              disabled={submitting || uploading}
              style={[styles.submitBtn, { backgroundColor: c.primary }]}>
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Guardar check-in</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backRow: { padding: 16 },
  backText: { fontSize: 15 },
  cover: { width: '100%', height: 180 },
  coverPlaceholder: { width: '100%', height: 180 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    paddingTop: 8,
  },
  headerText: { flex: 1 },
  title: { fontSize: 22, fontWeight: '700' },
  author: { fontSize: 14, marginTop: 4 },
  editBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1 },
  editBtnText: { fontSize: 14, fontWeight: '600' },
  progressCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  progressBarBg: { height: 8, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 4, overflow: 'hidden', marginTop: 8 },
  progressBarFill: { height: '100%', borderRadius: 4 },
  progressText: { fontSize: 13, marginTop: 8 },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '600' },
  addBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  emptyText: { fontSize: 14, fontStyle: 'italic' },
  checkinList: { gap: 12 },
  checkinRow: { borderLeftWidth: 3, borderLeftColor: 'green', paddingLeft: 12, paddingVertical: 8 },
  checkinDay: { fontWeight: '600', fontSize: 15 },
  checkinNotes: { fontSize: 14, marginTop: 4 },
  thumb: { width: 80, height: 80, borderRadius: 8, marginTop: 8 },
  checkinMeta: { fontSize: 12, marginTop: 4 },
  loader: { marginVertical: 16 },
  resourceRow: { paddingVertical: 12, borderBottomWidth: 1 },
  resourceTitle: { fontSize: 15, fontWeight: '500' },
  resourceLink: { fontSize: 14, marginTop: 4 },
  meetingRow: { paddingVertical: 12, borderBottomWidth: 1 },
  meetingTitle: { fontSize: 15, fontWeight: '500' },
  meetingMeta: { fontSize: 13, marginTop: 2 },
  meetingLink: { fontSize: 14, marginTop: 4 },
  participantsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  participantCard: {
    width: '47%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  participantAvatar: { width: 48, height: 48, borderRadius: 24, marginBottom: 8 },
  participantAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  participantInitials: { fontSize: 16, fontWeight: '600' },
  participantName: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  participantType: { fontSize: 12, marginTop: 2 },
  pressed: { opacity: 0.9 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalClose: { fontSize: 16 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    minHeight: 80,
    fontSize: 15,
  },
  evidenceRow: { marginTop: 16 },
  evidencePreview: { alignItems: 'flex-start' },
  previewImg: { width: 120, height: 90, borderRadius: 8 },
  previewVideo: { fontSize: 14 },
  removeEvidence: { marginTop: 8 },
  removeText: { fontSize: 14 },
  pickBtn: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 16,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  pickText: { fontSize: 15 },
  submitBtn: {
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
