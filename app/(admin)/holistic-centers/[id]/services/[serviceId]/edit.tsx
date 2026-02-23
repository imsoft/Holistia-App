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
  Switch,
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

type Service = {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  service_type: string;
  max_capacity: number | null;
  is_active: boolean;
};

export default function AdminEditCenterServiceScreen() {
  const { id, serviceId } = useLocalSearchParams<{ id: string; serviceId: string }>();
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const [service, setService] = useState<Service | null>(null);
  const [loadingService, setLoadingService] = useState(true);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [serviceType, setServiceType] = useState<'individual' | 'group'>('individual');
  const [maxCapacity, setMaxCapacity] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      if (!serviceId) return;
      const { data, error } = await supabase
        .from('holistic_center_services')
        .select('id, name, description, price, service_type, max_capacity, is_active')
        .eq('id', serviceId)
        .single();
      if (error || !data) {
        setService(null);
      } else {
        setService(data as Service);
        setName(data.name || '');
        setDescription(data.description || '');
        setPrice(data.price != null ? String(data.price) : '');
        setServiceType((data.service_type === 'group' ? 'group' : 'individual') as 'individual' | 'group');
        setMaxCapacity(data.max_capacity != null ? String(data.max_capacity) : '');
        setIsActive(data.is_active ?? true);
      }
      setLoadingService(false);
    })();
  }, [serviceId]);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Nombre requerido';
    if (serviceType === 'group') {
      const cap = parseInt(maxCapacity, 10);
      if (isNaN(cap) || cap < 1) e.maxCapacity = 'Capacidad mínima 1';
    }
    const p = parseFloat(price.replace(',', '.'));
    if (price.trim() && (isNaN(p) || p < 0)) e.price = 'Precio inválido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!serviceId || !validate()) return;

    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        price: price.trim() ? parseFloat(price.replace(',', '.')) : null,
        service_type: serviceType,
        max_capacity: serviceType === 'group' ? parseInt(maxCapacity, 10) || null : null,
        is_active: isActive,
      };

      const { error } = await supabase.from('holistic_center_services').update(payload).eq('id', serviceId);

      if (error) throw error;
      Alert.alert('Éxito', 'Servicio actualizado.', [
        { text: 'OK', onPress: () => router.replace(`/(admin)/holistic-centers/${id}` as any) },
      ]);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as any).message)
          : 'No se pudo actualizar.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  if (loadingService) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
        <Text style={[styles.muted, { color: c.mutedForeground }]}>Cargando...</Text>
      </View>
    );
  }

  if (!service) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Text style={[styles.muted, { color: c.mutedForeground }]}>Servicio no encontrado</Text>
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
        <Input
          label="Nombre *"
          value={name}
          onChangeText={setName}
          placeholder="Nombre del servicio"
          error={errors.name}
        />
        <Input
          label="Descripción"
          value={description}
          onChangeText={setDescription}
          placeholder="Descripción del servicio"
          multiline
          numberOfLines={3}
          style={styles.textArea}
        />
        <Input
          label="Precio (opcional)"
          value={price}
          onChangeText={setPrice}
          placeholder="0"
          keyboardType="decimal-pad"
          error={errors.price}
        />
        <Text style={[styles.label, { color: c.foreground }]}>Tipo</Text>
        <OptionRow
          options={['individual', 'group'] as const}
          value={serviceType}
          onSelect={setServiceType}
          labels={{ individual: 'Individual', group: 'Grupal' }}
        />
        {serviceType === 'group' && (
          <Input
            label="Capacidad máxima *"
            value={maxCapacity}
            onChangeText={setMaxCapacity}
            placeholder="10"
            keyboardType="number-pad"
            error={errors.maxCapacity}
          />
        )}
        <View style={styles.switchRow}>
          <Text style={[styles.label, { color: c.foreground }]}>Activo</Text>
          <Switch
            value={isActive}
            onValueChange={setIsActive}
            trackColor={{ false: c.border, true: c.primary }}
            thumbColor="#fff"
          />
        </View>
        <View style={styles.actions}>
          <Button title="Cancelar" variant="outline" onPress={() => router.back()} style={styles.btn} />
          <Button title="Guardar cambios" onPress={handleSubmit} loading={loading} style={styles.btn} />
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
  optionBtn: { flex: 1, minWidth: 100 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  btn: { flex: 1 },
});
