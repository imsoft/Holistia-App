import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, Image, RefreshControl, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

type Event = {
  id: string;
  name: string;
  event_date: string;
  event_time?: string;
  end_time?: string;
  location: string;
  description?: string;
  price: number;
  is_free: boolean;
  max_capacity: number;
  is_active: boolean;
  gallery_images?: string[];
};

function formatPrice(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export default function EventDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id as string;
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!id) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data, error } = await supabase
        .from('events_workshops')
        .select('id, name, event_date, event_time, end_time, location, description, price, is_free, max_capacity, is_active, gallery_images')
        .eq('id', id)
        .single();
      if (error || !data) {
        setEvent(null);
        return;
      }
      setEvent(data as Event);
    } catch (e) {
      console.error('Load event error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggleStatus = async () => {
    if (!event) return;
    try {
      const { error } = await supabase.from('events_workshops').update({ is_active: !event.is_active }).eq('id', event.id);
      if (error) throw error;
      setEvent({ ...event, is_active: !event.is_active });
    } catch (e) {
      Alert.alert('Error', 'No se pudo actualizar el estado');
    }
  };

  if (loading && !event) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }
  if (!event) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Text style={[styles.muted, { color: c.mutedForeground }]}>Evento no encontrado</Text>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: c.primary }]}>
          <Text style={[styles.backBtnText, { color: c.primaryForeground }]}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  const img = event.gallery_images?.[0];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.primary} />}
    >
      {img ? <Image source={{ uri: img }} style={styles.hero} resizeMode="cover" /> : null}
      <View style={[styles.card, { backgroundColor: c.card }]}>
        <Text style={[styles.title, { color: c.foreground }]}>{event.name}</Text>
        <View style={styles.badges}>
          <View style={[styles.badge, event.is_active ? { backgroundColor: '#16a34a20' } : { backgroundColor: '#6b728020' }]}>
            <Text style={[styles.badgeText, { color: event.is_active ? '#16a34a' : '#6b7280' }]}>{event.is_active ? 'Activo' : 'Inactivo'}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: c.border }]}>
            <Text style={[styles.badgeText, { color: c.foreground }]}>{event.is_free ? 'Gratis' : formatPrice(event.price)}</Text>
          </View>
        </View>
        <View style={styles.meta}>
          <MaterialIcons name="event" size={20} color={c.mutedForeground} />
          <Text style={[styles.metaText, { color: c.foreground }]}>{formatDate(event.event_date)}</Text>
        </View>
        {event.event_time ? (
          <View style={styles.meta}>
            <MaterialIcons name="access-time" size={20} color={c.mutedForeground} />
            <Text style={[styles.metaText, { color: c.foreground }]}>{event.event_time}{event.end_time ? ` - ${event.end_time}` : ''}</Text>
          </View>
        ) : null}
        <View style={styles.meta}>
          <MaterialIcons name="place" size={20} color={c.mutedForeground} />
          <Text style={[styles.metaText, { color: c.foreground }]}>{event.location}</Text>
        </View>
        <View style={styles.meta}>
          <MaterialIcons name="people" size={20} color={c.mutedForeground} />
          <Text style={[styles.metaText, { color: c.foreground }]}>Cupo: {event.max_capacity}</Text>
        </View>
        {event.description ? <Text style={[styles.desc, { color: c.mutedForeground }]}>{event.description}</Text> : null}
        <View style={styles.actions}>
          <Pressable onPress={() => (router as any).push(`/(admin)/events/${id}/edit`)} style={({ pressed }) => [styles.actionBtn, { backgroundColor: c.primary }, pressed && styles.pressed]}>
            <MaterialIcons name="edit" size={20} color={c.primaryForeground} />
            <Text style={[styles.actionBtnText, { color: c.primaryForeground }]}>Editar</Text>
          </Pressable>
          <Pressable onPress={() => (router as any).push(`/(admin)/events/${id}/registrations`)} style={({ pressed }) => [styles.actionBtn, { backgroundColor: c.card, borderWidth: 1, borderColor: c.border }, pressed && styles.pressed]}>
            <MaterialIcons name="people" size={20} color={c.foreground} />
            <Text style={[styles.actionBtnText, { color: c.foreground }]}>Registraciones</Text>
          </Pressable>
        </View>
        <Pressable onPress={handleToggleStatus} style={[styles.toggleRow, { borderTopColor: c.border }]}>
          <Text style={[styles.toggleLabel, { color: c.foreground }]}>{event.is_active ? 'Desactivar evento' : 'Activar evento'}</Text>
          <MaterialIcons name="swap-horiz" size={24} color={c.primary} />
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
  hero: { width: '100%', height: 180, backgroundColor: '#e5e7eb' },
  card: { margin: 16, padding: 16, borderRadius: 12 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  badges: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  badgeText: { fontSize: 14, fontWeight: '600' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  metaText: { fontSize: 15 },
  desc: { fontSize: 14, marginTop: 12, lineHeight: 22 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 10 },
  actionBtnText: { fontSize: 16, fontWeight: '600' },
  pressed: { opacity: 0.8 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, paddingTop: 16, borderTopWidth: 1 },
  toggleLabel: { fontSize: 15 },
  backBtn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
  backBtnText: { fontSize: 16, fontWeight: '600' },
  muted: { fontSize: 15 },
  bottomPad: { height: 24 },
});
