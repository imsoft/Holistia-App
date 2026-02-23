import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { Button } from '@/components/ui/button';
import { useProfessionalStore } from '@/stores/professional-store';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { EmptyState } from '@/components/ui/empty-state';

export default function ExpertDigitalProductsScreen() {
  const professional = useProfessionalStore((s) => s.professional);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const load = useCallback(async (isRefresh = false) => {
    if (!professional) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data } = await supabase
        .from('digital_products')
        .select('*')
        .eq('professional_id', professional.id)
        .order('created_at', { ascending: false });
      setProducts(data || []);
    } catch (e) {
      console.error('Digital products load:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [professional?.id]);

  useEffect(() => {
    if (professional) load();
  }, [professional?.id]);

  if (loading && products.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={styles.header}>
        <Button
          title="Nuevo programa"
          onPress={() => router.push('/digital-products/new')}
          variant="primary"
        />
      </View>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.primary} />
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/digital-products/${item.id}/edit`)}
            style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}
          >
            {item.cover_image_url ? (
              <Image source={{ uri: item.cover_image_url }} style={styles.cover} contentFit="cover" />
            ) : (
              <View style={[styles.cover, styles.coverPlaceholder, { backgroundColor: c.muted }]} />
            )}
            <Text style={[styles.name, { color: c.foreground }]}>{item.title || 'Sin título'}</Text>
            <Text style={[styles.price, { color: c.primary }]}>
              ${item.price ?? 0} {item.currency || 'MXN'}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="menu-book"
            title="No hay programas"
            subtitle="Crea tu primer programa digital para venderlo a los pacientes."
            actionLabel="Crear programa"
            onAction={() => router.push('/(expert)/digital-products/new' as any)}
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, paddingBottom: 12 },
  list: { padding: 20, paddingTop: 0 },
  card: { borderRadius: 12, borderWidth: 1, marginBottom: 12, overflow: 'hidden' },
  cover: { height: 120, width: '100%' },
  coverPlaceholder: {},
  name: { fontSize: 16, fontWeight: '600', padding: 12 },
  price: { fontSize: 14, fontWeight: '600', paddingHorizontal: 12, paddingBottom: 12 },
});
