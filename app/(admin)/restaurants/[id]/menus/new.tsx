import { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function AdminNewMenuScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = 'Título requerido';
    const p = parseFloat(price.replace(',', '.'));
    if (price.trim() && (isNaN(p) || p < 0)) e.price = 'Precio inválido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!id || !validate()) return;

    setLoading(true);
    try {
      const images = imageUrl.trim() ? [imageUrl.trim()] : [];
      const payload = {
        restaurant_id: id,
        title: title.trim(),
        description: description.trim() || null,
        price: price.trim() ? parseFloat(price.replace(',', '.')) : null,
        images,
        is_active: true,
      };

      const { error } = await supabase.from('restaurant_menus').insert(payload);

      if (error) throw error;
      Alert.alert('Éxito', 'Plato creado.', [
        { text: 'OK', onPress: () => router.replace(`/(admin)/restaurants/${id}` as any) },
      ]);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err ? String((err as any).message) : 'No se pudo crear el plato.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

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
          placeholder="Nombre del plato"
          error={errors.title}
        />
        <Input
          label="Descripción"
          value={description}
          onChangeText={setDescription}
          placeholder="Descripción del plato"
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
        <Input
          label="URL imagen (opcional)"
          value={imageUrl}
          onChangeText={setImageUrl}
          placeholder="https://..."
          keyboardType="url"
        />
        <View style={styles.actions}>
          <Button title="Cancelar" variant="outline" onPress={() => router.back()} style={styles.btn} />
          <Button title="Crear plato" onPress={handleSubmit} loading={loading} style={styles.btn} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  btn: { flex: 1 },
});
