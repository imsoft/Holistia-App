import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';

type Diff = 'beginner' | 'intermediate' | 'advanced' | 'expert';
const DIFF: Record<Diff, string> = { beginner: 'Principiante', intermediate: 'Intermedio', advanced: 'Avanzado', expert: 'Experto' };

export default function EditChallengeScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id as string;
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationDays, setDurationDays] = useState('7');
  const [difficulty, setDifficulty] = useState<Diff>('beginner');
  const [price, setPrice] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [err, setErr] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('challenges').select('*').eq('id', id).single();
      if (error || !data) {
        Alert.alert('Error', 'Reto no encontrado');
        router.back();
        return;
      }
      const d = data as Record<string, unknown>;
      setTitle((d.title as string) || '');
      setDescription((d.description as string) || '');
      setDurationDays(String(d.duration_days ?? 7));
      setDifficulty((d.difficulty_level as Diff) || 'beginner');
      setPrice(d.price != null ? String(d.price) : '');
      setIsPublic(d.is_public !== false);
      setIsActive(d.is_active !== false);
    } catch (e) {
      console.error('Load error:', e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const ok = (): boolean => {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = 'Título requerido';
    else if (title.length < 3) e.title = 'Mín. 3 caracteres';
    if (!description.trim()) e.description = 'Descripción requerida';
    const d = parseInt(durationDays, 10);
    if (isNaN(d) || d < 1) e.durationDays = 'Mín. 1 día';
    else if (d > 365) e.durationDays = 'Máx. 365 días';
    if (price.trim() && (isNaN(parseFloat(price.replace(',', '.'))) || parseFloat(price.replace(',', '.')) < 0)) e.price = 'Precio inválido';
    setErr(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    if (!id || !ok()) return;
    setSaving(true);
    try {
      const p = price.trim() ? parseFloat(price.replace(',', '.')) : 0;
      const { error } = await supabase
        .from('challenges')
        .update({
          title: title.trim(),
          description: description.trim(),
          duration_days: parseInt(durationDays, 10),
          difficulty_level: difficulty,
          price: p,
          is_public: isPublic,
          is_active: isActive,
        })
        .eq('id', id);
      if (error) throw error;
      Alert.alert('Éxito', 'Cambios guardados', [{ text: 'OK', onPress: () => (router as any).replace(`/(admin)/challenges/${id}`) }]);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={[s.container, { backgroundColor: c.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={[s.label, { color: c.foreground }]}>Título *</Text>
        <TextInput style={[s.input, { backgroundColor: c.card, color: c.foreground }]} placeholder="Título" placeholderTextColor={c.mutedForeground} value={title} onChangeText={setTitle} />
        {err.title ? <Text style={s.error}>{err.title}</Text> : null}
        <Text style={[s.label, { color: c.foreground }]}>Descripción *</Text>
        <TextInput style={[s.input, s.ta, { backgroundColor: c.card, color: c.foreground }]} placeholder="Descripción" placeholderTextColor={c.mutedForeground} value={description} onChangeText={setDescription} multiline numberOfLines={4} />
        {err.description ? <Text style={s.error}>{err.description}</Text> : null}
        <Text style={[s.label, { color: c.foreground }]}>Duración (días) *</Text>
        <TextInput style={[s.input, { backgroundColor: c.card, color: c.foreground }]} placeholder="7" placeholderTextColor={c.mutedForeground} value={durationDays} onChangeText={setDurationDays} keyboardType="number-pad" />
        {err.durationDays ? <Text style={s.error}>{err.durationDays}</Text> : null}
        <Text style={[s.label, { color: c.foreground }]}>Dificultad</Text>
        <View style={s.opts}>
          {(['beginner', 'intermediate', 'advanced', 'expert'] as Diff[]).map((o) => (
            <Pressable key={o} onPress={() => setDifficulty(o)} style={[s.opt, { backgroundColor: difficulty === o ? c.primary : c.card }]}>
              <Text style={[s.optTxt, { color: difficulty === o ? c.primaryForeground : c.foreground }]}>{DIFF[o]}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={[s.label, { color: c.foreground }]}>Precio (MXN)</Text>
        <TextInput style={[s.input, { backgroundColor: c.card, color: c.foreground }]} placeholder="0 = gratuito" placeholderTextColor={c.mutedForeground} value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
        {err.price ? <Text style={s.error}>{err.price}</Text> : null}
        <Pressable onPress={() => setIsPublic(!isPublic)} style={[s.row, { backgroundColor: c.card }]}>
          <Text style={[s.rowTxt, { color: c.foreground }]}>Público</Text>
          <View style={[s.cb, isPublic && { backgroundColor: c.primary }]}>{isPublic ? <Text style={s.cbX}>✓</Text> : null}</View>
        </Pressable>
        <Pressable onPress={() => setIsActive(!isActive)} style={[s.row, { backgroundColor: c.card }]}>
          <Text style={[s.rowTxt, { color: c.foreground }]}>Activo</Text>
          <View style={[s.cb, isActive && { backgroundColor: c.primary }]}>{isActive ? <Text style={s.cbX}>✓</Text> : null}</View>
        </Pressable>
        <Pressable onPress={save} disabled={saving} style={[s.btn, { backgroundColor: c.primary }]}>
          {saving ? <ActivityIndicator size="small" color={c.primaryForeground} /> : <Text style={[s.btnTxt, { color: c.primaryForeground }]}>Guardar</Text>}
        </Pressable>
        <Pressable onPress={() => router.back()} style={[s.cancel, { borderColor: c.border }]}>
          <Text style={[s.cancelTxt, { color: c.foreground }]}>Cancelar</Text>
        </Pressable>
        <View style={s.pad} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, fontSize: 16, marginBottom: 12 },
  ta: { minHeight: 100 },
  opts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  opt: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  optTxt: { fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 10, marginBottom: 16 },
  rowTxt: { fontSize: 16 },
  cb: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#d1d5db', alignItems: 'center', justifyContent: 'center' },
  cbX: { color: '#fff', fontWeight: '700', fontSize: 14 },
  error: { color: '#dc2626', fontSize: 12, marginTop: -8, marginBottom: 8 },
  btn: { paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  btnTxt: { fontSize: 16, fontWeight: '600' },
  cancel: { paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 12, borderWidth: 1 },
  cancelTxt: { fontSize: 16 },
  pad: { height: 24 },
});
