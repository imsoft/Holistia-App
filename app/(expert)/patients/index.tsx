import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useProfessionalStore } from '@/stores/professional-store';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ExpertPatientsScreen() {
  const professional = useProfessionalStore((s) => s.professional);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const load = useCallback(async (isRefresh = false) => {
    if (!professional) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data } = await supabase
        .from('professional_patient_info')
        .select('patient_id, full_name, email, phone')
        .eq('professional_id', professional.id)
        .order('full_name');
      setPatients(data || []);
    } catch (e) {
      console.error('Patients load:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [professional?.id]);

  useEffect(() => {
    if (professional) load();
  }, [professional?.id]);

  if (loading && patients.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <FlatList
        data={patients}
        keyExtractor={(item) => item.patient_id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.primary} />
        }
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={[styles.avatar, { backgroundColor: c.muted }]}>
              <Text style={[styles.avatarText, { color: c.foreground }]}>
                {(item.full_name || 'P').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.info}>
              <Text style={[styles.name, { color: c.foreground }]}>{item.full_name || 'Paciente'}</Text>
              <Text style={[styles.email, { color: c.mutedForeground }]}>{item.email || ''}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: c.mutedForeground }]}>No hay pacientes</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 20 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 18, fontWeight: '600' },
  info: { marginLeft: 12, flex: 1 },
  name: { fontSize: 16, fontWeight: '600' },
  email: { fontSize: 13, marginTop: 2 },
  empty: { fontSize: 16, textAlign: 'center', marginTop: 24 },
});
