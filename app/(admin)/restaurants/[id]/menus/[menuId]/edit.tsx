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
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Menu = {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  images: string[];
  is_active: boolean;
};

export default function AdminEditMenuScreen() {
  const { id, menuId } = useLocalSearchParams<{ id: string; menuId: string }>();
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const [menu, setMenu] = useState<Menu | null>(null);
  const [loadingMenu, setLoadingMenu] = useState(true);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      if (!menuId) return;
      const { data, error } = await supabase
        .from('restaurant_menus')
        .select('id, title, description, price, images, is_active')
        .eq('id', menuId)
        .single();
      if (error || !data) {
        setMenu(null);
      } else {
        setMenu(data as Menu);
        setTitle(data.title || '');
        setDescription(data.description || '');
        setPrice(data.price != null ? String(data.price) : '');
        const imgs = Array.isArray(data.images) ? data.images : [];
        setImageUrl(imgs[0] || '');
      }
      setLoadingMenu(false);
    })();
  }, [menuId]);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = 'Título requerido';
    const p = parseFloat(price.replace(',', '.'));
    if (price.trim() && (isNaN(p) || p < 0)) e.price = 'Precio inválido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!menuId || !validate()) return;

    setLoading(true);
    try {
      const images = imageUrl.trim() ? [imageUrl.trim()] : [];

      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        price: price.trim() ? parseFloat(price.replace(',', '.')) : null,
        images,
      };

      const { error } = await supabase.from('restaurant_menus').update(payload).eq('id', menuId);

      if (error) throw error;
      Alert.alert('Éxito', 'Plato actualizado.', [
        { text: 'OK', onPress: () => router.replace(`/(admin)/restaurants/${id}` as any) },
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

  if (loadingMenu) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
        <Text style={[styles.muted, { color: c.mutedForeground }]}>Cargando...</Text>
      </View>
    );
  }

  if (!menu) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Text style={[styles.muted, { color: c.mutedForeground }]}>Plato no encontrado</Text>
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
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  btn: { flex: 1 },
});
