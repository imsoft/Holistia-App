import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Image,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function ProductConfirmationScreen() {
  const { purchase_id } = useLocalSearchParams<{ purchase_id: string }>();
  const session = useAuthStore((s) => s.session);
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchase, setPurchase] = useState<any>(null);
  const [product, setProduct] = useState<any>(null);

  useEffect(() => {
    if (!purchase_id || typeof purchase_id !== 'string' || !session?.user?.id) {
      setError('Falta el identificador de la compra.');
      setLoading(false);
      return;
    }

    (async () => {
      const { data: pur, error: purErr } = await supabase
        .from('digital_product_purchases')
        .select('id, product_id, payment_status, access_granted')
        .eq('id', purchase_id)
        .eq('buyer_id', session.user.id)
        .single();

      if (purErr || !pur) {
        setError('No se encontró la compra.');
        setLoading(false);
        return;
      }
      setPurchase(pur);

      const { data: prod, error: prodErr } = await supabase
        .from('digital_products')
        .select('id, title, cover_image_url, professional_applications(first_name, last_name)')
        .eq('id', pur.product_id)
        .single();

      setProduct(prodErr ? {} : prod);
      setLoading(false);
    })();
  }, [purchase_id, session?.user?.id]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
        <Text style={[styles.muted, { color: c.mutedForeground, marginTop: 12 }]}>Cargando...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: c.background, padding: 24 }]}>
        <MaterialIcons name="info" size={48} color={c.mutedForeground} />
        <Text style={[styles.error, { color: c.foreground, marginTop: 16, textAlign: 'center' }]}>
          {error}
        </Text>
        <Pressable
          onPress={() => router.replace('/(patient)/my-products' as any)}
          style={[styles.btn, { backgroundColor: c.primary, marginTop: 24 }]}>
          <Text style={[styles.btnText, { color: c.primaryForeground }]}>Ver mis programas</Text>
        </Pressable>
      </View>
    );
  }

  const prof = Array.isArray(product?.professional_applications)
    ? product.professional_applications[0]
    : product?.professional_applications || {};
  const profName = `${prof?.first_name || ''} ${prof?.last_name || ''}`.trim() || 'Profesional';

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.background }]} contentContainerStyle={styles.content}>
      <View style={[styles.iconWrap, { backgroundColor: `${c.primary}20` }]}>
        <MaterialIcons name="check-circle" size={48} color={c.primary} />
      </View>
      <Text style={[styles.title, { color: c.foreground }]}>¡Compra completada!</Text>
      <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
        Ya tienes acceso a este programa. Todo el contenido está disponible para ti.
      </Text>

      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
        {product?.cover_image_url ? (
          <Image source={{ uri: product.cover_image_url }} style={styles.cover} />
        ) : (
          <View style={[styles.coverPlaceholder, { backgroundColor: c.muted }]} />
        )}
        <Text style={[styles.productTitle, { color: c.foreground }]}>{product?.title || 'Programa'}</Text>
        {profName && (
          <Text style={[styles.profLine, { color: c.mutedForeground }]}>por {profName}</Text>
        )}
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={() => product?.id && router.replace(`/(patient)/program/${product.id}` as any)}
          style={[styles.btn, { backgroundColor: c.primary }]}>
          <Text style={[styles.btnText, { color: c.primaryForeground }]}>Ver programa</Text>
          <MaterialIcons name="chevron-right" size={20} color={c.primaryForeground} />
        </Pressable>
        <Pressable
          onPress={() => router.replace('/(patient)/my-products' as any)}
          style={[styles.btnOutline, { borderColor: c.border }]}>
          <Text style={[styles.btnTextOutline, { color: c.foreground }]}>Ver todos mis programas</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

export const options = { title: 'Compra confirmada' };

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20, paddingBottom: 40 },
  muted: { fontSize: 15 },
  error: { fontSize: 16 },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 15, textAlign: 'center', marginBottom: 24 },
  card: {
    padding: 0,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
    overflow: 'hidden',
  },
  cover: { width: '100%', height: 160 },
  coverPlaceholder: { width: '100%', height: 160 },
  productTitle: { fontSize: 18, fontWeight: '600', padding: 16, paddingBottom: 4 },
  profLine: { fontSize: 14, paddingHorizontal: 16, paddingBottom: 16 },
  actions: { gap: 12 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 10,
  },
  btnText: { fontSize: 16, fontWeight: '600' },
  btnOutline: { padding: 16, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  btnTextOutline: { fontSize: 16, fontWeight: '600' },
});
