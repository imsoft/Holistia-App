import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { fetchSpecialties, type Specialty } from '@/lib/specialties';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { EmptyState } from '@/components/ui/empty-state';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function SpecialtiesScreen() {
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { specialties: list } = await fetchSpecialties();
      setSpecialties(list);
    } catch (e) {
      console.error('Specialties load:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && specialties.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <FlatList
        data={specialties}
        keyExtractor={(item) => item.slug}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.primary} />
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/(patient)/specialties/${item.slug}` as any)}
            style={({ pressed }) => [
              styles.row,
              { backgroundColor: c.card, borderColor: c.border },
              pressed && styles.pressed,
            ]}>
            <View style={[styles.iconWrap, { backgroundColor: c.muted }]}>
              <MaterialIcons name="medical-services" size={24} color={c.primary} />
            </View>
            <View style={styles.body}>
              <Text style={[styles.name, { color: c.foreground }]}>{item.name}</Text>
              <Text style={[styles.count, { color: c.mutedForeground }]}>
                {item.count} profesional{item.count !== 1 ? 'es' : ''}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={c.mutedForeground} />
          </Pressable>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="medical-services"
            title="Sin especialidades"
            subtitle="No hay especialidades disponibles por ahora."
            iconColor={c.mutedForeground}
            titleColor={c.foreground}
            subtitleColor={c.mutedForeground}
          />
        }
      />
    </View>
  );
}

SpecialtiesScreen.options = { title: 'Especialidades' };

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 20, paddingBottom: 40 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  pressed: { opacity: 0.9 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  body: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600' },
  count: { fontSize: 13, marginTop: 2 },
});
