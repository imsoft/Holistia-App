import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
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

function timeStr(t: string | null | undefined): string {
  if (!t) return '09:00';
  const s = String(t);
  return s.length >= 5 ? s.slice(0, 5) : '09:00';
}

export default function EditAvailabilityBlockScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const professional = useProfessionalStore((s) => s.professional);
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const [block, setBlock] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [blockType, setBlockType] = useState<BlockType>('full_day');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');

  useEffect(() => {
    if (!id || !professional) return;
    (async () => {
      try {
        const { data, error: err } = await supabase
          .from('availability_blocks')
          .select('*')
          .eq('id', id)
          .eq('professional_id', professional.id)
          .maybeSingle();
        if (err) throw err;
        if (!data) {
          Alert.alert('Error', 'Bloqueo no encontrado', [{ text: 'OK', onPress: () => router.back() }]);
          return;
        }
        if (data.is_external_event) {
          Alert.alert('No editable', 'Este bloqueo viene de Google Calendar y no puede editarse desde la app.', [
            { text: 'OK', onPress: () => router.back() },
          ]);
          return;
        }
        setBlock(data);
        setBlockType((data.block_type as BlockType) || 'full_day');
        setTitle(data.title || '');
        setDescription(data.description || '');
        setStartDate(data.start_date ? String(data.start_date).slice(0, 10) : formatDate(new Date()));
        setEndDate(data.end_date ? String(data.end_date).slice(0, 10) : formatDate(new Date()));
        setStartTime(timeStr(data.start_time));
        setEndTime(timeStr(data.end_time));
      } catch (e: any) {
        Alert.alert('Error', e?.message ?? 'Error al cargar');
        router.back();
      } finally {
        setLoading(false);
      }
    })();
  }, [id, professional?.id]);

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
    if (!id || !professional || !validate()) return;

    setSubmitting(true);
    try {
      const blockData: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || null,
        block_type: blockType,
        start_date: startDate,
        end_date: endDate,
      };
      if (blockType === 'time_range') {
        blockData.start_time = startTime;
        blockData.end_time = endTime;
      }

      const { error: err } = await supabase
        .from('availability_blocks')
        .update(blockData)
        .eq('id', id)
        .eq('professional_id', professional.id);

      if (err) throw err;
      Alert.alert('Listo', 'Bloqueo actualizado correctamente', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo actualizar');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !block) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

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

        <Input label="Título *" value={title} onChangeText={setTitle} placeholder="Ej: Vacaciones" />
        <Input label="Descripción (opcional)" value={description} onChangeText={setDescription} placeholder="Motivo" />
        <Input label="Fecha inicio *" value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" />
        <Input label="Fecha fin *" value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD" />

        {blockType === 'time_range' && (
          <>
            <Input label="Hora inicio" value={startTime} onChangeText={setStartTime} placeholder="HH:MM" />
            <Input label="Hora fin" value={endTime} onChangeText={setEndTime} placeholder="HH:MM" />
          </>
        )}

        {error ? <Text style={[styles.error, { color: c.destructive }]}>{error}</Text> : null}

        <Button title="Guardar cambios" onPress={handleSubmit} loading={submitting} style={styles.submit} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  typeRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  typeBtn: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center', borderWidth: 2 },
  typeBtnText: { fontSize: 14, fontWeight: '600' },
  error: { fontSize: 14, marginBottom: 12 },
  submit: { marginTop: 8 },
});
