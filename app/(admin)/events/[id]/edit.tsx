import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

const CATEGORIES = [
  { value: 'espiritualidad', label: 'Espiritualidad' },
  { value: 'salud_mental', label: 'Salud Mental' },
  { value: 'salud_fisica', label: 'Salud Física' },
  { value: 'alimentacion', label: 'Alimentación' },
  { value: 'social', label: 'Social' },
];

export default function EditEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('09:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('18:00');
  const [location, setLocation] = useState('');
  const [price, setPrice] = useState('');
  const [isFree, setIsFree] = useState(true);
  const [maxCapacity, setMaxCapacity] = useState('20');
  const [category, setCategory] = useState('salud_mental');
  const [durationHours, setDurationHours] = useState('2');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('events_workshops')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        Alert.alert('Error', 'Evento no encontrado');
        router.back();
        return;
      }

      const d = data as Record<string, unknown>;
      setName((d.name as string) || '');
      setDescription((d.description as string) || '');
      setEventDate(String(d.event_date || '').split('T')[0]);
      setEventTime((d.event_time as string) || '09:00');
      setEndDate(String(d.end_date || d.event_date || '').split('T')[0]);
      setEndTime((d.end_time as string) || '18:00');
      setLocation((d.location as string) || '');
      setPrice(String(d.price ?? ''));
      setIsFree(!!d.is_free);
      setMaxCapacity(String(d.max_capacity ?? 20));
      setCategory((d.category as string) || 'salud_mental');
      setDurationHours(String(d.duration_hours ?? 2));
      setIsActive(d.is_active !== false);
    } catch (e) {
      console.error('Load error:', e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Nombre requerido';
    if (!eventDate.trim()) e.eventDate = 'Fecha requerida';
    if (!eventTime.trim()) e.eventTime = 'Hora requerida';
    if (!endDate.trim()) e.endDate = 'Fecha fin requerida';
    if (!endTime.trim()) e.endTime = 'Hora fin requerida';
    if (!location.trim()) e.location = 'Ubicación requerida';
    const cap = parseInt(maxCapacity, 10);
    if (isNaN(cap) || cap < 1) e.maxCapacity = 'Cupo mínimo 1';
    if (!isFree) {
      const p = parseFloat(String(price).replace(/[^0-9.]/g, ''));
      if (isNaN(p) || p <= 0) e.price = 'Precio requerido';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!id || !validate()) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        event_date: eventDate.trim(),
        event_time: eventTime.trim(),
        end_date: endDate.trim(),
        end_time: endTime.trim(),
        location: location.trim(),
        price: isFree ? 0 : parseFloat(String(price).replace(/[^0-9.]/g, '')) || 0,
        is_free: isFree,
        max_capacity: parseInt(maxCapacity, 10) || 10,
        category,
        duration_hours: parseFloat(durationHours) || 2,
        is_active: isActive,
      };

      const { error } = await supabase.from('events_workshops').update(payload).eq('id', id);

      if (error) throw error;
      Alert.alert('Éxito', 'Cambios guardados', [
        { text: 'OK', onPress: () => (router as any).replace(`/(admin)/events/${id}`) },
      ]);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TextInput
          style={[styles.input, { backgroundColor: c.card, color: c.foreground }]}
          placeholder="Nombre del evento *"
          placeholderTextColor={c.mutedForeground}
          value={name}
          onChangeText={setName}
        />
        {errors.name ? <Text style={styles.error}>{errors.name}</Text> : null}

        <Text style={[styles.label, { color: c.foreground }]}>Fecha inicio *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: c.card, color: c.foreground }]}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={c.mutedForeground}
          value={eventDate}
          onChangeText={setEventDate}
        />
        <Text style={[styles.label, { color: c.foreground }]}>Hora inicio *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: c.card, color: c.foreground }]}
          placeholder="HH:MM"
          placeholderTextColor={c.mutedForeground}
          value={eventTime}
          onChangeText={setEventTime}
        />
        <Text style={[styles.label, { color: c.foreground }]}>Fecha fin *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: c.card, color: c.foreground }]}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={c.mutedForeground}
          value={endDate}
          onChangeText={setEndDate}
        />
        <Text style={[styles.label, { color: c.foreground }]}>Hora fin *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: c.card, color: c.foreground }]}
          placeholder="HH:MM"
          placeholderTextColor={c.mutedForeground}
          value={endTime}
          onChangeText={setEndTime}
        />
        <Text style={[styles.label, { color: c.foreground }]}>Ubicación *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: c.card, color: c.foreground }]}
          placeholder="Dirección o lugar"
          placeholderTextColor={c.mutedForeground}
          value={location}
          onChangeText={setLocation}
        />
        {errors.location ? <Text style={styles.error}>{errors.location}</Text> : null}
        <Text style={[styles.label, { color: c.foreground }]}>Duración (horas)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: c.card, color: c.foreground }]}
          placeholder="2"
          placeholderTextColor={c.mutedForeground}
          value={durationHours}
          onChangeText={setDurationHours}
          keyboardType="decimal-pad"
        />
        <Text style={[styles.label, { color: c.foreground }]}>Categoría</Text>
        <View style={styles.categoryRow}>
          {CATEGORIES.map((cat) => (
            <Pressable
              key={cat.value}
              onPress={() => setCategory(cat.value)}
              style={[styles.categoryBtn, { backgroundColor: category === cat.value ? c.primary : c.card }]}
            >
              <Text
                style={[
                  styles.categoryBtnText,
                  { color: category === cat.value ? c.primaryForeground : c.foreground },
                ]}
              >
                {cat.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          onPress={() => {
            setIsFree(!isFree);
            if (isFree) setPrice('');
          }}
          style={[styles.checkRow, { backgroundColor: c.card }]}
        >
          <Text style={[styles.checkLabel, { color: c.foreground }]}>Gratuito</Text>
          <View style={[styles.checkbox, isFree && { backgroundColor: c.primary }]}>
            {isFree && <Text style={styles.checkMark}>✓</Text>}
          </View>
        </Pressable>
        {!isFree && (
          <>
            <Text style={[styles.label, { color: c.foreground }]}>Precio (MXN) *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.card, color: c.foreground }]}
              placeholder="500"
              placeholderTextColor={c.mutedForeground}
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
            />
          </>
        )}
        <Text style={[styles.label, { color: c.foreground }]}>Cupo máximo *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: c.card, color: c.foreground }]}
          placeholder="20"
          placeholderTextColor={c.mutedForeground}
          value={maxCapacity}
          onChangeText={setMaxCapacity}
          keyboardType="number-pad"
        />
        <Text style={[styles.label, { color: c.foreground }]}>Descripción</Text>
        <TextInput
          style={[styles.input, styles.textArea, { backgroundColor: c.card, color: c.foreground }]}
          placeholder="Descripción del evento"
          placeholderTextColor={c.mutedForeground}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />
        <Pressable
          onPress={() => setIsActive(!isActive)}
          style={[styles.checkRow, { backgroundColor: c.card }]}
        >
          <Text style={[styles.checkLabel, { color: c.foreground }]}>Activo</Text>
          <View style={[styles.checkbox, isActive && { backgroundColor: c.primary }]}>
            {isActive && <Text style={styles.checkMark}>✓</Text>}
          </View>
        </Pressable>
        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={[styles.saveBtn, { backgroundColor: c.primary }]}
        >
          {saving ? (
            <ActivityIndicator size="small" color={c.primaryForeground} />
          ) : (
            <Text style={[styles.saveBtnText, { color: c.primaryForeground }]}>Guardar cambios</Text>
          )}
        </Pressable>
        <Pressable onPress={() => router.back()} style={[styles.cancelBtn, { borderColor: c.border }]}>
          <Text style={[styles.cancelBtnText, { color: c.foreground }]}>Cancelar</Text>
        </Pressable>
        <View style={styles.bottomPad} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  textArea: { minHeight: 80 },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  categoryBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  categoryBtnText: { fontSize: 14 },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
  },
  checkLabel: { fontSize: 16 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { color: '#fff', fontWeight: '700', fontSize: 14 },
  error: { color: '#dc2626', fontSize: 12, marginTop: -8, marginBottom: 8 },
  saveBtn: { paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  saveBtnText: { fontSize: 16, fontWeight: '600' },
  cancelBtn: { paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 12, borderWidth: 1 },
  cancelBtnText: { fontSize: 16 },
  bottomPad: { height: 24 },
});
