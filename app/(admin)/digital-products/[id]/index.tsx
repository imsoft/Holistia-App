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
  Linking,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

type Product = {
  id: string;
  title: string | null;
  description: string | null;
  category: string | null;
  price: number | null;
  is_active: boolean | null;
  cover_image_url: string | null;
  file_url: string | null;
  duration_minutes: number | null;
  pages_count: number | null;
  professional_id: string | null;
  professional?: { first_name: string | null; last_name: string | null } | null;
};

function formatPrice(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
}

const CATEGORY_LABELS: Record<string, string> = {
  meditation: 'Meditación',
  ebook: 'Workbook',
  manual: 'Manual',
  guide: 'Guía',
  audio: 'Audio',
  video: 'Video',
  other: 'Otro',
};

export default function AdminDigitalProductDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id as string;
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!id) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data, error } = await supabase
        .from('digital_products')
        .select(
          `id, title, description, category, price, is_active, cover_image_url, file_url, duration_minutes, pages_count, professional_id,
           professional_applications!digital_products_professional_id_fkey(first_name, last_name)`
        )
        .eq('id', id)
        .single();
      if (error || !data) {
        setProduct(null);
        return;
      }
      const p = data as any;
      setProduct({
        ...p,
        professional: p.professional_applications ?? null,
      });
    } catch (e) {
      console.error('Load product error:', e);
      setProduct(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !product) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }
  if (!product) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Text style={[styles.muted, { color: c.mutedForeground }]}>Programa no encontrado</Text>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: c.primary }]}>
          <Text style={[styles.backBtnText, { color: c.primaryForeground }]}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  const profName = product.professional
    ? `${product.professional.first_name ?? ''} ${product.professional.last_name ?? ''}`.trim() || '—'
    : '—';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.primary} />}
    >
      {product.cover_image_url ? (
        <Image source={{ uri: product.cover_image_url }} style={styles.hero} resizeMode="cover" />
      ) : null}
      <View style={[styles.card, { backgroundColor: c.card }]}>
        <Text style={[styles.title, { color: c.foreground }]}>{product.title ?? 'Sin título'}</Text>
        <View style={styles.badges}>
          <View
            style={[
              styles.badge,
              product.is_active ? { backgroundColor: '#16a34a20' } : { backgroundColor: '#6b728020' },
            ]}
          >
            <Text style={[styles.badgeText, { color: product.is_active ? '#16a34a' : '#6b7280' }]}>
              {product.is_active ? 'Activo' : 'Inactivo'}
            </Text>
          </View>
          {product.price != null && product.price > 0 ? (
            <View style={[styles.badge, { backgroundColor: c.border }]}>
              <Text style={[styles.badgeText, { color: c.foreground }]}>{formatPrice(product.price)}</Text>
            </View>
          ) : (
            <View style={[styles.badge, { backgroundColor: c.border }]}>
              <Text style={[styles.badgeText, { color: c.foreground }]}>Gratis</Text>
            </View>
          )}
          {product.category ? (
            <View style={[styles.badge, { backgroundColor: c.border }]}>
              <Text style={[styles.badgeText, { color: c.foreground }]}>
                {CATEGORY_LABELS[product.category] || product.category}
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={[styles.label, { color: c.mutedForeground }]}>Profesional</Text>
        <Text style={[styles.value, { color: c.foreground }]}>{profName}</Text>
        {product.duration_minutes ? (
          <>
            <Text style={[styles.label, { color: c.mutedForeground }]}>Duración</Text>
            <Text style={[styles.value, { color: c.foreground }]}>{product.duration_minutes} min</Text>
          </>
        ) : null}
        {product.pages_count ? (
          <>
            <Text style={[styles.label, { color: c.mutedForeground }]}>Páginas</Text>
            <Text style={[styles.value, { color: c.foreground }]}>{product.pages_count}</Text>
          </>
        ) : null}
        {product.description ? (
          <>
            <Text style={[styles.label, { color: c.mutedForeground }]}>Descripción</Text>
            <Text style={[styles.desc, { color: c.foreground }]}>{product.description}</Text>
          </>
        ) : null}
        {product.file_url ? (
          <Pressable
            onPress={() => Linking.openURL(product.file_url!)}
            style={({ pressed }) => [styles.fileBtn, { backgroundColor: c.border }, pressed && styles.pressed]}
          >
            <MaterialIcons name="attach-file" size={20} color={c.foreground} />
            <Text style={[styles.fileBtnText, { color: c.foreground }]}>Ver archivo</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => (router as any).push(`/(admin)/digital-products/${id}/edit`)}
          style={({ pressed }) => [styles.editBtn, { backgroundColor: c.primary }, pressed && styles.pressed]}
        >
          <MaterialIcons name="edit" size={20} color={c.primaryForeground} />
          <Text style={[styles.editBtnText, { color: c.primaryForeground }]}>Editar programa</Text>
        </Pressable>
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
  fileBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, marginTop: 16 },
  fileBtnText: { fontSize: 15, fontWeight: '600' },
  editBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 10, marginTop: 20 },
  editBtnText: { fontSize: 16, fontWeight: '600' },
  pressed: { opacity: 0.8 },
  backBtn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
  backBtnText: { fontSize: 16, fontWeight: '600' },
  muted: { fontSize: 15 },
  bottomPad: { height: 24 },
});
