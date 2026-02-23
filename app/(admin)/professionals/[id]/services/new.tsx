import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

function OptionRow<T extends string>({
  options,
  value,
  onSelect,
  labels,
}: {
  options: readonly T[];
  value: T;
  onSelect: (v: T) => void;
  labels: Record<T, string>;
}) {
  return (
    <View style={styles.optionRow}>
      {options.map((opt) => (
        <Button
          key={opt}
          title={labels[opt]}
          variant={value === opt ? 'primary' : 'outline'}
          onPress={() => onSelect(opt)}
          style={styles.optionBtn}
        />
      ))}
    </View>
  );
}

export default function AdminNewProfessionalServiceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const [userId, setUserId] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'session' | 'program'>('session');
  const [modality, setModality] = useState<'presencial' | 'online' | 'both'>('both');
  const [duration, setDuration] = useState('60');
  const [programValue, setProgramValue] = useState('4');
  const [programUnit, setProgramUnit] = useState<'horas' | 'dias' | 'semanas' | 'meses'>('semanas');
  const [pricingType, setPricingType] = useState<'fixed' | 'quote'>('fixed');
  const [cost, setCost] = useState('');
  const [address, setAddress] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      if (!id) return;
      const { data } = await supabase
        .from('professional_applications')
        .select('user_id')
        .eq('id', id)
        .single();
      setUserId(data?.user_id ?? null);
      setLoadingUser(false);
    })();
  }, [id]);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Nombre requerido';
    else if (name.trim().length < 3) e.name = 'Al menos 3 caracteres';
    if (type === 'session') {
      const d = parseInt(duration, 10);
      if (isNaN(d) || d < 15 || d > 480) e.duration = 'Duración entre 15 y 480 min';
    } else {
      const v = parseInt(programValue, 10);
      if (isNaN(v) || v < 1) e.programDuration = 'Duración mínima 1';
    }
    if (pricingType === 'fixed') {
      const p = parseFloat(cost.replace(',', '.'));
      if (isNaN(p) || p <= 0) e.cost = 'Precio requerido';
      else if (p > 1000000) e.cost = 'Máximo 1,000,000 MXN';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!id || !userId || !validate()) return;

    setLoading(true);
    try {
      const durationMin = type === 'session' ? parseInt(duration, 10) : 60;
      const programDuration =
        type === 'program'
          ? { value: parseInt(programValue, 10) || 1, unit: programUnit }
          : null;

      const payload = {
        professional_id: id,
        user_id: userId,
        name: name.trim(),
        description: description.trim() || null,
        type,
        modality,
        duration: durationMin,
        program_duration: programDuration,
        cost: pricingType === 'quote' ? null : parseFloat(cost.replace(',', '.')) || null,
        pricing_type: pricingType,
        address: address.trim() || null,
        image_url: imageUrl.trim() || null,
        isactive: true,
      };

      const { error } = await supabase.from('professional_services').insert(payload);

      if (error) throw error;
      Alert.alert('Éxito', 'Servicio creado.', [
        { text: 'OK', onPress: () => router.replace(`/(admin)/professionals/${id}` as any) },
      ]);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as any).message)
          : 'No se pudo crear el servicio.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  if (loadingUser || !userId) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
        <Text style={[styles.muted, { color: c.mutedForeground }]}>Cargando...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Input
          label="Nombre del servicio *"
          value={name}
          onChangeText={setName}
          placeholder="Ej: Consulta de Psicología"
          error={errors.name}
        />
        <Input
          label="Descripción"
          value={description}
          onChangeText={setDescription}
          placeholder="Describe qué incluye..."
          multiline
          numberOfLines={4}
          style={styles.textArea}
        />
        <Text style={[styles.label, { color: c.foreground }]}>Modalidad</Text>
        <OptionRow
          options={['presencial', 'online', 'both'] as const}
          value={modality}
          onSelect={setModality}
          labels={{ presencial: 'Presencial', online: 'En línea', both: 'Ambas' }}
        />
        <Text style={[styles.label, { color: c.foreground }]}>Tipo</Text>
        <OptionRow
          options={['session', 'program'] as const}
          value={type}
          onSelect={setType}
          labels={{ session: 'Sesión', program: 'Programa' }}
        />
        {type === 'session' ? (
          <Input
            label="Duración (minutos) *"
            value={duration}
            onChangeText={setDuration}
            placeholder="60"
            keyboardType="number-pad"
            error={errors.duration}
          />
        ) : (
          <View style={styles.row}>
            <Input
              label="Duración *"
              value={programValue}
              onChangeText={setProgramValue}
              placeholder="4"
              keyboardType="number-pad"
              style={{ flex: 1 }}
              error={errors.programDuration}
            />
            <View style={styles.unitPicker}>
              <Text style={[styles.label, { color: c.foreground }]}>Unidad</Text>
              <OptionRow
                options={['horas', 'dias', 'semanas', 'meses'] as const}
                value={programUnit}
                onSelect={setProgramUnit}
                labels={{ horas: 'Horas', dias: 'Días', semanas: 'Semanas', meses: 'Meses' }}
              />
            </View>
          </View>
        )}
        <Text style={[styles.label, { color: c.foreground }]}>Tipo de precio</Text>
        <OptionRow
          options={['fixed', 'quote'] as const}
          value={pricingType}
          onSelect={setPricingType}
          labels={{ fixed: 'Precio fijo', quote: 'Cotización' }}
        />
        {pricingType === 'fixed' && (
          <Input
            label="Costo (MXN) *"
            value={cost}
            onChangeText={setCost}
            placeholder="500"
            keyboardType="decimal-pad"
            error={errors.cost}
          />
        )}
        <Input
          label="Dirección (opcional)"
          value={address}
          onChangeText={setAddress}
          placeholder="Dirección del servicio"
        />
        <Input
          label="URL imagen (opcional)"
          value={imageUrl}
          onChangeText={setImageUrl}
          placeholder="https://..."
          keyboardType="url"
        />
        <View style={styles.actions}>
          <Button title="Cancelar" variant="outline" onPress={() => router.back()} style={styles.btn} />
          <Button title="Crear servicio" onPress={handleSubmit} loading={loading} style={styles.btn} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  muted: { fontSize: 15 },
  scroll: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  optionBtn: { flex: 1, minWidth: 80 },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },
  unitPicker: { flex: 1 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  btn: { flex: 1 },
});
