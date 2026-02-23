import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useProfessionalStore } from '@/stores/professional-store';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { EmptyState } from '@/components/ui/empty-state';

export default function ExpertServicesScreen() {
  const professional = useProfessionalStore((s) => s.professional);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const load = useCallback(async (isRefresh = false) => {
    if (!professional) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data } = await supabase
        .from('professional_services')
        .select('*')
        .eq('professional_id', professional.id)
        .order('created_at', { ascending: false });
      setServices(data || []);
    } catch (e) {
      console.error('Services load:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [professional?.id]);

  useEffect(() => {
    if (professional) load();
  }, [professional?.id]);

  if (loading && services.length === 0) {
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
          title="Nuevo servicio"
          onPress={() => router.push('/services/new')}
          variant="primary"
        />
      </View>
      <FlatList
        data={services}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.primary} />
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/services/${item.id}/edit`)}
            style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}
          >
            <Text style={[styles.name, { color: c.foreground }]}>{item.name || 'Sin nombre'}</Text>
            <Text style={[styles.meta, { color: c.mutedForeground }]}>
              {(item.type || item.servicetype) === 'session' ? 'Sesión' : 'Programa'} · {item.isactive ? 'Activo' : 'Inactivo'}
            </Text>
            {(item.cost != null || item.presencialcost != null) && (
              <Text style={[styles.price, { color: c.primary }]}>
                ${Number(item.cost ?? item.presencialcost ?? 0).toLocaleString()} MXN
              </Text>
            )}
            {item.pricing_type === 'quote' && (
              <Text style={[styles.meta, { color: c.primary }]}>Cotización</Text>
            )}
          </Pressable>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="medical-services"
            title="No tienes servicios"
            subtitle="Configura tus servicios para que los pacientes puedan reservar citas."
            actionLabel="Crear servicio"
            onAction={() => router.push('/services/new')}
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
  card: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  name: { fontSize: 16, fontWeight: '600' },
  meta: { fontSize: 13, marginTop: 4 },
  price: { fontSize: 14, marginTop: 4, fontWeight: '600' },
});
