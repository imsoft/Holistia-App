import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Image,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { useProfessionalStore } from '@/stores/professional-store';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { EmptyState } from '@/components/ui/empty-state';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

type ParticipantRow = {
  purchase_id: string;
  participant_id: string;
  challenge_id: string;
  buyer_name: string;
  challenge_title: string;
  days_completed: number;
  duration_days: number;
  status: string;
  buyer_photo?: string | null;
};

export default function ChallengeParticipantsScreen() {
  const professional = useProfessionalStore((s) => s.professional);
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [filtered, setFiltered] = useState<ParticipantRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const load = useCallback(async (isRefresh = false) => {
    if (!professional?.user_id) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data: challenges } = await supabase
        .from('challenges')
        .select('id')
        .eq('created_by_user_id', professional.user_id)
        .eq('created_by_type', 'professional');
      const challengeIds = (challenges ?? []).map((ch) => ch.id);
      if (challengeIds.length === 0) {
        setParticipants([]);
        setFiltered([]);
        return;
      }

      const { data: purchases, error } = await supabase
        .from('challenge_purchases')
        .select('id, participant_id, challenge_id, challenges(title, duration_days)')
        .in('challenge_id', challengeIds)
        .eq('access_granted', true);

      if (error) throw error;

      const rows: ParticipantRow[] = [];
      for (const p of purchases ?? []) {
        const ch = Array.isArray((p as any).challenges) ? (p as any).challenges[0] : (p as any).challenges;
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name, avatar_url')
          .eq('id', p.participant_id)
          .single();
        const { data: progress } = await supabase
          .from('challenge_progress')
          .select('days_completed, status')
          .eq('challenge_purchase_id', p.id)
          .maybeSingle();

        const name = profile
          ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Usuario'
          : 'Usuario';
        rows.push({
          purchase_id: p.id,
          participant_id: p.participant_id,
          challenge_id: p.challenge_id,
          buyer_name: name,
          challenge_title: ch?.title ?? 'Reto',
          days_completed: progress?.days_completed ?? 0,
          duration_days: ch?.duration_days ?? 0,
          status: progress?.status ?? 'in_progress',
          buyer_photo: profile?.avatar_url,
        });
      }
      setParticipants(rows);
      setFiltered(rows);
    } catch (e) {
      console.error('Participants load:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [professional?.user_id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(participants);
      return;
    }
    const q = search.toLowerCase().trim();
    setFiltered(
      participants.filter(
        (p) =>
          p.buyer_name.toLowerCase().includes(q) || p.challenge_title.toLowerCase().includes(q)
      )
    );
  }, [search, participants]);

  const onPress = (p: ParticipantRow) => {
    router.push(`/challenges/${p.challenge_id}/progress` as any);
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
      <View style={[styles.searchWrap, { backgroundColor: c.card, borderColor: c.border }]}>
        <MaterialIcons name="search" size={20} color={c.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: c.foreground }]}
          placeholder="Buscar por nombre o reto..."
          placeholderTextColor={c.mutedForeground}
          value={search}
          onChangeText={setSearch}
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.purchase_id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.primary} />
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onPress(item)}
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: c.card, borderColor: c.border },
              pressed && styles.pressed,
            ]}>
            <Image
              source={{
                uri: item.buyer_photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.buyer_name)}`,
              }}
              style={styles.avatar}
            />
            <View style={styles.cardBody}>
              <Text style={[styles.name, { color: c.foreground }]}>{item.buyer_name}</Text>
              <Text style={[styles.challenge, { color: c.mutedForeground }]} numberOfLines={1}>
                {item.challenge_title}
              </Text>
              <Text style={[styles.progress, { color: c.primary }]}>
                {item.days_completed} / {item.duration_days} días
                {item.status === 'completed' ? ' · Completado' : ''}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={c.mutedForeground} />
          </Pressable>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="people"
            title="Sin participantes"
            subtitle="Los participantes de tus retos aparecerán aquí."
            iconColor={c.mutedForeground}
            titleColor={c.foreground}
            subtitleColor={c.mutedForeground}
          />
        }
      />
    </View>
  );
}

ChallengeParticipantsScreen.options = { title: 'Participantes' };

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 4 },
  list: { padding: 20, paddingBottom: 40 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  pressed: { opacity: 0.9 },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  cardBody: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600' },
  challenge: { fontSize: 13, marginTop: 2 },
  progress: { fontSize: 13, marginTop: 4, fontWeight: '500' },
});
