import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Alert,
  RefreshControl,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useProfessionalStore } from '@/stores/professional-store';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Button } from '@/components/ui/button';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const MAX_IMAGES = 4;
const MAX_SIZE_MB = 2;

export default function ExpertGalleryScreen() {
  const professional = useProfessionalStore((s) => s.professional);
  const [gallery, setGallery] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const load = useCallback(async (isRefresh = false) => {
    if (!professional) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data } = await supabase
        .from('professional_applications')
        .select('gallery')
        .eq('id', professional.id)
        .single();
      const arr = Array.isArray(data?.gallery) ? data.gallery : [];
      setGallery(arr);
    } catch (e) {
      console.error('Gallery load:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [professional?.id]);

  useEffect(() => {
    if (professional) load();
  }, [professional?.id, load]);

  const handleAddPhoto = async () => {
    if (!professional || gallery.length >= MAX_IMAGES) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso necesario', 'Necesitamos acceso a tus fotos para agregar imágenes.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const uri = asset.uri;
    const ext = uri.split('.').pop() || 'jpg';
    const fileName = `gallery-${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
    const filePath = `${professional.user_id}/${fileName}`;
    setUploading(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      if (blob.size > MAX_SIZE_MB * 1024 * 1024) {
        Alert.alert('Archivo muy grande', `La imagen debe ser menor a ${MAX_SIZE_MB}MB`);
        return;
      }
      const { error: uploadError } = await supabase.storage
        .from('professional-gallery')
        .upload(filePath, blob, { cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage
        .from('professional-gallery')
        .getPublicUrl(filePath);
      const newGallery = [...gallery, publicUrl];
      const { error: updateError } = await supabase
        .from('professional_applications')
        .update({ gallery: newGallery })
        .eq('id', professional.id);
      if (updateError) throw updateError;
      setGallery(newGallery);
      Alert.alert('Listo', 'Imagen agregada a tu galería.');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo subir la imagen.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (index: number) => {
    const url = gallery[index];
    Alert.alert('Eliminar imagen', '¿Quieres eliminar esta imagen de la galería?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          setDeletingIndex(index);
          try {
            const urlParts = url.split('/');
            const fileName = urlParts[urlParts.length - 1]?.split('?')[0];
            const filePath = fileName ? `${professional?.user_id}/${fileName}` : null;
            if (filePath) {
              await supabase.storage.from('professional-gallery').remove([filePath]);
            }
            const newGallery = gallery.filter((_, i) => i !== index);
            await supabase
              .from('professional_applications')
              .update({ gallery: newGallery })
              .eq('id', professional?.id);
            setGallery(newGallery);
          } catch (e: any) {
            Alert.alert('Error', e?.message ?? 'No se pudo eliminar');
          } finally {
            setDeletingIndex(null);
          }
        },
      },
    ]);
  };

  if (loading && gallery.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.primary} />
      }
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.foreground }]}>Galería</Text>
        <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
          Muestra imágenes de tu espacio de trabajo (máx. {MAX_IMAGES})
        </Text>
      </View>
      {gallery.length === 0 && !uploading ? (
        <View style={[styles.empty, { borderColor: c.border }]}>
          <MaterialIcons name="add-a-photo" size={48} color={c.mutedForeground} />
          <Text style={[styles.emptyText, { color: c.mutedForeground }]}>No hay imágenes</Text>
          <Button
            title="Agregar imagen"
            onPress={handleAddPhoto}
            variant="outline"
            style={{ marginTop: 16 }}
          />
        </View>
      ) : (
        <View style={styles.grid}>
          {gallery.map((url, i) => (
            <View key={i} style={[styles.imgWrap, { backgroundColor: c.card, borderColor: c.border }]}>
              <Image source={{ uri: url }} style={styles.img} contentFit="cover" />
              <Pressable
                onPress={() => handleDelete(i)}
                disabled={deletingIndex === i}
                style={[styles.deleteBtn, { backgroundColor: c.destructive + 'E6' }]}
              >
                <MaterialIcons name="delete" size={18} color="#fff" />
              </Pressable>
            </View>
          ))}
          {gallery.length < MAX_IMAGES && (
            <Pressable
              onPress={handleAddPhoto}
              disabled={uploading}
              style={({ pressed }) => [
                styles.addBtn,
                { borderColor: c.border },
                pressed && styles.pressed,
              ]}
            >
              {uploading ? (
                <ActivityIndicator size="small" color={c.primary} />
              ) : (
                <>
                  <MaterialIcons name="add-a-photo" size={32} color={c.mutedForeground} />
                  <Text style={[styles.addBtnText, { color: c.mutedForeground }]}>Agregar</Text>
                </>
              )}
            </Pressable>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 14, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  imgWrap: { width: '31%', aspectRatio: 1, borderRadius: 12, borderWidth: 1, overflow: 'hidden', position: 'relative' },
  img: { width: '100%', height: '100%' },
  deleteBtn: { position: 'absolute', top: 8, right: 8, padding: 6, borderRadius: 8 },
  addBtn: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnText: { fontSize: 13, marginTop: 6 },
  pressed: { opacity: 0.8 },
  empty: {
    padding: 40,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  emptyText: { fontSize: 16, marginTop: 12 },
});
