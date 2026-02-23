import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, Linking } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function RestaurantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const colorScheme = useColorScheme();
  const c = colorScheme === 'dark' ? Colors.dark : Colors.light;

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const { data } = await supabase
          .from('restaurants')
          .select('*')
          .eq('id', id)
          .eq('is_active', true)
          .single();
        setRestaurant(data);
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

  if (!restaurant) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Text style={[styles.error, { color: c.foreground }]}>Restaurante no encontrado</Text>
      </View>
    );
  }

  const openPhone = () => {
    if (restaurant.phone) Linking.openURL(`tel:${restaurant.phone.replace(/\s/g, '')}`);
  };
  const openEmail = () => {
    if (restaurant.email) Linking.openURL(`mailto:${restaurant.email}`);
  };
  const openWebsite = () => {
    if (restaurant.website) {
      const url = restaurant.website.startsWith('http') ? restaurant.website : `https://${restaurant.website}`;
      Linking.openURL(url);
    }
  };
  const openInstagram = () => {
    if (restaurant.instagram) {
      const handle = restaurant.instagram.replace(/^@/, '');
      Linking.openURL(`https://instagram.com/${handle}`);
    }
  };
  const openMenuPdf = () => {
    if (restaurant.menu_pdf_url) Linking.openURL(restaurant.menu_pdf_url);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.background }]} contentContainerStyle={styles.content}>
      {restaurant.image_url ? (
        <Image source={{ uri: restaurant.image_url }} style={styles.image} contentFit="cover" />
      ) : (
        <View style={[styles.imagePlaceholder, { backgroundColor: c.muted }]} />
      )}
      <Text style={[styles.title, { color: c.foreground }]}>{restaurant.name || 'Restaurante'}</Text>
      {(restaurant.cuisine_type || restaurant.price_range) && (
        <Text style={[styles.meta, { color: c.mutedForeground }]}>
          {[restaurant.cuisine_type, restaurant.price_range].filter(Boolean).join(' · ')}
        </Text>
      )}
      {restaurant.description ? (
        <Text style={[styles.desc, { color: c.foreground }]}>
          {restaurant.description.replace(/<[^>]*>/g, '')}
        </Text>
      ) : null}

      <View style={styles.section}>
        {restaurant.address && (
          <Pressable style={styles.row}>
            <Text style={[styles.label, { color: c.mutedForeground }]}>Dirección</Text>
            <Text style={[styles.value, { color: c.foreground }]}>{restaurant.address}</Text>
          </Pressable>
        )}
        {restaurant.phone && (
          <Pressable style={styles.row} onPress={openPhone}>
            <Text style={[styles.label, { color: c.mutedForeground }]}>Teléfono</Text>
            <Text style={[styles.link, { color: c.primary }]}>{restaurant.phone}</Text>
          </Pressable>
        )}
        {restaurant.email && (
          <Pressable style={styles.row} onPress={openEmail}>
            <Text style={[styles.label, { color: c.mutedForeground }]}>Email</Text>
            <Text style={[styles.link, { color: c.primary }]}>{restaurant.email}</Text>
          </Pressable>
        )}
        {restaurant.website && (
          <Pressable style={styles.row} onPress={openWebsite}>
            <Text style={[styles.label, { color: c.mutedForeground }]}>Sitio web</Text>
            <Text style={[styles.link, { color: c.primary }]}>Abrir enlace</Text>
          </Pressable>
        )}
        {restaurant.instagram && (
          <Pressable style={styles.row} onPress={openInstagram}>
            <Text style={[styles.label, { color: c.mutedForeground }]}>Instagram</Text>
            <Text style={[styles.link, { color: c.primary }]}>{restaurant.instagram}</Text>
          </Pressable>
        )}
        {restaurant.menu_pdf_url && (
          <Pressable style={styles.row} onPress={openMenuPdf}>
            <Text style={[styles.label, { color: c.mutedForeground }]}>Menú</Text>
            <Text style={[styles.link, { color: c.primary }]}>Ver menú (PDF)</Text>
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
