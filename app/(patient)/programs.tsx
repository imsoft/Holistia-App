import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { EmptyState } from '@/components/ui/empty-state';

export default function ProgramsScreen() {
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const colorScheme = useColorScheme();
  const c = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data } = await supabase
        .from('digital_products')
        .select('*, professional_applications(first_name, last_name)')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      setPrograms(data || []);
    } catch (e) {
      console.error('Programs load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, []);

  const renderItem = ({ item }: { item: any }) => {
    const prof = item.professional_applications || {};
    const profName = `${prof.first_name || ''} ${prof.last_name || ''}`.trim();
    return (
      <Pressable
        onPress={() => router.push(`/(patient)/program/${item.id}` as any)}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: c.card, borderColor: c.border },
          pressed && styles.pressed,
        ]}>
        {item.cover_image_url ? (
          <Image source={{ uri: item.cover_image_url }} style={styles.cover} contentFit="cover" />
        ) : (
          <View style={[styles.cover, { backgroundColor: c.muted }]} />
        )}
        <Text style={[styles.title, { color: c.foreground }]} numberOfLines={2}>
          {item.title || 'Programa'}
        </Text>
        {profName ? (
          <Text style={[styles.author, { color: c.mutedForeground }]} numberOfLines={1}>
            {profName}
          </Text>
        ) : null}
        <Text style={[styles.price, { color: c.primary }]}>
          {item.price ? `$${item.price} MXN` : 'Gratis'}
        </Text>
      </Pressable>
    );
  };

  if (loading && programs.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <FlatList
        data={programs}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="menu-book"
            title="No hay programas disponibles"
            subtitle="Los profesionales estarán publicando programas pronto."
            iconColor={c.mutedForeground}
            titleColor={c.foreground}
            subtitleColor={c.mutedForeground}
          />
        }
      />
    </View>
  );
}

ProgramsScreen.options = { title: 'Programas' };

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 20, paddingBottom: 40 },
  card: {
    padding: 0,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.9 },
  cover: { height: 140, width: '100%' },
  title: { fontSize: 16, fontWeight: '600', padding: 12, paddingBottom: 4 },
  author: { fontSize: 13, paddingHorizontal: 12 },
  price: { fontSize: 14, fontWeight: '600', padding: 12, paddingTop: 4 },
});
