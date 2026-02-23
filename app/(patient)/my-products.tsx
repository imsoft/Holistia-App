import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { useAuthStore } from '@/stores/auth-store';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { EmptyState } from '@/components/ui/empty-state';

export default function MyProductsScreen() {
  const session = useAuthStore((s) => s.session);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const colorScheme = useColorScheme();
  const c = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const load = useCallback(async (isRefresh = false) => {
    if (!session?.user?.id) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data } = await supabase
        .from('digital_product_purchases')
        .select(
          `id, payment_status, access_granted, created_at,
           digital_products(id, title, cover_image_url, professional_id)`
        )
        .eq('buyer_id', session.user.id)
        .eq('payment_status', 'succeeded')
        .eq('access_granted', true)
        .order('created_at', { ascending: false });
      setProducts(data || []);
    } catch (e) {
      console.error('My products error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (session) load();
  }, [session?.user?.id]);

  const renderItem = ({ item }: { item: any }) => {
    const product = item.digital_products || {};
    return (
      <Pressable
        onPress={() => product.id && router.push(`/(patient)/program/${product.id}` as any)}
        style={({ pressed }) => [styles.card, { backgroundColor: c.card, borderColor: c.border }, pressed && styles.pressed]}>
        {product.cover_image_url ? (
          <Image source={{ uri: product.cover_image_url }} style={styles.cover} contentFit="cover" />
        ) : (
          <View style={[styles.cover, { backgroundColor: c.muted }]} />
        )}
        <Text style={[styles.title, { color: c.foreground }]} numberOfLines={2}>{product.title || 'Programa'}</Text>
      </Pressable>
    );
  };

  if (loading && products.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <FlatList
        data={products}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.primary} />}
        ListEmptyComponent={
          <EmptyState
            icon="menu-book"
            title="No has comprado programas aún"
            subtitle="Descubre programas digitales creados por profesionales."
            actionLabel="Explorar programas"
            onAction={() => router.push('/(patient)/programs' as any)}
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

MyProductsScreen.options = { title: 'Mis programas' };

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 20, paddingBottom: 40 },
  card: { padding: 0, borderRadius: 12, borderWidth: 1, marginBottom: 12, overflow: 'hidden' },
  pressed: { opacity: 0.9 },
  cover: { height: 120, width: '100%' },
  title: { fontSize: 16, fontWeight: '600', padding: 12 },
  author: { fontSize: 13, paddingHorizontal: 12, paddingBottom: 12 },
});
