import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { webApiFetch } from '@/lib/web-api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const DIFFICULTY_OPTIONS = [
  { value: '', label: 'Sin especificar' },
  { value: 'beginner', label: 'Principiante' },
  { value: 'intermediate', label: 'Intermedio' },
  { value: 'advanced', label: 'Avanzado' },
  { value: 'expert', label: 'Experto' },
];

export default function EditChallengeScreen() {
  const { challengeId } = useLocalSearchParams<{ challengeId: string }>();
  const session = useAuthStore((s) => s.session);
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationDays, setDurationDays] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [showDifficultyPicker, setShowDifficultyPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!challengeId || !session) return;
    (async () => {
      try {
        const res = await webApiFetch(`/api/challenges/${challengeId}`, session);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al cargar');
        const ch = data.challenge;
        if (!ch) throw new Error('Reto no encontrado');
        setTitle(ch.title || '');
        setDescription(ch.description || '');
        setDurationDays(ch.duration_days != null ? String(ch.duration_days) : '');
        setDifficulty(ch.difficulty_level || '');
      } catch (e: any) {
        Alert.alert('Error', e?.message ?? 'No se pudo cargar el reto.');
        router.back();
      } finally {
        setLoading(false);
      }
    })();
  }, [challengeId, session]);

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    const trimmedDesc = description.trim();
    if (!trimmedTitle || !trimmedDesc) {
      Alert.alert('Campos requeridos', 'Título y descripción son obligatorios.');
      return;
    }
    if (!challengeId || !session) return;

    setSaving(true);
    try {
      const res = await webApiFetch(`/api/challenges/${challengeId}`, session, {
        method: 'PUT',
        body: JSON.stringify({
          title: trimmedTitle,
          description: trimmedDesc,
          duration_days: durationDays.trim() ? parseInt(durationDays, 10) || null : null,
          difficulty_level: difficulty || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');
      Alert.alert('Guardado', 'Los cambios se han guardado.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  };

  const difficultyLabel = DIFFICULTY_OPTIONS.find((o) => o.value === difficulty)?.label ?? 'Sin especificar';

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.sectionTitle, { color: c.foreground }]}>Editar reto</Text>

        <Input
          label="Título *"
          value={title}
          onChangeText={setTitle}
          placeholder="Ej: 30 días de meditación"
        />
        <Input
          label="Descripción *"
          value={description}
          onChangeText={setDescription}
          placeholder="Describe tu reto..."
          multiline
          numberOfLines={4}
        />
        <Input
          label="Duración (días)"
          value={durationDays}
          onChangeText={setDurationDays}
          placeholder="Ej: 30"
          keyboardType="number-pad"
        />
        <View style={styles.field}>
          <Text style={[styles.inputLabel, { color: c.foreground }]}>Dificultad</Text>
          <Pressable
            onPress={() => setShowDifficultyPicker(!showDifficultyPicker)}
            style={[styles.pickerTrigger, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.pickerTriggerText, { color: c.foreground }]}>{difficultyLabel}</Text>
            <Text style={{ color: c.mutedForeground }}>▼</Text>
          </Pressable>
          {showDifficultyPicker && (
            <View style={[styles.pickerList, { backgroundColor: c.card, borderColor: c.border }]}>
              {DIFFICULTY_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value || 'none'}
                  onPress={() => {
                    setDifficulty(opt.value);
                    setShowDifficultyPicker(false);
                  }}
                  style={[styles.pickerOption, { borderColor: c.border }]}>
                  <Text style={[styles.pickerOptionText, { color: c.foreground }]}>{opt.label}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View style={styles.actions}>
          <Button title="Cancelar" variant="outline" onPress={() => router.back()} style={styles.btn} />
          <Button
            title={saving ? 'Guardando...' : 'Guardar'}
            onPress={handleSave}
            disabled={saving}
            style={styles.btn}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// @ts-expect-error Expo Router options
EditChallengeScreen.options = { title: 'Editar reto' };

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 20, fontWeight: '700', marginBottom: 24 },
  field: { marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  pickerTriggerText: { fontSize: 16 },
  pickerList: { marginTop: 4, borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
  pickerOption: { paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1 },
  pickerOptionText: { fontSize: 15 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  btn: { flex: 1 },
});
