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
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { fetchSpecialtyBySlug, type SpecialtyProfessional } from '@/lib/specialties';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { EmptyState } from '@/components/ui/empty-state';

export default function SpecialtyDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [profession, setProfession] = useState<string>('');
  const [professionals, setProfessionals] = useState<SpecialtyProfessional[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const load = useCallback(async (isRefresh = false) => {
    if (!slug) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await fetchSpecialtyBySlug(slug);
      setProfession(data.profession);
      setProfessionals(data.professionals);
    } catch (e) {
      console.error('Specialty detail load:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && professionals.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      {profession ? (
        <View style={[styles.header, { borderBottomColor: c.border }]}>
          <Text style={[styles.title, { color: c.foreground }]}>{profession}</Text>
          <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
            {professionals.length} profesional{professionals.length !== 1 ? 'es' : ''}
          </Text>
        </View>
      ) : null}
      <FlatList
        data={professionals}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.primary} />
        }
        renderItem={({ item }) => {
          const name = `${item.first_name || ''} ${item.last_name || ''}`.trim() || 'Profesional';
          const photo = item.profile_photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`;
          return (
            <Pressable
              onPress={() => router.push(`/(patient)/professional/${item.id}` as any)}
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: c.card, borderColor: c.border },
                pressed && styles.pressed,
              ]}>
              <Image source={{ uri: photo }} style={styles.avatar} />
              <View style={styles.cardBody}>
                <Text style={[styles.name, { color: c.foreground }]}>{name}</Text>
                {item.profession ? (
                  <Text style={[styles.profession, { color: c.mutedForeground }]}>{item.profession}</Text>
                ) : null}
                {(item.city || item.state) ? (
                  <Text style={[styles.location, { color: c.mutedForeground }]} numberOfLines={1}>
                    {[item.city, item.state].filter(Boolean).join(', ')}
                  </Text>
                ) : null}
              </View>
              <Text style={[styles.chevron, { color: c.mutedForeground }]}>›</Text>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon="person-search"
            title="Sin profesionales"
            subtitle="No hay profesionales en esta especialidad por ahora."
            iconColor={c.mutedForeground}
            titleColor={c.foreground}
            subtitleColor={c.mutedForeground}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, paddingBottom: 12, borderBottomWidth: 1 },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 14, marginTop: 4 },
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
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
  cardBody: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600' },
  profession: { fontSize: 13, marginTop: 2 },
  location: { fontSize: 12, marginTop: 2 },
  chevron: { fontSize: 24, fontWeight: '300' },
});
