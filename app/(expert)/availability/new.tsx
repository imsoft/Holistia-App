import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { useProfessionalStore } from '@/stores/professional-store';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type BlockType = 'full_day' | 'time_range';

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function NewAvailabilityBlockScreen() {
  const professional = useProfessionalStore((s) => s.professional);
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const [blockType, setBlockType] = useState<BlockType>('full_day');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(() => formatDate(new Date()));
  const [endDate, setEndDate] = useState(() => formatDate(new Date()));
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validate = (): boolean => {
    setError('');
    if (!title.trim()) {
      setError('El título es obligatorio');
      return false;
    }
    if (!startDate.trim()) {
      setError('La fecha de inicio es obligatoria');
      return false;
    }
    if (!endDate.trim()) {
      setError('La fecha de fin es obligatoria');
      return false;
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      setError('Fechas inválidas (usa YYYY-MM-DD)');
      return false;
    }
    if (end < start) {
      setError('La fecha de fin debe ser posterior a la de inicio');
      return false;
    }
    if (blockType === 'time_range') {
      const st = startTime.match(/^(\d{1,2}):(\d{2})$/);
      const et = endTime.match(/^(\d{1,2}):(\d{2})$/);
      if (!st || !et) {
        setError('Horas inválidas (usa HH:MM)');
        return false;
      }
      const startM = parseInt(st[1], 10) * 60 + parseInt(st[2], 10);
      const endM = parseInt(et[1], 10) * 60 + parseInt(et[2], 10);
      if (startM >= endM) {
        setError('La hora de fin debe ser posterior a la de inicio');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!professional || !validate()) return;

    setLoading(true);
    try {
      const blockData: Record<string, unknown> = {
        professional_id: professional.id,
        user_id: professional.user_id,
        title: title.trim(),
        description: description.trim() || null,
        block_type: blockType,
        is_recurring: false,
        start_date: startDate,
        end_date: endDate,
      };
      if (blockType === 'time_range') {
        blockData.start_time = startTime;
        blockData.end_time = endTime;
      }

      const { error: err } = await supabase.from('availability_blocks').insert(blockData);

      if (err) throw err;
      Alert.alert('Listo', 'Bloqueo creado correctamente', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo crear el bloqueo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={[styles.container, { backgroundColor: c.background }]} contentContainerStyle={styles.content}>
        <View style={styles.typeRow}>
          <Pressable
            onPress={() => setBlockType('full_day')}
            style={[
              styles.typeBtn,
              { borderColor: c.border },
              blockType === 'full_day' && { backgroundColor: c.primary, borderColor: c.primary },
            ]}
          >
            <Text style={[styles.typeBtnText, { color: blockType === 'full_day' ? c.primaryForeground : c.foreground }]}>
              Día completo
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setBlockType('time_range')}
            style={[
              styles.typeBtn,
              { borderColor: c.border },
              blockType === 'time_range' && { backgroundColor: c.primary, borderColor: c.primary },
            ]}
          >
            <Text style={[styles.typeBtnText, { color: blockType === 'time_range' ? c.primaryForeground : c.foreground }]}>
              Rango de horas
            </Text>
          </Pressable>
        </View>

        <Input
          label="Título *"
          value={title}
          onChangeText={setTitle}
          placeholder="Ej: Vacaciones, Reunión"
          placeholderTextColor={c.mutedForeground}
        />

        <Input
          label="Descripción (opcional)"
          value={description}
          onChangeText={setDescription}
          placeholder="Motivo del bloqueo"
          placeholderTextColor={c.mutedForeground}
        />

        <Input
          label="Fecha inicio *"
          value={startDate}
          onChangeText={setStartDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={c.mutedForeground}
        />

        <Input
          label="Fecha fin *"
          value={endDate}
          onChangeText={setEndDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={c.mutedForeground}
        />

        {blockType === 'time_range' && (
          <>
            <Input
              label="Hora inicio"
              value={startTime}
              onChangeText={setStartTime}
              placeholder="HH:MM"
              placeholderTextColor={c.mutedForeground}
            />
            <Input
              label="Hora fin"
              value={endTime}
              onChangeText={setEndTime}
              placeholder="HH:MM"
              placeholderTextColor={c.mutedForeground}
            />
          </>
        )}

        {error ? <Text style={[styles.error, { color: c.destructive }]}>{error}</Text> : null}

        <Button title="Crear bloqueo" onPress={handleSubmit} loading={loading} style={styles.submit} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  typeRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  typeBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
  },
  typeBtnText: { fontSize: 14, fontWeight: '600' },
  error: { fontSize: 14, marginBottom: 12 },
  submit: { marginTop: 8 },
});
