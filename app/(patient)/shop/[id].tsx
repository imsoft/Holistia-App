import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, Linking } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ShopDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const colorScheme = useColorScheme();
  const c = colorScheme === 'dark' ? Colors.dark : Colors.light;

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const { data } = await supabase
          .from('shops')
          .select('*')
          .eq('id', id)
          .eq('is_active', true)
          .single();
        setShop(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  if (!shop) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Text style={[styles.error, { color: c.foreground }]}>Comercio no encontrado</Text>
      </View>
    );
  }

  const openPhone = () => {
    if (shop.phone) Linking.openURL(`tel:${shop.phone.replace(/\s/g, '')}`);
  };
  const openEmail = () => {
    if (shop.email) Linking.openURL(`mailto:${shop.email}`);
  };
  const openWebsite = () => {
    if (shop.website) {
      const url = shop.website.startsWith('http') ? shop.website : `https://${shop.website}`;
      Linking.openURL(url);
    }
  };
  const openInstagram = () => {
    if (shop.instagram) {
      const handle = shop.instagram.replace(/^@/, '');
      Linking.openURL(`https://instagram.com/${handle}`);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.background }]} contentContainerStyle={styles.content}>
      {shop.image_url ? (
        <Image source={{ uri: shop.image_url }} style={styles.image} contentFit="cover" />
      ) : (
        <View style={[styles.imagePlaceholder, { backgroundColor: c.muted }]} />
      )}
      <Text style={[styles.title, { color: c.foreground }]}>{shop.name || 'Comercio'}</Text>
      {shop.category ? (
        <Text style={[styles.meta, { color: c.mutedForeground }]}>{shop.category}</Text>
      ) : null}
      {shop.description ? (
        <Text style={[styles.desc, { color: c.foreground }]}>{shop.description.replace(/<[^>]*>/g, '')}</Text>
      ) : null}

      <View style={styles.section}>
        {shop.address && (
          <Pressable style={styles.row}>
            <Text style={[styles.label, { color: c.mutedForeground }]}>Dirección</Text>
            <Text style={[styles.value, { color: c.foreground }]}>{shop.address}</Text>
          </Pressable>
        )}
        {shop.city && (
          <Pressable style={styles.row}>
            <Text style={[styles.label, { color: c.mutedForeground }]}>Ciudad</Text>
            <Text style={[styles.value, { color: c.foreground }]}>{shop.city}</Text>
          </Pressable>
        )}
        {shop.phone && (
          <Pressable style={styles.row} onPress={openPhone}>
            <Text style={[styles.label, { color: c.mutedForeground }]}>Teléfono</Text>
            <Text style={[styles.link, { color: c.primary }]}>{shop.phone}</Text>
          </Pressable>
        )}
        {shop.email && (
          <Pressable style={styles.row} onPress={openEmail}>
            <Text style={[styles.label, { color: c.mutedForeground }]}>Email</Text>
            <Text style={[styles.link, { color: c.primary }]}>{shop.email}</Text>
          </Pressable>
        )}
        {shop.website && (
          <Pressable style={styles.row} onPress={openWebsite}>
            <Text style={[styles.label, { color: c.mutedForeground }]}>Sitio web</Text>
            <Text style={[styles.link, { color: c.primary }]}>Abrir enlace</Text>
          </Pressable>
        )}
        {shop.instagram && (
          <Pressable style={styles.row} onPress={openInstagram}>
            <Text style={[styles.label, { color: c.mutedForeground }]}>Instagram</Text>
            <Text style={[styles.link, { color: c.primary }]}>{shop.instagram}</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  image: { width: '100%', height: 220 },
  imagePlaceholder: { width: '100%', height: 220 },
  title: { fontSize: 24, fontWeight: '700', padding: 20, paddingBottom: 4 },
  meta: { fontSize: 15, paddingHorizontal: 20, color: Colors.light.mutedForeground },
  desc: { fontSize: 15, lineHeight: 22, padding: 20, paddingTop: 12 },
  section: { padding: 20, paddingTop: 8 },
  row: { marginBottom: 16 },
  label: { fontSize: 12, marginBottom: 4 },
  value: { fontSize: 15 },
  link: { fontSize: 15, fontWeight: '500' },
  error: { fontSize: 16 },
});
