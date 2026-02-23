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
import { router, useLocalSearchParams } from 'expo-router';
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

export default function AdminEditDigitalProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category>('meditation');
  const [price, setPrice] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [pagesCount, setPagesCount] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const showDuration = ['meditation', 'audio', 'video'].includes(category);
  const showPages = ['ebook', 'manual', 'guide'].includes(category);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data, error } = await supabase
        .from('digital_products')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setTitle(data.title || '');
      setDescription(data.description || '');
      setCategory((data.category as Category) || 'meditation');
      setPrice(data.price != null ? String(data.price) : '');
      setFileUrl(data.file_url || '');
      setDurationMinutes(data.duration_minutes != null ? String(data.duration_minutes) : '');
      setPagesCount(data.pages_count != null ? String(data.pages_count) : '');
      setIsActive(!!data.is_active);
      setLoading(false);
    })();
  }, [id]);

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
    if (!id) return;
    if (!validate()) return;

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim(),
        category,
        price: parseFloat(price.replace(',', '.')),
        currency: 'MXN',
        is_active: isActive,
        updated_at: new Date().toISOString(),
      };
      if (fileUrl.trim()) payload.file_url = fileUrl.trim();
      else payload.file_url = null;
      if (showDuration && durationMinutes.trim()) {
        const d = parseInt(durationMinutes, 10);
        payload.duration_minutes = !isNaN(d) && d > 0 ? d : null;
      } else {
        payload.duration_minutes = null;
      }
      if (showPages && pagesCount.trim()) {
        const p = parseInt(pagesCount, 10);
        payload.pages_count = !isNaN(p) && p > 0 ? p : null;
      } else {
        payload.pages_count = null;
      }

      const { error } = await supabase.from('digital_products').update(payload).eq('id', id);

      if (error) throw error;
      Alert.alert('Éxito', 'Programa actualizado.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: string }).message)
          : 'No se pudo actualizar.';
      Alert.alert('Error', msg);
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

  if (notFound) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Text style={[styles.notFound, { color: c.mutedForeground }]}>Programa no encontrado</Text>
        <Button title="Volver" variant="outline" onPress={() => router.back()} style={{ marginTop: 16 }} />
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
        <Text style={[styles.label, { color: c.foreground }]}>Estado</Text>
        <OptionRow
          options={['true', 'false'] as const}
          value={String(isActive) as 'true' | 'false'}
          onSelect={(v) => setIsActive(v === 'true')}
          labels={{ true: 'Activo', false: 'Inactivo' }}
        />
        <View style={styles.actions}>
          <Button title="Cancelar" variant="outline" onPress={() => router.back()} style={styles.btn} />
          <Button title="Guardar cambios" onPress={handleSubmit} loading={saving} style={styles.btn} />
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
  notFound: { fontSize: 16 },
});
