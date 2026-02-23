import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useProfessionalStore } from '@/stores/professional-store';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Modality = 'presencial' | 'online' | 'both';
type ServiceType = 'session' | 'program';
type PricingType = 'fixed' | 'quote';
type ProgramUnit = 'horas' | 'dias' | 'semanas' | 'meses';

const MODALITY_LABELS: Record<Modality, string> = {
  presencial: 'Presencial',
  online: 'En línea',
  both: 'Presencial y en línea',
};

const TYPE_LABELS: Record<ServiceType, string> = {
  session: 'Sesión',
  program: 'Programa',
};

const PRICING_LABELS: Record<PricingType, string> = {
  fixed: 'Precio fijo',
  quote: 'Cotización',
};

const UNIT_LABELS: Record<ProgramUnit, string> = {
  horas: 'Horas',
  dias: 'Días',
  semanas: 'Semanas',
  meses: 'Meses',
};

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

export default function NewServiceScreen() {
  const professional = useProfessionalStore((s) => s.professional);
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [modality, setModality] = useState<Modality>('both');
  const [type, setType] = useState<ServiceType>('session');
  const [duration, setDuration] = useState('60');
  const [programValue, setProgramValue] = useState('1');
  const [programUnit, setProgramUnit] = useState<ProgramUnit>('semanas');
  const [pricingType, setPricingType] = useState<PricingType>('fixed');
  const [cost, setCost] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Nombre requerido';
    else if (name.trim().length < 3) e.name = 'Al menos 3 caracteres';
    if (type === 'session') {
      const d = parseInt(duration, 10);
      if (isNaN(d) || d < 15) e.duration = 'Mín. 15 min';
      else if (d > 480) e.duration = 'Máx. 480 min';
    } else {
      const v = parseInt(programValue, 10);
      if (isNaN(v) || v < 1) e.programDuration = 'Mín. 1 unidad';
    }
    if (pricingType === 'fixed') {
      const n = parseFloat(cost);
      if (isNaN(n) || n <= 0) e.cost = 'Costo requerido';
      else if (n > 1000000) e.cost = 'Máx. 1,000,000';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!professional) {
      Alert.alert('Error', 'No se encontró perfil profesional.');
      return;
    }
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        professional_id: professional.id,
        user_id: professional.user_id,
        name: name.trim(),
        description: description.trim() || null,
        type,
        modality,
        duration: type === 'session' ? parseInt(duration, 10) : 60,
        program_duration: type === 'program' ? { value: parseInt(programValue, 10), unit: programUnit } : null,
        pricing_type: pricingType,
        cost: pricingType === 'fixed' ? parseFloat(cost) : null,
        address: address.trim() || null,
        isactive: true,
      };

      const { error } = await supabase.from('professional_services').insert(payload).select().single();

      if (error) throw error;
      Alert.alert('Éxito', 'Servicio creado.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'No se pudo crear el servicio.');
    } finally {
      setLoading(false);
    }
  };

  if (!professional) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Text style={{ color: c.mutedForeground }}>Cargando...</Text>
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
          label="Nombre *"
          value={name}
          onChangeText={setName}
          placeholder="Ej: Consulta de Psicología"
          error={errors.name}
        />
        <Input
          label="Descripción"
          value={description}
          onChangeText={setDescription}
          placeholder="Describe el servicio..."
          multiline
          numberOfLines={4}
          style={styles.textArea}
        />
        <Text style={[styles.label, { color: c.foreground }]}>Modalidad *</Text>
        <OptionRow
          options={['presencial', 'online', 'both'] as const}
          value={modality}
          onSelect={setModality}
          labels={MODALITY_LABELS}
        />
        <Text style={[styles.label, { color: c.foreground }]}>Tipo *</Text>
        <OptionRow
          options={['session', 'program'] as const}
          value={type}
          onSelect={setType}
          labels={TYPE_LABELS}
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
          <View>
            <Text style={[styles.label, { color: c.foreground }]}>Duración del programa *</Text>
            <View style={styles.programRow}>
              <Input
                value={programValue}
                onChangeText={setProgramValue}
                placeholder="1"
                keyboardType="number-pad"
                style={styles.programInput}
              />
              <OptionRow
                options={['horas', 'dias', 'semanas', 'meses'] as const}
                value={programUnit}
                onSelect={setProgramUnit}
                labels={UNIT_LABELS}
              />
            </View>
          </View>
        )}
        <Text style={[styles.label, { color: c.foreground }]}>Tipo de precio *</Text>
        <OptionRow
          options={['fixed', 'quote'] as const}
          value={pricingType}
          onSelect={setPricingType}
          labels={PRICING_LABELS}
        />
        {pricingType === 'fixed' && (
          <Input
            label="Costo (MXN) *"
            value={cost}
            onChangeText={setCost}
            placeholder="800"
            keyboardType="decimal-pad"
            error={errors.cost}
          />
        )}
        <Input
          label="Dirección (opcional)"
          value={address}
          onChangeText={setAddress}
          placeholder="Ej: Consultorio 205, Av. Reforma 123"
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  optionBtn: { flex: 1, minWidth: 100 },
  programRow: { marginBottom: 16 },
  programInput: { marginBottom: 8 },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  btn: { flex: 1 },
});
