import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { fetchFeed } from '@/lib/feed';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

type FilterType = 'all' | 'following' | 'recommended';

const FILTERS: { id: FilterType; label: string; icon: string }[] = [
  { id: 'all', label: 'Todos', icon: 'auto-awesome' },
  { id: 'following', label: 'Siguiendo', icon: 'people' },
  { id: 'recommended', label: 'Populares', icon: 'trending-up' },
];

export default function FeedScreen() {
  const session = useAuthStore((s) => s.session);
  const [filter, setFilter] = useState<FilterType>('all');
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const limit = 10;
  const colorScheme = useColorScheme();
  const c = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const loadFeed = useCallback(
    async (reset = false) => {
      if (!session) return;
      if (reset) setRefreshing(true);
      else if (offset === 0) setLoading(true);

      const currentOffset = reset ? 0 : offset;
      try {
        const { data: newData, hasMore: more } = await fetchFeed(limit, currentOffset, filter);
        if (reset) {
          setPosts(newData);
          setOffset(limit);
        } else {
          setPosts((prev) => (currentOffset === 0 ? newData : [...prev, ...newData]));
          setOffset((prev) => (currentOffset === 0 ? limit : prev + limit));
        }
        setHasMore(more);
      } catch (e) {
        console.error('Feed error:', e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [session?.user?.id, offset, filter]
  );

  useEffect(() => {
    if (session) loadFeed(true);
  }, [session?.user?.id, filter]);

  const openPost = (checkinId: string) => {
    router.push(`/(tabs)/feed/post/${checkinId}` as any);
  };

  const renderItem = ({ item }: { item: any }) => (
    <Pressable
      onPress={() => openPost(item.checkin_id)}
      style={({ pressed }) => [
        styles.post,
        { backgroundColor: c.card, borderColor: c.border },
        pressed && { opacity: 0.9 },
      ]}>
      <View style={styles.postHeader}>
        <Text style={[styles.postUser, { color: c.foreground }]}>
          {item.user_first_name || 'Usuario'}
        </Text>
        <Text style={[styles.postTime, { color: c.mutedForeground }]}>
          {item.checkin_time
            ? new Date(item.checkin_time).toLocaleDateString('es-MX', {
                day: 'numeric',
                month: 'short',
              })
            : ''}
        </Text>
      </View>
      {item.challenge_title ? (
        <Text style={[styles.postChallenge, { color: c.primary }]}>{item.challenge_title}</Text>
      ) : null}
      {item.notes ? (
        <Text style={[styles.postNotes, { color: c.foreground }]} numberOfLines={3}>
          {item.notes}
        </Text>
      ) : null}
      {item.evidence_url ? (
        <View style={styles.evidence}>
          <Text style={[styles.evidenceLabel, { color: c.mutedForeground }]}>Evidencia adjunta</Text>
        </View>
      ) : null}
      <View style={styles.postFooter}>
        <Text style={[styles.likes, { color: c.mutedForeground }]}>
          {(item.total_reactions ?? item.likes_count ?? 0)} reacciones
        </Text>
      </View>
    </Pressable>
  );

  if (loading && posts.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.foreground }]}>Feed</Text>
        <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
          Actividad de la comunidad
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterRow}>
          {FILTERS.map((f) => (
            <Pressable
              key={f.id}
              onPress={() => setFilter(f.id)}
              style={[
                styles.filterTab,
                { borderColor: filter === f.id ? c.primary : c.border },
                filter === f.id && { backgroundColor: `${c.primary}20` },
              ]}>
              <MaterialIcons
                name={f.icon as any}
                size={18}
                color={filter === f.id ? c.primary : c.mutedForeground}
              />
              <Text
                style={[
                  styles.filterLabel,
                  { color: filter === f.id ? c.primary : c.mutedForeground },
                ]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <FlatList
        data={posts}
        renderItem={renderItem}
        keyExtractor={(item) => item.checkin_id || item.id || String(Math.random())}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadFeed(true)}
            tintColor={c.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: c.mutedForeground }]}>
              {filter === 'following'
                ? 'No hay actividad de personas que sigues. ¡Comienza a seguir a otros!'
                : 'No hay publicaciones aún. ¡Sé el primero en compartir!'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 15, marginTop: 4 },
  filterScroll: { marginTop: 16, marginHorizontal: -20 },
  filterRow: { paddingHorizontal: 20, gap: 8, paddingRight: 40 },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  filterLabel: { fontSize: 14, fontWeight: '600' },
  list: { paddingHorizontal: 20, paddingBottom: 24 },
  post: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  postHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  postUser: { fontWeight: '600', fontSize: 15 },
  postTime: { fontSize: 12 },
  postChallenge: { fontSize: 13, marginBottom: 4 },
  postNotes: { fontSize: 15, lineHeight: 22, marginBottom: 8 },
  evidence: { marginBottom: 8 },
  evidenceLabel: { fontSize: 12 },
  postFooter: {},
  likes: { fontSize: 13 },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 16, textAlign: 'center' },
});
