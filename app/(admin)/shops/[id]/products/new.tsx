import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function AdminNewProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [discountPrice, setDiscountPrice] = useState('');
  const [stock, setStock] = useState('0');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Nombre requerido';
    const p = parseFloat(price.replace(',', '.'));
    if (price.trim() && (isNaN(p) || p < 0)) e.price = 'Precio inválido';
    const dp = parseFloat(discountPrice.replace(',', '.'));
    if (discountPrice.trim()) {
      if (isNaN(dp) || dp < 0) e.discountPrice = 'Precio descuento inválido';
      else if (price.trim() && p > 0 && dp >= p) e.discountPrice = 'Debe ser menor al precio';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!id || !validate()) return;

    setLoading(true);
    try {
      const payload = {
        shop_id: id,
        name: name.trim(),
        description: description.trim() || null,
        price: price.trim() ? parseFloat(price.replace(',', '.')) : null,
        discount_price: discountPrice.trim() ? parseFloat(discountPrice.replace(',', '.')) : null,
        stock: parseInt(stock, 10) || 0,
        sku: sku.trim() || null,
        category: category.trim() || null,
        is_featured: isFeatured,
        is_active: isActive,
      };

      const { error } = await supabase.from('shop_products').insert(payload);

      if (error) throw error;
      Alert.alert('Éxito', 'Producto creado.', [
        { text: 'OK', onPress: () => router.replace(`/(admin)/shops/${id}` as any) },
      ]);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err ? String((err as any).message) : 'No se pudo crear.';
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
        <Input label="Nombre *" value={name} onChangeText={setName} placeholder="Nombre" error={errors.name} />
        <Input
          label="Descripción"
          value={description}
          onChangeText={setDescription}
          placeholder="Descripción"
          multiline
          numberOfLines={3}
          style={styles.textArea}
        />
        <Input
          label="Precio"
          value={price}
          onChangeText={setPrice}
          placeholder="0"
          keyboardType="decimal-pad"
          error={errors.price}
        />
        <Input
          label="Precio descuento"
          value={discountPrice}
          onChangeText={setDiscountPrice}
          placeholder="0"
          keyboardType="decimal-pad"
          error={errors.discountPrice}
        />
        <Input label="Stock" value={stock} onChangeText={setStock} placeholder="0" keyboardType="number-pad" />
        <Input label="SKU" value={sku} onChangeText={setSku} placeholder="SKU" />
        <Input label="Categoría" value={category} onChangeText={setCategory} placeholder="Categoría" />
        <View style={styles.switchRow}>
          <Text style={[styles.label, { color: c.foreground }]}>Destacado</Text>
          <Switch value={isFeatured} onValueChange={setIsFeatured} trackColor={{ false: c.border, true: c.primary }} thumbColor="#fff" />
        </View>
        <View style={styles.switchRow}>
          <Text style={[styles.label, { color: c.foreground }]}>Activo</Text>
          <Switch value={isActive} onValueChange={setIsActive} trackColor={{ false: c.border, true: c.primary }} thumbColor="#fff" />
        </View>
        <View style={styles.actions}>
          <Button title="Cancelar" variant="outline" onPress={() => router.back()} style={styles.btn} />
          <Button title="Crear producto" onPress={handleSubmit} loading={loading} style={styles.btn} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 14, fontWeight: '500' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  btn: { flex: 1 },
});
