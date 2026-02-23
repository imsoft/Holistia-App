import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { EmptyState } from '@/components/ui/empty-state';

export default function HolisticCentersListScreen() {
  const [centers, setCenters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const colorScheme = useColorScheme();
  const c = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data } = await supabase
        .from('holistic_centers')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });
      setCenters(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const renderItem = ({ item }: { item: any }) => (
    <Pressable
      onPress={() => router.push(`/(patient)/holistic-center/${item.id}` as any)}
      style={({ pressed }) => [styles.card, { backgroundColor: c.card, borderColor: c.border }, pressed && styles.pressed]}>
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.cover} contentFit="cover" />
      ) : (
        <View style={[styles.cover, { backgroundColor: c.muted }]} />
      )}
      <Text style={[styles.title, { color: c.foreground }]} numberOfLines={2}>
        {item.name || 'Centro holístico'}
      </Text>
      {item.city ? (
        <Text style={[styles.meta, { color: c.mutedForeground }]}>{item.city}</Text>
      ) : null}
    </Pressable>
  );

  if (loading && centers.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <FlatList
        data={centers}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="spa"
            title="No hay centros holísticos disponibles"
            subtitle="Pronto agregaremos centros y espacios de bienestar."
            iconColor={c.mutedForeground}
            titleColor={c.foreground}
            subtitleColor={c.mutedForeground}
          />
        }
      />
    </View>
  );
}

HolisticCentersListScreen.options = { title: 'Centros holísticos' };

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 20, paddingBottom: 40 },
  card: { borderRadius: 12, borderWidth: 1, marginBottom: 12, overflow: 'hidden' },
  pressed: { opacity: 0.9 },
  cover: { height: 120, width: '100%' },
  title: { fontSize: 16, fontWeight: '600', padding: 12 },
  meta: { fontSize: 13, paddingHorizontal: 12, paddingBottom: 12 },
});
