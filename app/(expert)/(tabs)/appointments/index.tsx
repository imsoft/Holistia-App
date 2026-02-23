import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Alert,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useProfessionalStore } from '@/stores/professional-store';
import { useAuthStore } from '@/stores/auth-store';
import { supabase } from '@/lib/supabase';
import { webApiFetch } from '@/lib/web-api';
import { Button } from '@/components/ui/button';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { EmptyState } from '@/components/ui/empty-state';

type Apt = {
  id: string;
  appointment_date: string;
  appointment_time: string;
  duration_minutes: number;
  appointment_type: string;
  status: string;
  patient_name?: string;
  patient_email?: string;
};

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function startOfWeek(d: Date, weekStartsOn = 0): Date {
  const day = d.getDay();
  const diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
  const out = new Date(d);
  out.setDate(d.getDate() - diff);
  out.setHours(0, 0, 0, 0);
  return out;
}

function endOfWeek(d: Date, weekStartsOn = 0): Date {
  const s = startOfWeek(d, weekStartsOn);
  const out = new Date(s);
  out.setDate(s.getDate() + 6);
  out.setHours(23, 59, 59, 999);
  return out;
}

function eachDayOfInterval(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const curr = new Date(start);
  curr.setHours(0, 0, 0, 0);
  const endDate = new Date(end);
  endDate.setHours(0, 0, 0, 0);
  while (curr <= endDate) {
    days.push(new Date(curr));
    curr.setDate(curr.getDate() + 1);
  }
  return days;
}

