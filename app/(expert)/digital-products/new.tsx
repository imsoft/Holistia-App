import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useProfessionalStore } from '@/stores/professional-store';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Category =
  | 'meditation'
  | 'ebook'
  | 'manual'
  | 'guide'
  | 'audio'
  | 'video'
  | 'other';

const CATEGORY_LABELS: Record<Category, string> = {
  meditation: 'Meditación',
  ebook: 'Workbook',
  manual: 'Manual',
  guide: 'Guía',
  audio: 'Audio',
  video: 'Video',
  other: 'Otro',
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

export default function NewDigitalProductScreen() {
  const professional = useProfessionalStore((s) => s.professional);
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('meditation');
  const [price, setPrice] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [pagesCount, setPagesCount] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const showDuration = ['meditation', 'audio', 'video'].includes(category);
  const showPages = ['ebook', 'manual', 'guide'].includes(category);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = 'Título requerido';
    else if (title.trim().length < 3) e.title = 'Al menos 3 caracteres';
    if (!description.trim()) e.description = 'Descripción requerida';
    const p = parseFloat(price.replace(',', '.'));
    if (isNaN(p) || p < 0) e.price = 'Precio inválido';
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
      const payload: Record<string, unknown> = {
        professional_id: professional.id,
        title: title.trim(),
        description: description.trim(),
        category,
        price: parseFloat(price.replace(',', '.')),
        currency: 'MXN',
        is_active: true,
      };
      if (fileUrl.trim()) payload.file_url = fileUrl.trim();
      if (showDuration && durationMinutes.trim()) {
        const d = parseInt(durationMinutes, 10);
        if (!isNaN(d) && d > 0) payload.duration_minutes = d;
      }
      if (showPages && pagesCount.trim()) {
        const p = parseInt(pagesCount, 10);
        if (!isNaN(p) && p > 0) payload.pages_count = p;
      }

      const { error } = await supabase.from('digital_products').insert(payload).select().single();

      if (error) throw error;
      Alert.alert('Éxito', 'Programa creado.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'No se pudo crear el programa.');
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
          placeholder="Ej: Guía de meditación"
          error={errors.title}
        />
        <Input
          label="Descripción *"
          value={description}
          onChangeText={setDescription}
          placeholder="Describe el programa..."
          multiline
          numberOfLines={4}
          style={styles.textArea}
          error={errors.description}
        />
        <Text style={[styles.label, { color: c.foreground }]}>Categoría</Text>
        <OptionRow
          options={['meditation', 'ebook', 'manual', 'guide', 'audio', 'video', 'other'] as const}
          value={category}
          onSelect={setCategory}
          labels={CATEGORY_LABELS}
        />
        <Input
          label="Precio (MXN) *"
          value={price}
          onChangeText={setPrice}
          placeholder="299"
          keyboardType="decimal-pad"
          error={errors.price}
        />
        <Input
          label="URL del archivo (opcional)"
          value={fileUrl}
          onChangeText={setFileUrl}
          placeholder="https://..."
          keyboardType="url"
        />
        {showDuration && (
          <Input
            label="Duración (minutos)"
            value={durationMinutes}
            onChangeText={setDurationMinutes}
            placeholder="15"
            keyboardType="number-pad"
          />
        )}
        {showPages && (
          <Input
            label="Número de páginas"
            value={pagesCount}
            onChangeText={setPagesCount}
            placeholder="50"
            keyboardType="number-pad"
          />
        )}
        <View style={styles.actions}>
          <Button title="Cancelar" variant="outline" onPress={() => router.back()} style={styles.btn} />
          <Button title="Crear programa" onPress={handleSubmit} loading={loading} style={styles.btn} />
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
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  btn: { flex: 1 },
});
