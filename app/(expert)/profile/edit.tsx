import { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Share,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { useProfessionalStore } from '@/stores/professional-store';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Image } from 'expo-image';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { API_BASE_URL } from '@/constants/auth';

function validateUsername(value: string): string | null {
  if (!value) return null;
  if (value.length < 3) return 'Debe tener al menos 3 caracteres';
  if (value.length > 30) return 'No puede exceder 30 caracteres';
  if (!/^[a-z0-9_-]+$/.test(value)) {
    return 'Solo letras minúsculas, números, guiones y guiones bajos';
  }
  return null;
}

export default function ExpertProfileEditScreen() {
  const session = useAuthStore((s) => s.session);
  const professional = useProfessionalStore((s) => s.professional);
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [profession, setProfession] = useState('');
  const [biography, setBiography] = useState('');
  const [username, setUsername] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const initialUsername = useRef('');
  const usernameCheckTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    if (!professional?.id || !session?.user?.id) return;
    try {
      const [profRes, profileRes] = await Promise.all([
        supabase.from('professional_applications').select('*').eq('id', professional.id).single(),
        supabase.from('profiles').select('username').eq('id', session.user.id).single(),
      ]);
      const prof = profRes.data;
      const profile = profileRes.data as { username?: string | null } | null;
      if (prof) {
        setFirst(prof.first_name ?? '');
        setLast(prof.last_name ?? '');
        setProfession(prof.profession ?? '');
        setBiography(prof.biography ?? '');
        setProfilePhoto(prof.profile_photo ?? null);
      }
      const u = profile?.username ?? '';
      setUsername(u);
      initialUsername.current = u;
      if (u) setUsernameAvailable(true);
    } catch (e) {
      console.error('Load profile:', e);
      Alert.alert('Error', 'No se pudo cargar el perfil.');
    } finally {
      setLoading(false);
    }
  }, [professional?.id, session?.user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    return () => {
      if (usernameCheckTimeout.current) clearTimeout(usernameCheckTimeout.current);
    };
  }, []);

  const checkUsernameAvailability = useCallback(async (value: string) => {
    if (value === initialUsername.current) {
      setUsernameAvailable(true);
      return;
    }
    const err = validateUsername(value);
    if (err) {
      setUsernameAvailable(false);
      return;
    }
    setUsernameChecking(true);
    try {
      const { data } = await supabase.from('profiles').select('username').eq('username', value).maybeSingle();
      setUsernameAvailable(!data);
    } catch (e) {
      setUsernameAvailable(null);
    } finally {
      setUsernameChecking(false);
    }
  }, []);

  const handleUsernameChange = (value: string) => {
    const lower = value.toLowerCase();
    setUsername(lower);
    setUsernameAvailable(null);
    if (usernameCheckTimeout.current) clearTimeout(usernameCheckTimeout.current);
    const err = validateUsername(lower);
    if (err) {
      setUsernameAvailable(false);
      return;
    }
    if (!lower) return;
    usernameCheckTimeout.current = setTimeout(() => checkUsernameAvailability(lower), 500);
  };

  const handleChangePhoto = async () => {
    if (!session?.user?.id || !professional?.id) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso necesario', 'Necesitamos acceso a tus fotos para cambiar la foto de perfil.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const uri = result.assets[0].uri;
    const ext = uri.split('.').pop() || 'jpg';
    const fileName = `profile-${Date.now()}.${ext}`;
    const filePath = `${session.user.id}/${fileName}`;
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const { error: uploadError } = await supabase.storage
        .from('professional-gallery')
        .upload(filePath, blob, { cacheControl: '3600', upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('professional-gallery').getPublicUrl(filePath);
      const { error: updateError } = await supabase
        .from('professional_applications')
        .update({ profile_photo: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', professional.id)
        .eq('user_id', session.user.id);
      if (updateError) throw updateError;
      setProfilePhoto(publicUrl);
      useProfessionalStore.getState().setProfessional({ ...professional, profile_photo: publicUrl });
      Alert.alert('Listo', 'Foto de perfil actualizada.');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo subir la foto.');
    }
  };

  const handleShare = async () => {
    const shareUrl = `${API_BASE_URL}/login?redirect=/explore/professional/${professional?.id}`;
    try {
      await Share.share({
        message: shareUrl,
        title: 'Mi perfil en Holistia',
      });
    } catch (e) {
      Alert.alert('Enlace', shareUrl);
    }
  };

  const handleSave = async () => {
    if (!professional?.id || !session?.user?.id) return;
    const usernameTrim = username.trim().toLowerCase();
    const usernameChanged = usernameTrim !== initialUsername.current;
    if (usernameChanged && usernameTrim) {
      const err = validateUsername(usernameTrim);
      if (err) {
        Alert.alert('Nombre de usuario', err);
        return;
      }
      if (usernameAvailable !== true) {
        Alert.alert('Nombre de usuario', 'Verifica que el nombre esté disponible antes de guardar.');
        return;
      }
    }
    setSaving(true);
    try {
      await supabase
        .from('professional_applications')
        .update({
          first_name: first.trim() || null,
          last_name: last.trim() || null,
          profession: profession.trim() || null,
          biography: biography.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', professional.id)
        .eq('user_id', session.user.id);

      if (usernameTrim !== initialUsername.current) {
        const { error: usernameError } = await supabase
          .from('profiles')
          .update({ username: usernameTrim || null })
          .eq('id', session.user.id);
        if (usernameError) throw usernameError;
        initialUsername.current = usernameTrim || '';
      }

      useProfessionalStore.getState().setProfessional({
        ...professional,
        first_name: first.trim() || '',
        last_name: last.trim() || '',
        profile_photo: profilePhoto ?? professional.profile_photo,
      });
      Alert.alert('Guardado', 'Perfil actualizado correctamente.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      if (e?.code === '23505') {
        Alert.alert('Error', 'Este nombre de usuario ya está en uso.');
      } else {
        Alert.alert('Error', e?.message ?? 'No se pudo guardar.');
      }
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

  const photo = profilePhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(`${first} ${last}`.trim() || 'P')}`;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.sectionTitle, { color: c.foreground }]}>Editar perfil profesional</Text>

        <Pressable onPress={handleChangePhoto} style={styles.photoWrap}>
          <Image source={{ uri: photo }} style={styles.avatar} />
          <View style={[styles.photoBadge, { backgroundColor: c.primary }]}>
            <MaterialIcons name="camera-alt" size={20} color="#fff" />
          </View>
        </Pressable>

        <Input label="Nombre" value={first} onChangeText={setFirst} placeholder="Tu nombre" />
        <Input label="Apellidos" value={last} onChangeText={setLast} placeholder="Tus apellidos" />
        <Input label="Profesión" value={profession} onChangeText={setProfession} placeholder="Ej: Nutricionista" />
        <View style={styles.field}>
          <Text style={[styles.label, { color: c.foreground }]}>Biografía</Text>
          <TextInput
            style={[styles.bioInput, { backgroundColor: c.card, borderColor: c.border, color: c.foreground }]}
            value={biography}
            onChangeText={setBiography}
            placeholder="Cuéntanos sobre ti..."
            placeholderTextColor={c.mutedForeground}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: c.foreground }]}>Nombre de usuario</Text>
          <TextInput
            style={[styles.input, { backgroundColor: c.card, borderColor: c.border, color: c.foreground }]}
            value={username}
            onChangeText={handleUsernameChange}
            placeholder="usuario"
            placeholderTextColor={c.mutedForeground}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {usernameChecking && <Text style={[styles.hint, { color: c.mutedForeground }]}>Comprobando...</Text>}
          {!usernameChecking && usernameAvailable === true && username.trim().length >= 3 && (
            <Text style={[styles.hint, { color: '#22c55e' }]}>Disponible</Text>
          )}
          {!usernameChecking && usernameAvailable === false && (
            <Text style={[styles.hint, { color: c.destructive }]}>No disponible o formato incorrecto</Text>
          )}
        </View>

        <Pressable onPress={handleShare} style={[styles.shareBtn, { borderColor: c.border }]}>
          <MaterialIcons name="share" size={22} color={c.primary} />
          <Text style={[styles.shareBtnText, { color: c.foreground }]}>Compartir enlace de mi perfil</Text>
        </Pressable>

        <View style={styles.actions}>
          <Button title="Cancelar" variant="outline" onPress={() => router.back()} style={styles.btn} />
          <Button title={saving ? 'Guardando...' : 'Guardar'} onPress={handleSave} disabled={saving} style={styles.btn} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// @ts-expect-error Expo Router options
ExpertProfileEditScreen.options = { title: 'Editar perfil' };

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 20, fontWeight: '700', marginBottom: 24 },
  photoWrap: { alignSelf: 'center', marginBottom: 24, position: 'relative' },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  photoBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 16 },
  bioInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 16, minHeight: 100 },
  hint: { fontSize: 12, marginTop: 4 },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 24,
  },
  shareBtnText: { fontSize: 16, fontWeight: '500' },
  actions: { flexDirection: 'row', gap: 12 },
  btn: { flex: 1 },
});
