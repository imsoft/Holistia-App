import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/stores/auth-store';
import { supabase } from '@/lib/supabase';

const DIFF_LABELS: Record<string, string> = {
  beginner: 'Principiante',
  intermediate: 'Intermedio',
  advanced: 'Avanzado',
  expert: 'Experto',
};

export default function NewChallengeScreen() {
  const adminId = useAuthStore((s) => s.session?.user?.id);
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationDays, setDurationDays] = useState('7');
  const [difficulty, setDifficulty] = useState('beginner');
  const [price, setPrice] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = 'Titulo requerido';
    else if (title.trim().length < 3) e.title = 'Min. 3 caracteres';
    if (!description.trim()) e.description = 'Descripcion requerida';
    const d = parseInt(durationDays, 10);
    if (isNaN(d) || d < 1) e.durationDays = 'Min. 1 dia';
    else if (d > 365) e.durationDays = 'Max. 365 dias';
    if (price.trim()) {
      const p = parseFloat(price.replace(',', '.'));
      if (isNaN(p) || p < 0) e.price = 'Precio invalido';
    }
    setErr(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!adminId || !validate()) return;
    setSaving(true);
    try {
      const p = price.trim() ? parseFloat(price.replace(',', '.')) : 0;
      const { data, error } = await supabase
        .from('challenges')
        .insert({
          title: title.trim(),
          description: description.trim(),
          duration_days: parseInt(durationDays, 10),
          difficulty_level: difficulty,
          price: p,
          currency: 'MXN',
          is_active: true,
          is_public: isPublic,
          professional_id: null,
          created_by_user_id: adminId,
          created_by_type: 'admin',
          linked_professional_id: null,
        })
        .select('id')
        .single();
      if (error) throw error;
      Alert.alert('Exito', 'Reto creado', [
        { text: 'Ver', onPress: () => (router as any).replace(`/(admin)/challenges/${data.id}`) },
        { text: 'Lista', onPress: () => (router as any).replace('/(admin)/challenges') },
      ]);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const diffs = ['beginner', 'intermediate', 'advanced', 'expert'];

  return (
    <KeyboardAvoidingView style={[styles.c, { backgroundColor: c.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={[styles.lbl, { color: c.foreground }]}>Titulo</Text>
        <TextInput style={[styles.inp, { backgroundColor: c.card, color: c.foreground }]} placeholder="Ej: Reto 7 dias" placeholderTextColor={c.mutedForeground} value={title} onChangeText={setTitle} />
        {err.title && <Text style={styles.err}>{err.title}</Text>}
        <Text style={[styles.lbl, { color: c.foreground }]}>Descripcion</Text>
        <TextInput style={[styles.inp, styles.ta, { backgroundColor: c.card, color: c.foreground }]} placeholder="Descripcion" placeholderTextColor={c.mutedForeground} value={description} onChangeText={setDescription} multiline numberOfLines={4} />
        {err.description && <Text style={styles.err}>{err.description}</Text>}
        <Text style={[styles.lbl, { color: c.foreground }]}>Duracion dias</Text>
        <TextInput style={[styles.inp, { backgroundColor: c.card, color: c.foreground }]} placeholder="7" value={durationDays} onChangeText={setDurationDays} keyboardType="number-pad" />
        {err.durationDays && <Text style={styles.err}>{err.durationDays}</Text>}
        <Text style={[styles.lbl, { color: c.foreground }]}>Dificultad</Text>
        <View style={styles.opts}>
          {diffs.map((o) => (
            <Pressable key={o} onPress={() => setDifficulty(o)} style={[styles.opt, { backgroundColor: difficulty === o ? c.primary : c.card }]}>
              <Text style={{ color: difficulty === o ? c.primaryForeground : c.foreground }}>{DIFF_LABELS[o]}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={[styles.lbl, { color: c.foreground }]}>Precio MXN</Text>
        <TextInput style={[styles.inp, { backgroundColor: c.card, color: c.foreground }]} placeholder="0 gratuito" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
        {err.price && <Text style={styles.err}>{err.price}</Text>}
        <Pressable onPress={() => setIsPublic(!isPublic)} style={[styles.row, { backgroundColor: c.card }]}>
          <Text style={{ color: c.foreground }}>Publico</Text>
          <View style={[styles.cb, isPublic && { backgroundColor: c.primary }]}>{isPublic && <Text style={{ color: '#fff', fontWeight: '700' }}>✓</Text>}</View>
        </Pressable>
        <Pressable onPress={handleSave} disabled={saving} style={[styles.btn, { backgroundColor: c.primary }]}>
          {saving ? <ActivityIndicator size="small" color={c.primaryForeground} /> : <Text style={{ color: c.primaryForeground }}>Crear reto</Text>}
        </Pressable>
        <Pressable onPress={() => router.back()} style={[styles.cancel, { borderColor: c.border }]}>
          <Text style={{ color: c.foreground }}>Cancelar</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 40 },
  lbl: { fontSize: 14, marginBottom: 6 },
  inp: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 12 },
  ta: { minHeight: 80 },
  opts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  opt: { padding: 10, borderRadius: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', padding: 14, borderRadius: 10, marginBottom: 16 },
  cb: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  err: { color: '#dc2626', fontSize: 12, marginBottom: 8 },
  btn: { padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  cancel: { padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 12, borderWidth: 1 },
});
