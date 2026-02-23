import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const todayStr = () => new Date().toISOString().split('T')[0];

export default function EventsListScreen() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const colorScheme = useColorScheme();
  const c = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data } = await supabase
        .from('events_workshops')
        .select('*, professional_applications(first_name, last_name)')
        .eq('is_active', true)
        .gte('event_date', todayStr())
        .order('event_date', { ascending: true });
      setEvents(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, []);

  const renderItem = ({ item }: { item: any }) => {
    const date = item.event_date ? new Date(item.event_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : '';
    return (
      <Pressable
        onPress={() => (router as any).push(`/(patient)/event/${item.id}`)}
        style={({ pressed }) => [styles.card, { backgroundColor: c.card, borderColor: c.border }, pressed && styles.pressed]}>
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.cover} contentFit="cover" />
        ) : (
          <View style={[styles.cover, { backgroundColor: c.muted }]} />
        )}
        <Text style={[styles.title, { color: c.foreground }]} numberOfLines={2}>{item.name || 'Evento'}</Text>
        <Text style={[styles.date, { color: c.mutedForeground }]}>{date}</Text>
      </Pressable>
    );
  };

  if (loading && events.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <FlatList
        data={events}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: c.mutedForeground }]}>No hay eventos próximos.</Text>
          </View>
        }
      />
    </View>
  );
}

EventsListScreen.options = { title: 'Eventos' };

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 20, paddingBottom: 40 },
  card: { borderRadius: 12, borderWidth: 1, marginBottom: 12, overflow: 'hidden' },
  pressed: { opacity: 0.9 },
  cover: { height: 120, width: '100%' },
  title: { fontSize: 16, fontWeight: '600', padding: 12 },
  date: { fontSize: 13, paddingHorizontal: 12, paddingBottom: 12 },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 16, textAlign: 'center' },
});
