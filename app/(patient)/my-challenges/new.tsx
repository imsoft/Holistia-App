import { useState } from 'react';
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
import { router } from 'expo-router';
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

export default function NewChallengeScreen() {
  const session = useAuthStore((s) => s.session);
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationDays, setDurationDays] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [showDifficultyPicker, setShowDifficultyPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    const trimmedTitle = title.trim();
    const trimmedDesc = description.trim();
    if (!trimmedTitle || !trimmedDesc) {
      Alert.alert('Campos requeridos', 'Título y descripción son obligatorios.');
      return;
    }
    if (!session?.user?.id) {
      Alert.alert('Error', 'Debes iniciar sesión.');
      return;
    }

    setSaving(true);
    try {
      const createRes = await webApiFetch('/api/challenges', session, {
        method: 'POST',
        body: JSON.stringify({
          created_by_user_id: session.user.id,
          created_by_type: 'patient',
          title: trimmedTitle,
          description: trimmedDesc,
          duration_days: durationDays.trim() ? parseInt(durationDays, 10) || null : null,
          difficulty_level: difficulty || null,
          professional_id: null,
          is_active: true,
        }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error || 'Error al crear reto');

      const challengeId = createData.challenge?.id;
      if (!challengeId) throw new Error('No se devolvió el id del reto');

      const purchaseRes = await webApiFetch(`/api/challenges/${challengeId}/purchase`, session, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      const purchaseData = await purchaseRes.json();
      if (!purchaseRes.ok) throw new Error(purchaseData.error || 'Error al unirte al reto');

      const purchaseId = purchaseData.purchase?.id;
      Alert.alert('Reto creado', 'Tu reto personal se ha creado correctamente.', [
        {
          text: 'Ver reto',
          onPress: () => router.replace(`/(patient)/my-challenges/${purchaseId}` as any),
        },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo crear el reto.');
    } finally {
      setSaving(false);
    }
  };

  const difficultyLabel = DIFFICULTY_OPTIONS.find((o) => o.value === difficulty)?.label ?? 'Sin especificar';

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.sectionTitle, { color: c.foreground }]}>Crear reto personal</Text>
        <Text style={[styles.sectionSubtitle, { color: c.mutedForeground }]}>
          Define tu reto y empieza a hacer check-ins diarios.
        </Text>

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
          placeholder="Describe tu reto y tus metas..."
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
            title={saving ? 'Creando...' : 'Crear reto'}
            onPress={handleCreate}
            disabled={saving}
            style={styles.btn}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// @ts-expect-error Expo Router options
NewChallengeScreen.options = { title: 'Crear reto' };

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  sectionSubtitle: { fontSize: 14, marginBottom: 24 },
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
