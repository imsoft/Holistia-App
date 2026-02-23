import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
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

export default function EditServiceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const professional = useProfessionalStore((s) => s.professional);
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);

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
  const [isActive, setIsActive] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!id || !professional) return;
    (async () => {
      const { data, error } = await supabase
        .from('professional_services')
        .select('*')
        .eq('id', id)
        .eq('professional_id', professional.id)
        .single();

      if (error || !data) {
        setNotFound(true);
        return;
      }

      setName(data.name || '');
      setDescription(data.description || '');
      setModality((data.modality as Modality) || 'both');
      setType((data.type as ServiceType) || 'session');
      setDuration(String(data.duration ?? 60));
      if (data.program_duration && typeof data.program_duration === 'object') {
        const pd = data.program_duration as { value?: number; unit?: ProgramUnit };
        setProgramValue(String(pd.value ?? 1));
        setProgramUnit((pd.unit as ProgramUnit) || 'semanas');
      }
      setPricingType((data.pricing_type as PricingType) || 'fixed');
      setCost(data.cost != null ? String(data.cost) : '');
      setAddress(data.address || '');
      setIsActive(!!data.isactive);
      setLoading(false);
    })();
  }, [id, professional?.id]);

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
    if (!id || !professional) return;
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        type,
        modality,
        duration: type === 'session' ? parseInt(duration, 10) : 60,
        program_duration: type === 'program' ? { value: parseInt(programValue, 10), unit: programUnit } : null,
        pricing_type: pricingType,
        cost: pricingType === 'fixed' ? parseFloat(cost) : null,
        address: address.trim() || null,
        isactive: isActive,
      };

      const { error } = await supabase.from('professional_services').update(payload).eq('id', id).eq('professional_id', professional.id);

      if (error) throw error;
      Alert.alert('Éxito', 'Servicio actualizado.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'No se pudo actualizar.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = () => {
    Alert.alert(
      isActive ? 'Desactivar servicio' : 'Activar servicio',
      isActive ? 'Los pacientes no verán este servicio hasta que lo reactives.' : 'El servicio será visible para los pacientes.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Aceptar', onPress: () => setIsActive(!isActive) },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  if (notFound) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Text style={[styles.notFound, { color: c.foreground }]}>Servicio no encontrado</Text>
        <Button title="Volver" onPress={() => router.back()} style={{ marginTop: 16 }} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Input label="Nombre *" value={name} onChangeText={setName} placeholder="Ej: Consulta de Psicología" error={errors.name} />
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
        <OptionRow options={['presencial', 'online', 'both'] as const} value={modality} onSelect={setModality} labels={MODALITY_LABELS} />
        <Text style={[styles.label, { color: c.foreground }]}>Tipo *</Text>
        <OptionRow options={['session', 'program'] as const} value={type} onSelect={setType} labels={TYPE_LABELS} />
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
              <Input value={programValue} onChangeText={setProgramValue} placeholder="1" keyboardType="number-pad" style={styles.programInput} />
              <OptionRow options={['horas', 'dias', 'semanas', 'meses'] as const} value={programUnit} onSelect={setProgramUnit} labels={UNIT_LABELS} />
            </View>
          </View>
        )}
        <Text style={[styles.label, { color: c.foreground }]}>Tipo de precio *</Text>
        <OptionRow options={['fixed', 'quote'] as const} value={pricingType} onSelect={setPricingType} labels={PRICING_LABELS} />
        {pricingType === 'fixed' && (
          <Input label="Costo (MXN) *" value={cost} onChangeText={setCost} placeholder="800" keyboardType="decimal-pad" error={errors.cost} />
        )}
        <Input label="Dirección (opcional)" value={address} onChangeText={setAddress} placeholder="Ej: Consultorio 205, Av. Reforma 123" />
        <View style={styles.actions}>
          <Button title={isActive ? 'Desactivar' : 'Activar'} variant="outline" onPress={handleToggleActive} style={styles.btn} />
        </View>
        <View style={styles.actions}>
          <Button title="Cancelar" variant="outline" onPress={() => router.back()} style={styles.btn} />
          <Button title="Guardar" onPress={handleSubmit} loading={saving} style={styles.btn} />
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
  optionBtn: { flex: 1, minWidth: 80 },
  programRow: { marginBottom: 16 },
  programInput: { marginBottom: 8 },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  btn: { flex: 1 },
  notFound: { fontSize: 16 },
});
