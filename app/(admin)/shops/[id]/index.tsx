import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Image,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

type Shop = {
  id: string;
  name: string | null;
  description: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  category: string | null;
  image_url: string | null;
  is_active: boolean | null;
};

type Product = {
  id: string;
  name: string | null;
  price: number | null;
  discount_price: number | null;
  is_active: boolean | null;
};

function formatPrice(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
}

export default function AdminShopDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id as string;
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!id) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data: shopData, error: shopError } = await supabase
        .from('shops')
        .select('id, name, description, address, city, phone, category, image_url, is_active')
        .eq('id', id)
        .single();
      if (shopError || !shopData) {
        setShop(null);
        return;
      }
      setShop(shopData);

      const { data: prodData } = await supabase
        .from('shop_products')
        .select('id, name, price, discount_price, is_active')
        .eq('shop_id', id)
        .order('name');
      setProducts(prodData ?? []);
    } catch (e) {
      console.error('Load shop error:', e);
      setShop(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const openProductEdit = (productId: string) => {
    router.push(`/(admin)/shops/${id}/products/${productId}/edit`);
  };

  const openNewProduct = () => {
    router.push(`/(admin)/shops/${id}/products/new`);
  };

  if (loading && !shop) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }
  if (!shop) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Text style={[styles.muted, { color: c.mutedForeground }]}>Comercio no encontrado</Text>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: c.primary }]}>
          <Text style={[styles.backBtnText, { color: c.primaryForeground }]}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.primary} />}
    >
      {shop.image_url ? (
        <Image source={{ uri: shop.image_url }} style={styles.hero} resizeMode="cover" />
      ) : null}
      <View style={[styles.card, { backgroundColor: c.card }]}>
        <Text style={[styles.title, { color: c.foreground }]}>{shop.name ?? 'Sin nombre'}</Text>
        <View style={styles.badges}>
          <View
            style={[styles.badge, shop.is_active ? { backgroundColor: '#16a34a20' } : { backgroundColor: '#6b728020' }]}
          >
            <Text style={[styles.badgeText, { color: shop.is_active ? '#16a34a' : '#6b7280' }]}>
              {shop.is_active ? 'Activo' : 'Inactivo'}
            </Text>
          </View>
          {shop.city ? (
            <View style={[styles.badge, { backgroundColor: c.border }]}>
              <Text style={[styles.badgeText, { color: c.foreground }]}>{shop.city}</Text>
            </View>
          ) : null}
          {shop.category ? (
            <View style={[styles.badge, { backgroundColor: c.border }]}>
              <Text style={[styles.badgeText, { color: c.foreground }]}>{shop.category}</Text>
            </View>
          ) : null}
        </View>
        {shop.address ? (
          <>
            <Text style={[styles.label, { color: c.mutedForeground }]}>Dirección</Text>
            <Text style={[styles.value, { color: c.foreground }]}>{shop.address}</Text>
          </>
        ) : null}
        {shop.phone ? (
          <>
            <Text style={[styles.label, { color: c.mutedForeground }]}>Teléfono</Text>
            <Text style={[styles.value, { color: c.foreground }]}>{shop.phone}</Text>
          </>
        ) : null}
        {shop.description ? (
          <>
            <Text style={[styles.label, { color: c.mutedForeground }]}>Descripción</Text>
            <Text style={[styles.desc, { color: c.foreground }]} numberOfLines={6}>{shop.description}</Text>
          </>
        ) : null}
      </View>

      <View style={[styles.card, { backgroundColor: c.card }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: c.foreground }]}>Productos</Text>
          <Pressable onPress={openNewProduct} style={[styles.webLink, { borderColor: c.primary }]}>
            <MaterialIcons name="add" size={20} color={c.primary} />
            <Text style={[styles.webLinkText, { color: c.primary }]}>Nuevo producto</Text>
          </Pressable>
        </View>
        {products.length === 0 ? (
          <Text style={[styles.empty, { color: c.mutedForeground }]}>No hay productos</Text>
        ) : (
          products.map((p) => (
            <View key={p.id} style={[styles.serviceRow, { borderColor: c.border }]}>
              <View style={styles.serviceInfo}>
                <Text style={[styles.serviceName, { color: c.foreground }]}>{p.name ?? '—'}</Text>
                <Text style={[styles.serviceMeta, { color: c.mutedForeground }]}>
                  {p.discount_price != null && p.discount_price > 0
                    ? `${formatPrice(p.discount_price)} (antes ${formatPrice(p.price ?? 0)})`
                    : formatPrice(p.price ?? 0)}{' '}
                  · {p.is_active ? 'Activo' : 'Inactivo'}
                </Text>
              </View>
              <Pressable onPress={() => openProductEdit(p.id)} style={[styles.editLink, { backgroundColor: c.border }]}>
                <MaterialIcons name="edit" size={18} color={c.foreground} />
                <Text style={[styles.editLinkText, { color: c.foreground }]}>Editar</Text>
              </Pressable>
            </View>
          ))
        )}
      </View>
      <View style={styles.bottomPad} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  hero: { width: '100%', height: 160, backgroundColor: '#e5e7eb' },
  card: { margin: 16, padding: 16, borderRadius: 12 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  badgeText: { fontSize: 14, fontWeight: '600' },
  label: { fontSize: 12, marginTop: 12, marginBottom: 4 },
  value: { fontSize: 16 },
  desc: { fontSize: 15, lineHeight: 22, marginTop: 4 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  webLink: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1 },
  webLinkText: { fontSize: 14, fontWeight: '600' },
  hint: { fontSize: 12, marginBottom: 12 },
  empty: { paddingVertical: 16 },
  serviceRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  serviceInfo: { flex: 1 },
  serviceName: { fontSize: 16, fontWeight: '600' },
  serviceMeta: { fontSize: 12, marginTop: 2 },
  editLink: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  editLinkText: { fontSize: 13, fontWeight: '600' },
  backBtn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
  backBtnText: { fontSize: 16, fontWeight: '600' },
  muted: { fontSize: 15 },
  bottomPad: { height: 24 },
});
