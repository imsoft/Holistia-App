import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Pressable,
  Modal,
} from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

type Appointment = {
  id: string;
  patient_id: string;
  professional_id: string;
  appointment_date: string;
  appointment_time: string;
  duration_minutes: number;
  appointment_type: string;
  status: string;
  cost: number | null;
  patient_name: string;
  patient_email: string;
  professional_name: string;
  professional_profession: string;
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  paid: 'Pagada',
  completed: 'Completada',
  cancelled: 'Cancelada',
  patient_no_show: 'No asistió paciente',
  professional_no_show: 'No asistió profesional',
};

export default function AdminAppointmentsScreen() {
  const [list, setList] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data: apts, error } = await supabase
        .from('appointments')
        .select('id, patient_id, professional_id, appointment_date, appointment_time, duration_minutes, appointment_type, status, cost')
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: false })
        .limit(300);

      if (error) throw error;
      if (!apts?.length) {
        setList([]);
        return;
      }

      const patientIds = [...new Set(apts.map((a) => a.patient_id))];
      const professionalIds = [...new Set(apts.map((a) => a.professional_id))];

      const { data: patients } = await supabase
        .from('profiles')
        .select('id, full_name, first_name, last_name, email')
        .in('id', patientIds);

      const { data: professionals } = await supabase
        .from('professional_applications')
        .select('id, first_name, last_name, profession')
        .in('id', professionalIds);

      const patientMap = new Map(
        (patients || []).map((p) => [
          p.id,
          p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Paciente',
        ])
      );
      const patientEmailMap = new Map((patients || []).map((p) => [p.id, p.email || '']));
      const profMap = new Map(
        (professionals || []).map((p) => [
          p.id,
          `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Profesional',
        ])
      );
      const profProfessionMap = new Map((professionals || []).map((p) => [p.id, p.profession || '']));

      const enriched: Appointment[] = apts.map((a) => ({
        ...a,
        patient_name: patientMap.get(a.patient_id) || 'Paciente',
        patient_email: patientEmailMap.get(a.patient_id) || '',
        professional_name: profMap.get(a.professional_id) || 'Profesional',
        professional_profession: profProfessionMap.get(a.professional_id) || '',
      }));

      setList(enriched);
    } catch (e) {
      console.error('Appointments load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, []);

  const filtered = list.filter((a) => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        a.patient_name.toLowerCase().includes(q) ||
        a.professional_name.toLowerCase().includes(q) ||
        a.patient_email.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const stats = {
    total: list.length,
    pending: list.filter((a) => a.status === 'pending').length,
    confirmed: list.filter((a) => ['confirmed', 'paid'].includes(a.status)).length,
    completed: list.filter((a) => a.status === 'completed').length,
  };

  const formatDate = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-MX', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  const formatTime = (s: string) => s?.substring(0, 5) || '';

  if (loading && list.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.primary} />
      }>
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: c.card }]}>
          <Text style={[styles.statLabel, { color: c.mutedForeground }]}>Total</Text>
          <Text style={[styles.statValue, { color: c.foreground }]}>{stats.total}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: c.card }]}>
          <Text style={[styles.statLabel, { color: '#b45309' }]}>Pendientes</Text>
          <Text style={[styles.statValue, { color: '#d97706' }]}>{stats.pending}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: c.card }]}>
          <Text style={[styles.statLabel, { color: '#15803d' }]}>Confirmadas</Text>
          <Text style={[styles.statValue, { color: '#16a34a' }]}>{stats.confirmed}</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: c.card }]}>
          <Text style={[styles.statLabel, { color: '#1d4ed8' }]}>Completadas</Text>
          <Text style={[styles.statValue, { color: '#2563eb' }]}>{stats.completed}</Text>
        </View>
      </View>

      <TextInput
        style={[styles.input, { backgroundColor: c.card, color: c.foreground, borderColor: c.border }]}
        placeholder="Buscar paciente o profesional..."
        placeholderTextColor={c.mutedForeground}
        value={search}
        onChangeText={setSearch}
      />

      <View style={styles.filterRow}>
        {['all', 'pending', 'confirmed', 'paid', 'completed', 'cancelled'].map((s) => (
          <Pressable
            key={s}
            onPress={() => setStatusFilter(s)}
            style={[
              styles.filterChip,
              { borderColor: c.border, backgroundColor: statusFilter === s ? c.primary : c.card },
            ]}>
            <Text
              style={[
                styles.filterChipText,
                { color: statusFilter === s ? '#fff' : c.foreground },
              ]}>
              {s === 'all' ? 'Todas' : STATUS_LABELS[s] || s}
            </Text>
          </Pressable>
        ))}
      </View>

      {filtered.map((a) => (
        <Pressable
          key={a.id}
          onPress={() => {
            setSelected(a);
            setModalVisible(true);
          }}
          style={[styles.row, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.rowTitle, { color: c.foreground }]}>{a.patient_name}</Text>
          <Text style={[styles.rowMeta, { color: c.mutedForeground }]}>
            {formatDate(a.appointment_date)} · {formatTime(a.appointment_time)} · {a.professional_name}
          </Text>
          <Text style={[styles.rowStatus, { color: c.primary }]}>
            {STATUS_LABELS[a.status] || a.status}
          </Text>
        </Pressable>
      ))}

      {filtered.length === 0 && (
        <Text style={[styles.empty, { color: c.mutedForeground }]}>No hay citas</Text>
      )}
      <View style={styles.bottomPad} />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: c.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.foreground }]}>Detalle de cita</Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={c.foreground} />
              </Pressable>
            </View>
            {selected && (
              <ScrollView style={styles.modalBody}>
                <Text style={[styles.modalLabel, { color: c.mutedForeground }]}>Paciente</Text>
                <Text style={[styles.modalValue, { color: c.foreground }]}>{selected.patient_name}</Text>
                <Text style={[styles.modalValue, { color: c.mutedForeground }]}>{selected.patient_email}</Text>

                <Text style={[styles.modalLabel, { color: c.mutedForeground }]}>Profesional</Text>
                <Text style={[styles.modalValue, { color: c.foreground }]}>{selected.professional_name}</Text>
                <Text style={[styles.modalValue, { color: c.mutedForeground }]}>{selected.professional_profession}</Text>

                <Text style={[styles.modalLabel, { color: c.mutedForeground }]}>Fecha y hora</Text>
                <Text style={[styles.modalValue, { color: c.foreground }]}>
                  {formatDate(selected.appointment_date)} · {formatTime(selected.appointment_time)}
                </Text>
                <Text style={[styles.modalValue, { color: c.mutedForeground }]}>
                  {selected.duration_minutes} min · {selected.appointment_type === 'presencial' ? 'Presencial' : 'Online'}
                </Text>

                <Text style={[styles.modalLabel, { color: c.mutedForeground }]}>Estado</Text>
                <Text style={[styles.modalValue, { color: c.primary }]}>
                  {STATUS_LABELS[selected.status] || selected.status}
                </Text>

                {selected.cost != null && selected.cost > 0 && (
                  <>
                    <Text style={[styles.modalLabel, { color: c.mutedForeground }]}>Costo</Text>
                    <Text style={[styles.modalValue, { color: c.foreground }]}>${selected.cost} MXN</Text>
                  </>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, minWidth: 70, padding: 12, borderRadius: 10 },
  statLabel: { fontSize: 11, marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  filterChipText: { fontSize: 13, fontWeight: '500' },
  row: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  rowTitle: { fontSize: 16, fontWeight: '600' },
  rowMeta: { fontSize: 13, marginTop: 4 },
  rowStatus: { fontSize: 12, marginTop: 6, fontWeight: '600' },
  empty: { textAlign: 'center', padding: 24 },
  bottomPad: { height: 24 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalBody: { padding: 20 },
  modalLabel: { fontSize: 12, fontWeight: '600', marginTop: 16, marginBottom: 4 },
  modalValue: { fontSize: 15 },
});
