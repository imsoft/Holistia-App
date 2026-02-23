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

type Restaurant = {
  id: string;
  name: string | null;
  description: string | null;
  address: string | null;
  phone: string | null;
  cuisine_type: string | null;
  price_range: string | null;
  image_url: string | null;
  is_active: boolean | null;
};

type MenuItem = {
  id: string;
  title: string | null;
  price: number | null;
  is_active: boolean | null;
};

function formatPrice(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
}

export default function AdminRestaurantDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id as string;
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!id) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data: restData, error: restError } = await supabase
        .from('restaurants')
        .select('id, name, description, address, phone, cuisine_type, price_range, image_url, is_active')
        .eq('id', id)
        .single();
      if (restError || !restData) {
        setRestaurant(null);
        return;
      }
      setRestaurant(restData);

      const { data: menuData } = await supabase
        .from('restaurant_menus')
        .select('id, title, price, is_active')
        .eq('restaurant_id', id)
        .order('display_order');
      setMenus(menuData ?? []);
    } catch (e) {
      console.error('Load restaurant error:', e);
      setRestaurant(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const openMenuEdit = (menuId: string) => {
    router.push(`/(admin)/restaurants/${id}/menus/${menuId}/edit`);
  };

  const openNewMenu = () => {
    router.push(`/(admin)/restaurants/${id}/menus/new`);
  };

  if (loading && !restaurant) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }
  if (!restaurant) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Text style={[styles.muted, { color: c.mutedForeground }]}>Restaurante no encontrado</Text>
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
      {restaurant.image_url ? (
        <Image source={{ uri: restaurant.image_url }} style={styles.hero} resizeMode="cover" />
      ) : null}
      <View style={[styles.card, { backgroundColor: c.card }]}>
        <Text style={[styles.title, { color: c.foreground }]}>{restaurant.name ?? 'Sin nombre'}</Text>
        <View style={styles.badges}>
          <View
            style={[styles.badge, restaurant.is_active ? { backgroundColor: '#16a34a20' } : { backgroundColor: '#6b728020' }]}
          >
            <Text style={[styles.badgeText, { color: restaurant.is_active ? '#16a34a' : '#6b7280' }]}>
              {restaurant.is_active ? 'Activo' : 'Inactivo'}
            </Text>
          </View>
          {restaurant.cuisine_type ? (
            <View style={[styles.badge, { backgroundColor: c.border }]}>
              <Text style={[styles.badgeText, { color: c.foreground }]}>{restaurant.cuisine_type}</Text>
            </View>
          ) : null}
          {restaurant.price_range ? (
            <View style={[styles.badge, { backgroundColor: c.border }]}>
              <Text style={[styles.badgeText, { color: c.foreground }]}>{restaurant.price_range}</Text>
            </View>
          ) : null}
        </View>
        {restaurant.address ? (
          <>
            <Text style={[styles.label, { color: c.mutedForeground }]}>Dirección</Text>
            <Text style={[styles.value, { color: c.foreground }]}>{restaurant.address}</Text>
          </>
        ) : null}
        {restaurant.phone ? (
          <>
            <Text style={[styles.label, { color: c.mutedForeground }]}>Teléfono</Text>
            <Text style={[styles.value, { color: c.foreground }]}>{restaurant.phone}</Text>
          </>
        ) : null}
        {restaurant.description ? (
          <>
            <Text style={[styles.label, { color: c.mutedForeground }]}>Descripción</Text>
            <Text style={[styles.desc, { color: c.foreground }]} numberOfLines={6}>{restaurant.description}</Text>
          </>
        ) : null}
      </View>

      <View style={[styles.card, { backgroundColor: c.card }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: c.foreground }]}>Menú</Text>
          <Pressable onPress={openNewMenu} style={[styles.webLink, { borderColor: c.primary }]}>
            <MaterialIcons name="add" size={20} color={c.primary} />
            <Text style={[styles.webLinkText, { color: c.primary }]}>Nuevo plato</Text>
          </Pressable>
        </View>
        {menus.length === 0 ? (
          <Text style={[styles.empty, { color: c.mutedForeground }]}>No hay platos en el menú</Text>
        ) : (
          menus.map((m) => (
            <View key={m.id} style={[styles.serviceRow, { borderColor: c.border }]}>
              <View style={styles.serviceInfo}>
                <Text style={[styles.serviceName, { color: c.foreground }]}>{m.title ?? '—'}</Text>
                <Text style={[styles.serviceMeta, { color: c.mutedForeground }]}>
                  {formatPrice(m.price ?? 0)} · {m.is_active ? 'Activo' : 'Inactivo'}
                </Text>
              </View>
              <Pressable onPress={() => openMenuEdit(m.id)} style={[styles.editLink, { backgroundColor: c.border }]}>
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
