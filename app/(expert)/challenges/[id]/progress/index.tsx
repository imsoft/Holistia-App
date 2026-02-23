import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Modal,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useProfessionalStore } from '@/stores/professional-store';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { EmptyState } from '@/components/ui/empty-state';

type ParticipantProgress = {
  purchase_id: string;
  participant_id: string;
  buyer_name: string;
  buyer_email: string;
  buyer_photo?: string;
  started_at?: string;
  progress: {
    total_points: number;
    current_streak: number;
    longest_streak: number;
    days_completed: number;
    completion_percentage: number;
    level: number;
    status: string;
  };
  checkins_count: number;
  badges: Array<{ id: string; name: string; description: string; icon?: string }>;
};

type Checkin = {
  id: string;
  day_number: number;
  checkin_date: string;
  notes?: string;
  evidence_url?: string;
  evidence_type?: string;
  points_earned: number;
  verified_by_professional?: boolean;
};

export default function ChallengeProgressScreen() {
  const { id: challengeId } = useLocalSearchParams<{ id: string }>();
  const professional = useProfessionalStore((s) => s.professional);
  const [challenge, setChallenge] = useState<any>(null);
  const [participants, setParticipants] = useState<ParticipantProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParticipant, setSelectedParticipant] = useState<ParticipantProgress | null>(null);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const colorScheme = useColorScheme();
  const c = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const filteredParticipants = searchTerm
    ? participants.filter(
        (p) =>
          p.buyer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.buyer_email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : participants;

  const fetchChallenge = useCallback(async () => {
    if (!challengeId) return;
    try {
      const { data } = await supabase.from('challenges').select('*').eq('id', challengeId).single();
      setChallenge(data);
    } catch (e) {
      console.error('Challenge fetch:', e);
    }
  }, [challengeId]);

  const fetchParticipants = useCallback(async (isRefresh = false) => {
    if (!challengeId) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data: purchases, error: purchasesError } = await supabase
        .from('challenge_purchases')
        .select('id, participant_id, started_at')
        .eq('challenge_id', challengeId)
        .eq('access_granted', true);

      if (purchasesError) throw purchasesError;

      const list: ParticipantProgress[] = [];
      for (const purchase of purchases || []) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email, avatar_url')
          .eq('id', purchase.participant_id)
          .single();

        const { data: progressData } = await supabase
          .from('challenge_progress')
          .select('*')
          .eq('challenge_purchase_id', purchase.id)
          .single();

        const { data: badgesData } = await supabase
          .from('challenge_user_badges')
          .select('challenge_badges(id, badge_name, badge_description, badge_icon)')
          .eq('challenge_purchase_id', purchase.id);

        const { count } = await supabase
          .from('challenge_checkins')
          .select('*', { count: 'exact', head: true })
          .eq('challenge_purchase_id', purchase.id);

        list.push({
          purchase_id: purchase.id,
          participant_id: purchase.participant_id,
          buyer_name: profile
            ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Usuario'
            : 'Usuario',
          buyer_email: profile?.email || '',
          buyer_photo: profile?.avatar_url,
          started_at: purchase.started_at,
          progress: progressData
            ? {
                total_points: progressData.total_points || 0,
                current_streak: progressData.current_streak || 0,
                longest_streak: progressData.longest_streak || 0,
                days_completed: progressData.days_completed || 0,
                completion_percentage: Number(progressData.completion_percentage) || 0,
                level: progressData.level || 1,
                status: progressData.status || 'in_progress',
              }
            : {
                total_points: 0,
                current_streak: 0,
                longest_streak: 0,
                days_completed: 0,
                completion_percentage: 0,
                level: 1,
                status: 'in_progress',
              },
          checkins_count: count || 0,
          badges: (badgesData || [])
            .filter((b: any) => b.challenge_badges)
            .map((b: any) => ({
              id: b.challenge_badges.id,
              name: b.challenge_badges.badge_name,
              description: b.challenge_badges.badge_description,
              icon: b.challenge_badges.badge_icon,
            })),
        });
      }
      list.sort((a, b) => b.progress.total_points - a.progress.total_points);
      setParticipants(list);
    } catch (e) {
      console.error('Participants fetch:', e);
      Alert.alert('Error', 'No se pudieron cargar los participantes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [challengeId]);

  const fetchCheckins = useCallback(async (purchaseId: string) => {
    try {
      const { data } = await supabase
        .from('challenge_checkins')
        .select('*')
        .eq('challenge_purchase_id', purchaseId)
        .order('checkin_date', { ascending: false })
        .order('day_number', { ascending: false });
      setCheckins(data || []);
    } catch (e) {
      setCheckins([]);
    }
  }, []);

  const openDetails = async (participant: ParticipantProgress) => {
    setSelectedParticipant(participant);
    setDetailsVisible(true);
    await fetchCheckins(participant.purchase_id);
  };

  useEffect(() => {
    fetchChallenge();
  }, [fetchChallenge]);

  useEffect(() => {
    if (professional) fetchParticipants();
  }, [challengeId, professional?.id, fetchParticipants]);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completado';
      case 'abandoned':
        return 'Abandonado';
      default:
        return 'En progreso';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return c.primary;
      case 'abandoned':
        return c.destructive;
      default:
        return c.mutedForeground;
    }
  };

  const formatDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
    });
  };

  if (loading && participants.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={[styles.searchBar, { backgroundColor: c.card, borderColor: c.border }]}>
        <MaterialIcons name="search" size={20} color={c.mutedForeground} />
        <TextInput
          placeholder="Buscar participantes..."
          placeholderTextColor={c.mutedForeground}
          value={searchTerm}
          onChangeText={setSearchTerm}
          style={[styles.searchInput, { color: c.foreground }]}
        />
      </View>

      <FlatList
        data={filteredParticipants}
        keyExtractor={(item) => item.purchase_id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchParticipants(true)}
            tintColor={c.primary}
          />
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => openDetails(item)}
            style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={styles.cardHeader}>
              {item.buyer_photo ? (
                <ExpoImage source={{ uri: item.buyer_photo }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: c.muted }]}>
                  <MaterialIcons name="person" size={24} color={c.mutedForeground} />
                </View>
              )}
              <View style={styles.cardHeaderText}>
                <Text style={[styles.participantName, { color: c.foreground }]} numberOfLines={1}>
                  {item.buyer_name}
                </Text>
                <Text style={[styles.participantEmail, { color: c.mutedForeground }]} numberOfLines={1}>
                  {item.buyer_email}
                </Text>
              </View>
              <Text style={[styles.statusBadge, { color: getStatusColor(item.progress.status) }]}>
                {getStatusLabel(item.progress.status)}
              </Text>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <MaterialIcons name="trending-up" size={16} color={c.primary} />
                <Text style={[styles.statText, { color: c.foreground }]}>{item.progress.total_points} pts</Text>
              </View>
              <View style={styles.stat}>
                <MaterialIcons name="local-fire-department" size={16} color="#f97316" />
                <Text style={[styles.statText, { color: c.foreground }]}>{item.progress.current_streak} racha</Text>
              </View>
              <View style={styles.stat}>
                <MaterialIcons name="check-circle" size={16} color="#22c55e" />
                <Text style={[styles.statText, { color: c.foreground }]}>{item.checkins_count} check-ins</Text>
              </View>
            </View>
            <View style={styles.progressRow}>
              <View style={[styles.progressBar, { backgroundColor: c.muted }]}>
                <View
                  style={[
                    styles.progressFill,
                    { backgroundColor: c.primary, width: `${Math.min(100, item.progress.completion_percentage)}%` },
                  ]}
                />
              </View>
              <Text style={[styles.progressPct, { color: c.mutedForeground }]}>
                {item.progress.completion_percentage.toFixed(0)}%
              </Text>
            </View>
            <Text style={[styles.detailsLink, { color: c.primary }]}>Ver detalles</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="people"
            title={searchTerm ? 'No hay resultados' : 'Sin participantes'}
            subtitle={
              searchTerm
                ? 'Prueba con otro término'
                : 'Los usuarios que compren tu reto aparecerán aquí'
            }
            iconColor={c.mutedForeground}
            titleColor={c.foreground}
            subtitleColor={c.mutedForeground}
          />
        }
      />

      <Modal visible={detailsVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: c.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.foreground }]}>
                {selectedParticipant?.buyer_name}
              </Text>
              <Pressable onPress={() => setDetailsVisible(false)}>
                <MaterialIcons name="close" size={24} color={c.foreground} />
              </Pressable>
            </View>
            {selectedParticipant && (
              <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
                <View style={styles.modalStats}>
                  <View style={[styles.modalStat, { backgroundColor: c.card }]}>
                    <Text style={[styles.modalStatValue, { color: c.primary }]}>
                      {selectedParticipant.progress.total_points}
                    </Text>
                    <Text style={[styles.modalStatLabel, { color: c.mutedForeground }]}>Puntos</Text>
                  </View>
                  <View style={[styles.modalStat, { backgroundColor: c.card }]}>
                    <Text style={[styles.modalStatValue, { color: '#f97316' }]}>
                      {selectedParticipant.progress.current_streak}
                    </Text>
                    <Text style={[styles.modalStatLabel, { color: c.mutedForeground }]}>Racha</Text>
                  </View>
                  <View style={[styles.modalStat, { backgroundColor: c.card }]}>
                    <Text style={[styles.modalStatValue, { color: '#22c55e' }]}>
                      {selectedParticipant.progress.days_completed}
                    </Text>
                    <Text style={[styles.modalStatLabel, { color: c.mutedForeground }]}>Días</Text>
                  </View>
                  <View style={[styles.modalStat, { backgroundColor: c.card }]}>
                    <Text style={[styles.modalStatValue, { color: '#eab308' }]}>
                      {selectedParticipant.badges.length}
                    </Text>
                    <Text style={[styles.modalStatLabel, { color: c.mutedForeground }]}>Medallas</Text>
                  </View>
                </View>
                {selectedParticipant.badges.length > 0 && (
                  <View style={styles.badgesSection}>
                    <Text style={[styles.sectionTitle, { color: c.foreground }]}>Medallas</Text>
                    <View style={styles.badgesRow}>
                      {selectedParticipant.badges.map((badge) => (
                        <View key={badge.id} style={[styles.badge, { borderColor: c.border }]}>
                          <Text style={styles.badgeIcon}>{badge.icon || '🏆'}</Text>
                          <Text style={[styles.badgeName, { color: c.foreground }]} numberOfLines={1}>
                            {badge.name}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                <View style={styles.checkinsSection}>
                  <Text style={[styles.sectionTitle, { color: c.foreground }]}>
                    Check-ins ({checkins.length})
                  </Text>
                  {checkins.length === 0 ? (
                    <Text style={[styles.emptyText, { color: c.mutedForeground }]}>
                      Aún no hay check-ins
                    </Text>
                  ) : (
                    checkins
                      .sort((a, b) => b.day_number - a.day_number)
                      .map((ch) => (
                        <View key={ch.id} style={[styles.checkinCard, { backgroundColor: c.card, borderColor: c.border }]}>
                          <View style={styles.checkinHeader}>
                            <Text style={[styles.checkinDay, { color: c.foreground }]}>
                              Día {ch.day_number}
                            </Text>
                            <Text style={[styles.checkinDate, { color: c.mutedForeground }]}>
                              {formatDate(ch.checkin_date)}
                            </Text>
                            <Text style={[styles.checkinPoints, { color: c.primary }]}>
                              +{ch.points_earned} pts
                            </Text>
                          </View>
                          {ch.notes ? (
                            <Text style={[styles.checkinNotes, { color: c.mutedForeground }]}>{ch.notes}</Text>
                          ) : null}
                          {ch.evidence_url && (ch.evidence_type === 'photo' || ch.evidence_type === 'video') && (
                            <ExpoImage
                              source={{ uri: ch.evidence_url }}
                              style={styles.checkinEvidence}
                              contentFit="cover"
                            />
                          )}
                        </View>
                      ))
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 16 },
  list: { padding: 20, paddingTop: 8, paddingBottom: 40 },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  cardHeaderText: { flex: 1, marginLeft: 12, minWidth: 0 },
  participantName: { fontSize: 16, fontWeight: '600' },
  participantEmail: { fontSize: 13 },
  statusBadge: { fontSize: 12, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 10 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statText: { fontSize: 14 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressBar: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressPct: { fontSize: 12, fontWeight: '600', minWidth: 36 },
  detailsLink: { fontSize: 14, fontWeight: '600', marginTop: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalBody: { flex: 1 },
  modalBodyContent: { padding: 20, paddingBottom: 40 },
  modalStats: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  modalStat: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalStatValue: { fontSize: 22, fontWeight: '700' },
  modalStatLabel: { fontSize: 12, marginTop: 4 },
  badgesSection: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeIcon: { fontSize: 18 },
  badgeName: { fontSize: 13 },
  checkinsSection: {},
  emptyText: { fontSize: 14, fontStyle: 'italic' },
  checkinCard: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  checkinHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  checkinDay: { fontSize: 15, fontWeight: '600' },
  checkinDate: { fontSize: 13 },
  checkinPoints: { fontSize: 13, fontWeight: '600', marginLeft: 'auto' },
  checkinNotes: { fontSize: 14, marginTop: 4 },
  checkinEvidence: { width: 100, height: 100, borderRadius: 8, marginTop: 8 },
});