function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isToday(d: Date): boolean {
  return toYMD(d) === toYMD(new Date());
}

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export default function ExpertAppointmentsScreen() {
  const professional = useProfessionalStore((s) => s.professional);
  const session = useAuthStore((s) => s.session);
  const [appointments, setAppointments] = useState<Apt[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedApt, setSelectedApt] = useState<Apt | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const colorScheme = useColorScheme();
  const c = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const load = useCallback(async (isRefresh = false) => {
    if (!professional) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data } = await supabase
        .from('appointments')
        .select('id, appointment_date, appointment_time, duration_minutes, appointment_type, status, patient_id')
        .eq('professional_id', professional.id)
        .in('status', ['pending', 'confirmed', 'completed', 'paid'])
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });

      const ids = (data || []).map((a) => a.id);
      let patientsMap = new Map<string, { full_name: string; email: string }>();
      if (ids.length > 0) {
        const apts = data || [];
        const patientIds = [...new Set(apts.map((a: any) => a.patient_id))];
        const { data: patients } = await supabase
          .from('professional_patient_info')
          .select('patient_id, full_name, email')
          .eq('professional_id', professional.id)
          .in('patient_id', patientIds);
        patientsMap = new Map((patients || []).map((p: any) => [p.patient_id, { full_name: p.full_name, email: p.email }]));
      }

      const withPatient = (data || []).map((a: any) => {
        const p = patientsMap.get(a.patient_id);
        return {
          ...a,
          patient_name: p?.full_name || 'Paciente',
          patient_email: p?.email || '',
        };
      });
      setAppointments(withPatient);
    } catch (e) {
      console.error('Appointments load:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [professional?.id]);

  useFocusEffect(
    useCallback(() => {
      if (professional) load();
    }, [professional?.id, load])
  );

  const statusLabel: Record<string, string> = {
    confirmed: 'Confirmada',
    pending: 'Pendiente',
    paid: 'Pagada',
    cancelled: 'Cancelada',
    completed: 'Completada',
  };

  const [actionId, setActionId] = useState<string | null>(null);

  const confirmAppointment = async (appointmentId: string) => {
    setActionId(appointmentId);
    try {
      const res = await webApiFetch('/api/appointments/confirm', session, {
        method: 'POST',
        body: JSON.stringify({ appointmentId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Error');
      setModalVisible(false);
      setSelectedApt(null);
      load(true);
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setActionId(null);
    }
  };

  const cancelAppointment = async (appointmentId: string) => {
    Alert.alert(
      'Cancelar cita',
      '¿Estás seguro de que deseas cancelar esta cita? Se generará un crédito para el paciente.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            setActionId(appointmentId);
            try {
              const res = await webApiFetch('/api/appointments/cancel', session, {
                method: 'POST',
                body: JSON.stringify({
                  appointmentId,
                  cancelledBy: 'professional',
                  cancellationReason: null,
                }),
              });
              const data = await res.json().catch(() => ({}));
              if (!res.ok) throw new Error((data as { error?: string }).error || 'Error');
              setModalVisible(false);
              setSelectedApt(null);
              load(true);
            } catch (e) {
              Alert.alert('Error', (e as Error).message);
            } finally {
              setActionId(null);
            }
          },
        },
      ]
    );
  };

  const markCompleted = async (appointmentId: string) => {
    setActionId(appointmentId);
    try {
      const res = await webApiFetch('/api/appointments/mark-completed', session, {
        method: 'POST',
        body: JSON.stringify({ appointmentId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Error');
      setModalVisible(false);
      setSelectedApt(null);
      load(true);
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setActionId(null);
    }
  };

  const getAppointmentsForDate = useCallback(
    (d: Date) => {
      const ymd = toYMD(d);
      return appointments.filter((a) => a.appointment_date === ymd);
    },
    [appointments]
  );

  const calendarWeeks = useMemo(() => {
    const monthStart = startOfMonth(calendarDate);
    const monthEnd = endOfMonth(calendarDate);
    const calStart = startOfWeek(monthStart, 0);
    const calEnd = endOfWeek(monthEnd, 0);
    const days = eachDayOfInterval(calStart, calEnd);
    const weeks: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }
    return weeks;
  }, [calendarDate]);

  const prevMonth = () => {
    setCalendarDate((d) => new Date(d.getFullYear(), d.getMonth() - 1));
  };

  const nextMonth = () => {
    setCalendarDate((d) => new Date(d.getFullYear(), d.getMonth() + 1));
  };

  if (loading && appointments.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: c.foreground }]}>Citas</Text>
          <Text style={[styles.subtitle, { color: c.mutedForeground }]}>Gestiona tus citas</Text>
        </View>
        <Button
          title="Nueva cita"
          onPress={() => router.push('/(tabs)/appointments/new')}
          variant="primary"
        />
      </View>

      <View style={[styles.toggleRow, { borderColor: c.border }]}>
        <Pressable
          onPress={() => setViewMode('list')}
          style={[styles.toggleBtn, viewMode === 'list' && { backgroundColor: c.primary }]}>
          <MaterialIcons
            name="list"
            size={20}
            color={viewMode === 'list' ? '#fff' : c.mutedForeground}
          />
          <Text style={[styles.toggleText, { color: viewMode === 'list' ? '#fff' : c.foreground }]}>
            Lista
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setViewMode('calendar')}
          style={[styles.toggleBtn, viewMode === 'calendar' && { backgroundColor: c.primary }]}>
          <MaterialIcons
            name="calendar-month"
            size={20}
            color={viewMode === 'calendar' ? '#fff' : c.mutedForeground}
          />
          <Text style={[styles.toggleText, { color: viewMode === 'calendar' ? '#fff' : c.foreground }]}>
            Calendario
          </Text>
        </Pressable>
      </View>

      {viewMode === 'list' ? (
        <FlatList
          data={appointments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.primary} />
          }
          renderItem={({ item }) => {
            const canConfirm = (item.status === 'pending' || item.status === 'paid') && actionId !== item.id;
            const canComplete = (item.status === 'confirmed' || item.status === 'pending' || item.status === 'paid') && actionId !== item.id;
            const canCancel = (item.status === 'pending' || item.status === 'confirmed' || item.status === 'paid') && actionId !== item.id;
            const canReschedule = (item.status === 'pending' || item.status === 'confirmed' || item.status === 'paid') && actionId !== item.id;
            return (
              <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
                <Text style={[styles.patient, { color: c.foreground }]}>{item.patient_name}</Text>
                <Text style={[styles.meta, { color: c.mutedForeground }]}>
                  {item.appointment_date} · {String(item.appointment_time).slice(0, 5)} · {item.appointment_type === 'presencial' ? 'Presencial' : 'Online'}
                </Text>
                <Text style={[styles.status, { color: c.primary }]}>{statusLabel[item.status] || item.status}</Text>
                <View style={styles.actions}>
                  {canReschedule && (
                    <Pressable
                      style={[styles.actionBtn, { borderWidth: 1, borderColor: c.primary }]}
                      onPress={() => {
                        setModalVisible(false);
                        setSelectedApt(null);
                        router.push(`/(expert)/(tabs)/appointments/${item.id}/reschedule` as any);
                      }}
                    >
                      <Text style={[styles.actionBtnText, { color: c.primary }]}>Reagendar</Text>
                    </Pressable>
                  )}
                  {canConfirm && (
                    <Pressable
                      style={[styles.actionBtn, { backgroundColor: c.primary }]}
                      onPress={() => confirmAppointment(item.id)}
                    >
                      <Text style={[styles.actionBtnText, { color: c.primaryForeground }]}>Confirmar</Text>
                    </Pressable>
                  )}
                  {canComplete && (
                    <Pressable
                      style={[styles.actionBtn, { backgroundColor: c.primary }]}
                      onPress={() => markCompleted(item.id)}
                    >
                      <Text style={[styles.actionBtnText, { color: c.primaryForeground }]}>Completada</Text>
                    </Pressable>
                  )}
                  {canCancel && (
                    <Pressable
                      style={[styles.actionBtn, { backgroundColor: c.destructive }]}
                      onPress={() => cancelAppointment(item.id)}
                    >
                      <Text style={[styles.actionBtnText, { color: '#fff' }]}>Cancelar</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <EmptyState
              icon="event"
              title="No hay citas"
              subtitle="Cuando reserves o crees citas, aparecerán aquí."
              actionLabel="Crear cita"
              onAction={() => router.push('/(expert)/(tabs)/appointments/new' as any)}
              iconColor={c.mutedForeground}
              titleColor={c.foreground}
              subtitleColor={c.mutedForeground}
              buttonBgColor={c.primary}
            />
          }
        />
      ) : (
        <ScrollView
          style={styles.calendarScroll}
          contentContainerStyle={styles.calendarContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.primary} />
          }>
          <View style={[styles.calendarNav, { borderColor: c.border }]}>
            <Pressable onPress={prevMonth} style={styles.navBtn}>
              <MaterialIcons name="chevron-left" size={24} color={c.foreground} />
            </Pressable>
            <Text style={[styles.calendarMonth, { color: c.foreground }]}>
              {MONTHS[calendarDate.getMonth()]} {calendarDate.getFullYear()}
            </Text>
            <Pressable onPress={nextMonth} style={styles.navBtn}>
              <MaterialIcons name="chevron-right" size={24} color={c.foreground} />
            </Pressable>
          </View>

          <View style={[styles.calendarGrid, { borderColor: c.border }]}>
            {DAYS.map((day, i) => (
              <View key={`h-${i}`} style={[styles.calendarDayHeader, { borderColor: c.border }]}>
                <Text style={[styles.calendarDayHeaderText, { color: c.mutedForeground }]}>{day}</Text>
              </View>
            ))}
            {calendarWeeks.flatMap((week, weekIdx) =>
              week.map((day, dayIdx) => {
                const dayApts = getAppointmentsForDate(day);
                const isCurrMonth = isSameMonth(day, calendarDate);
                const isDayToday = isToday(day);
                return (
                  <View
                    key={`${weekIdx}-${dayIdx}-${day.getTime()}`}
                    style={[
                      styles.calendarCell,
                      { borderColor: c.border, backgroundColor: !isCurrMonth ? c.muted + '30' : isDayToday ? c.primary + '15' : undefined },
                    ]}>
                    <Text
                      style={[
                        styles.calendarCellDay,
                        { color: !isCurrMonth ? c.mutedForeground : isDayToday ? c.primary : c.foreground },
                      ]}>
                      {day.getDate()}
                    </Text>
                    {dayApts.slice(0, 2).map((apt) => (
                      <Pressable
                        key={apt.id}
                        onPress={() => {
                          setSelectedApt(apt);
                          setModalVisible(true);
                        }}
                        style={[styles.calendarApt, { backgroundColor: c.primary + '30', borderColor: c.primary }]}>
                        <Text style={[styles.calendarAptText, { color: c.foreground }]} numberOfLines={1}>
                          {String(apt.appointment_time).slice(0, 5)} {apt.patient_name}
                        </Text>
                      </Pressable>
                    ))}
                    {dayApts.length > 2 && (
                      <Text style={[styles.calendarAptMore, { color: c.mutedForeground }]}>
                        +{dayApts.length - 2}
                      </Text>
                    )}
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: c.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.foreground }]}>Detalle de cita</Text>
              <Pressable onPress={() => { setModalVisible(false); setSelectedApt(null); }}>
                <MaterialIcons name="close" size={24} color={c.foreground} />
              </Pressable>
            </View>
            {selectedApt && (
              <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
                <Text style={[styles.modalPatient, { color: c.foreground }]}>{selectedApt.patient_name}</Text>
                <Text style={[styles.modalMeta, { color: c.mutedForeground }]}>
                  {selectedApt.appointment_date} · {String(selectedApt.appointment_time).slice(0, 5)} · {selectedApt.appointment_type === 'presencial' ? 'Presencial' : 'Online'}
                </Text>
                <Text style={[styles.modalStatus, { color: c.primary }]}>
                  {statusLabel[selectedApt.status] || selectedApt.status}
                </Text>
                <View style={styles.modalActions}>
                  {(selectedApt.status === 'pending' || selectedApt.status === 'confirmed' || selectedApt.status === 'paid') && actionId !== selectedApt.id && (
                    <Pressable
                      style={[styles.modalActionBtn, { borderWidth: 1, borderColor: c.primary }]}
                      onPress={() => {
                        setModalVisible(false);
                        setSelectedApt(null);
                        router.push(`/(expert)/(tabs)/appointments/${selectedApt.id}/reschedule` as any);
                      }}
                    >
                      <Text style={[styles.modalActionBtnText, { color: c.primary }]}>Reagendar</Text>
                    </Pressable>
                  )}
                  {(selectedApt.status === 'pending' || selectedApt.status === 'paid') && actionId !== selectedApt.id && (
                    <Pressable
                      style={[styles.modalActionBtn, { backgroundColor: c.primary }]}
                      onPress={() => confirmAppointment(selectedApt.id)}
                    >
                      <Text style={styles.modalActionBtnText}>Confirmar</Text>
                    </Pressable>
                  )}
                  {(selectedApt.status === 'confirmed' || selectedApt.status === 'pending' || selectedApt.status === 'paid') && actionId !== selectedApt.id && (
                    <Pressable
                      style={[styles.modalActionBtn, { backgroundColor: c.primary }]}
                      onPress={() => markCompleted(selectedApt.id)}
                    >
                      <Text style={styles.modalActionBtnText}>Completada</Text>
                    </Pressable>
                  )}
                  {(selectedApt.status === 'pending' || selectedApt.status === 'confirmed' || selectedApt.status === 'paid') && actionId !== selectedApt.id && (
                    <Pressable
                      style={[styles.modalActionBtn, { backgroundColor: c.destructive }]}
                      onPress={() => cancelAppointment(selectedApt.id)}
                    >
                      <Text style={[styles.modalActionBtnText, { color: '#fff' }]}>Cancelar</Text>
                    </Pressable>
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const { width } = Dimensions.get('window');
const CELL_SIZE = Math.floor((width - 40 - 6) / 7) - 2;

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    padding: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 15, marginTop: 4 },
  toggleRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  toggleText: { fontSize: 15, fontWeight: '600' },
  list: { padding: 20, paddingTop: 0, paddingBottom: 40 },
  card: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  patient: { fontSize: 16, fontWeight: '600' },
  meta: { fontSize: 13, marginTop: 4 },
  status: { fontSize: 12, marginTop: 6, fontWeight: '600' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  actionBtnText: { fontSize: 14, fontWeight: '600' },
  calendarScroll: { flex: 1 },
  calendarContent: { paddingHorizontal: 20, paddingBottom: 40 },
  calendarNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginBottom: 8,
    borderBottomWidth: 1,
  },
  navBtn: { padding: 8 },
  calendarMonth: { fontSize: 18, fontWeight: '700' },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 1,
    borderRadius: 12,
  },
  calendarDayHeader: {
    width: '14.28%',
    paddingVertical: 8,
    alignItems: 'center',
    borderRightWidth: 1,
    borderBottomWidth: 1,
  },
  calendarDayHeaderText: { fontSize: 11, fontWeight: '600' },
  calendarCell: {
    width: '14.28%',
    minHeight: Math.max(72, CELL_SIZE),
    padding: 4,
    borderRightWidth: 1,
    borderBottomWidth: 1,
  },
  calendarCellDay: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  calendarApt: {
    padding: 4,
    borderRadius: 4,
    borderWidth: 1,
    marginBottom: 2,
  },
  calendarAptText: { fontSize: 10 },
  calendarAptMore: { fontSize: 10, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '50%' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalBody: { flex: 1 },
  modalBodyContent: { padding: 20 },
  modalPatient: { fontSize: 18, fontWeight: '600' },
  modalMeta: { fontSize: 14, marginTop: 8 },
  modalStatus: { fontSize: 14, fontWeight: '600', marginTop: 8 },
  modalActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 20 },
  modalActionBtn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10 },
  modalActionBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
