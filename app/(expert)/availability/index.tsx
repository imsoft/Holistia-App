import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  RefreshControl,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useProfessionalStore } from '@/stores/professional-store';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function formatBlockDisplay(b: any): { line1: string; line2: string } {
  if (b.block_type === 'full_day') {
    const start = b.start_date ? String(b.start_date).slice(0, 10) : '';
    const end = b.end_date && b.end_date !== b.start_date ? String(b.end_date).slice(0, 10) : '';
    return {
      line1: b.title || 'Día bloqueado',
      line2: end ? `${start} → ${end}` : start,
    };
  }
  if (b.block_type === 'time_range' && b.start_time && b.end_time) {
    const start = String(b.start_time).slice(0, 5);
    const end = String(b.end_time).slice(0, 5);
    const date = b.start_date ? String(b.start_date).slice(0, 10) : '';
    return {
      line1: b.title || `${start} - ${end}`,
      line2: date ? `${date} · ${start} - ${end}` : `${start} - ${end}`,
    };
  }
  if (b.day_of_week != null) {
    const day = DAY_NAMES[b.day_of_week] ?? `Día ${b.day_of_week}`;
    const time = b.start_time && b.end_time ? `${String(b.start_time).slice(0, 5)} - ${String(b.end_time).slice(0, 5)}` : day;
    return {
      line1: b.title || day,
      line2: time,
    };
  }
  return {
    line1: b.title || 'Bloqueo',
    line2: b.start_date ? String(b.start_date).slice(0, 10) : '',
  };
}

export default function ExpertAvailabilityScreen() {
  const professional = useProfessionalStore((s) => s.professional);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const load = useCallback(async (isRefresh = false) => {
    if (!professional) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data } = await supabase
        .from('availability_blocks')
        .select('*')
        .eq('professional_id', professional.id)
        .order('start_date', { ascending: true })
        .order('start_time', { ascending: true });
      setBlocks((data || []).filter((b: any) => !b.is_external_event));
    } catch (e) {
      console.error('Availability load:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [professional?.id]);

  useEffect(() => {
    if (professional) load();
  }, [professional?.id, load]);

  const handleDelete = (b: any) => {
    Alert.alert('Eliminar bloqueo', `¿Seguro que quieres eliminar "${b.title || 'este bloqueo'}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          setDeletingId(b.id);
          try {
            await supabase.from('availability_blocks').delete().eq('id', b.id);
            load(true);
          } catch (e: any) {
            Alert.alert('Error', e?.message ?? 'No se pudo eliminar');
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  if (loading && blocks.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={styles.header}>
        <Button title="Nuevo bloqueo" onPress={() => router.push('/availability/new')} variant="primary" />
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.primary} />}
      >
        <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
          Bloquea horarios en los que no atiendes (vacaciones, reuniones, etc.)
        </Text>
        {blocks.length === 0 ? (
          <View style={styles.empty}>
            <MaterialIcons name="event-busy" size={48} color={c.mutedForeground} />
            <Text style={[styles.emptyText, { color: c.mutedForeground }]}>No hay bloques configurados</Text>
            <Text style={[styles.emptyHint, { color: c.mutedForeground }]}>Toca &quot;Nuevo bloqueo&quot; para agregar</Text>
          </View>
        ) : (
          blocks.map((b) => {
            const { line1, line2 } = formatBlockDisplay(b);
            return (
              <View key={b.id} style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
                <Pressable
                  onPress={() => router.push(`/availability/${b.id}/edit`)}
                  style={styles.cardContent}
                  hitSlop={8}
                >
                  <View style={styles.cardText}>
                    <Text style={[styles.cardTitle, { color: c.foreground }]}>{line1}</Text>
                    <Text style={[styles.cardMeta, { color: c.mutedForeground }]}>{line2}</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={24} color={c.mutedForeground} />
                </Pressable>
                <Pressable
                  onPress={() => handleDelete(b)}
                  disabled={deletingId === b.id}
                  style={[styles.deleteBtn, { backgroundColor: c.destructive + '20' }]}
                >
                  <MaterialIcons name="delete" size={20} color={c.destructive} />
                </Pressable>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, paddingBottom: 0 },
  subtitle: { fontSize: 14, marginBottom: 16, lineHeight: 20 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    gap: 12,
  },
  cardContent: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardMeta: { fontSize: 14, marginTop: 4 },
  deleteBtn: { padding: 10, borderRadius: 8 },
  empty: { padding: 48, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 16, fontWeight: '500' },
  emptyHint: { fontSize: 14 },
});
