import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useProfessionalStore } from '@/stores/professional-store';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
  expert: 'Experto',
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

export default function NewChallengeScreen() {
  const professional = useProfessionalStore((s) => s.professional);
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationDays, setDurationDays] = useState('7');
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel>('beginner');
  const [price, setPrice] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = 'Título requerido';
    else if (title.trim().length < 3) e.title = 'Al menos 3 caracteres';
    if (!description.trim()) e.description = 'Descripción requerida';
    const d = parseInt(durationDays, 10);
    if (isNaN(d) || d < 1) e.durationDays = 'Mín. 1 día';
    else if (d > 365) e.durationDays = 'Máx. 365 días';
    if (price.trim()) {
      const p = parseFloat(price.replace(',', '.'));
      if (isNaN(p) || p < 0) e.price = 'Precio inválido';
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
      const priceVal = price.trim() ? parseFloat(price.replace(',', '.')) : 0;
      const payload = {
        title: title.trim(),
        description: description.trim(),
        duration_days: parseInt(durationDays, 10),
        difficulty_level: difficultyLevel,
        price: priceVal,
        currency: 'MXN',
        is_active: true,
        is_public: isPublic,
        professional_id: professional.id,
        created_by_user_id: professional.user_id,
        created_by_type: 'professional' as const,
        linked_professional_id: professional.id,
      };

      const { error } = await supabase.from('challenges').insert(payload).select().single();

      if (error) throw error;
      Alert.alert('Éxito', 'Reto creado.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'No se pudo crear el reto.');
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
          label="Título *"
          value={title}
          onChangeText={setTitle}
          placeholder="Ej: Reto 7 días de meditación"
          error={errors.title}
        />
        <Input
          label="Descripción *"
          value={description}
          onChangeText={setDescription}
          placeholder="Describe el reto..."
          multiline
          numberOfLines={4}
          style={styles.textArea}
          error={errors.description}
        />
        <Input
          label="Duración (días) *"
          value={durationDays}
          onChangeText={setDurationDays}
          placeholder="7"
          keyboardType="number-pad"
          error={errors.durationDays}
        />
        <Text style={[styles.label, { color: c.foreground }]}>Nivel de dificultad</Text>
        <OptionRow
          options={['beginner', 'intermediate', 'advanced', 'expert'] as const}
          value={difficultyLevel}
          onSelect={setDifficultyLevel}
          labels={DIFFICULTY_LABELS}
        />
        <Input
          label="Precio (MXN) - 0 = gratuito"
          value={price}
          onChangeText={setPrice}
          placeholder="0"
          keyboardType="decimal-pad"
          error={errors.price}
        />
        <Text style={[styles.label, { color: c.foreground }]}>Visibilidad</Text>
        <OptionRow
          options={['true', 'false'] as const}
          value={String(isPublic) as 'true' | 'false'}
          onSelect={(v) => setIsPublic(v === 'true')}
          labels={{ true: 'Público', false: 'Privado' }}
        />
        <View style={styles.actions}>
          <Button title="Cancelar" variant="outline" onPress={() => router.back()} style={styles.btn} />
          <Button title="Crear reto" onPress={handleSubmit} loading={loading} style={styles.btn} />
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
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  btn: { flex: 1 },
});
