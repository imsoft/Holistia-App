import { useState, useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
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

type Professional = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  profession: string | null;
};

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

export default function AdminNewDigitalProductScreen() {
  const params = useLocalSearchParams<{ professionalId?: string }>();
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loadingProfs, setLoadingProfs] = useState(true);
  const [professionalId, setProfessionalId] = useState<string>(params.professionalId ?? '');

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

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('professional_applications')
          .select('id, first_name, last_name, profession')
          .eq('status', 'approved')
          .order('first_name');
        if (error) throw error;
        setProfessionals(data ?? []);
      } catch (e) {
        console.error('Load professionals:', e);
      } finally {
        setLoadingProfs(false);
      }
    })();
  }, [params.professionalId]);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!professionalId) e.professional = 'Selecciona un profesional';
    if (!title.trim()) e.title = 'Título requerido';
    else if (title.trim().length < 3) e.title = 'Al menos 3 caracteres';
    if (!description.trim()) e.description = 'Descripción requerida';
    const p = parseFloat(price.replace(',', '.'));
    if (isNaN(p) || p < 0) e.price = 'Precio inválido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        professional_id: professionalId,
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

      const { data, error } = await supabase.from('digital_products').insert(payload).select().single();

      if (error) throw error;
      Alert.alert('Éxito', 'Programa creado.', [
        { text: 'OK', onPress: () => (router as any).push(`/(admin)/digital-products/${data.id}`) },
      ]);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as any).message) : 'No se pudo crear el programa.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  if (loadingProfs && professionals.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
        <Text style={[styles.muted, { color: c.mutedForeground }]}>Cargando profesionales...</Text>
      </View>
    );
  }

  if (professionals.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Text style={[styles.muted, { color: c.mutedForeground }]}>No hay profesionales aprobados.</Text>
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
        <Text style={[styles.label, { color: c.foreground }]}>Profesional *</Text>
        <View style={styles.profList}>
          {professionals.map((prof) => {
            const name = `${prof.first_name ?? ''} ${prof.last_name ?? ''}`.trim() || (prof.profession ?? prof.id);
            const selected = professionalId === prof.id;
            return (
              <Pressable
                key={prof.id}
                onPress={() => setProfessionalId(prof.id)}
                style={[
                  styles.profCard,
                  {
                    backgroundColor: selected ? c.primary : c.card,
                    borderColor: selected ? c.primary : c.border,
                  },
                ]}
              >
                <Text
                  style={[styles.profName, { color: selected ? c.primaryForeground : c.foreground }]}
                  numberOfLines={2}
                >
                  {name}
                </Text>
                {prof.profession ? (
                  <Text style={[styles.profMeta, { color: selected ? c.primaryForeground : c.mutedForeground }]}>
                    {prof.profession}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
        {errors.professional ? (
          <Text style={[styles.error, { color: '#dc2626' }]}>{errors.professional}</Text>
        ) : null}

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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  muted: { fontSize: 15 },
  scroll: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  optionBtn: { flex: 1, minWidth: 80 },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  btn: { flex: 1 },
  profList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  profCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 2,
    minWidth: 140,
  },
  profName: { fontSize: 15, fontWeight: '600' },
  profMeta: { fontSize: 12, marginTop: 2 },
  error: { fontSize: 12, marginBottom: 8 },
});
