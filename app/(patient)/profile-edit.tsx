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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Image } from 'expo-image';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email?: string | null;
  phone: string | null;
  avatar_url: string | null;
  username?: string | null;
  created_at?: string | null;
};

function validateUsername(value: string): string | null {
  if (!value) return null;
  if (value.length < 3) return 'Debe tener al menos 3 caracteres';
  if (value.length > 30) return 'No puede exceder 30 caracteres';
  if (!/^[a-z0-9_-]+$/.test(value)) {
    return 'Solo letras minúsculas, números, guiones y guiones bajos';
  }
  return null;
}

export default function ProfileEditScreen() {
  const session = useAuthStore((s) => s.session);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const usernameCheckTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [deactivateEmail, setDeactivateEmail] = useState('');
  const [deactivating, setDeactivating] = useState(false);
  const colorScheme = useColorScheme();
  const c = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const initialUsername = useRef<string>('');

  const checkUsernameAvailability = useCallback(
    async (value: string) => {
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
        const { data } = await supabase
          .from('profiles')
          .select('username')
          .eq('username', value)
          .maybeSingle();
        setUsernameAvailable(!data);
      } catch (e) {
        console.error('Username check:', e);
        setUsernameAvailable(null);
      } finally {
        setUsernameChecking(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!session?.user?.id) return;
    (async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email, phone, avatar_url, username, created_at')
          .eq('id', session.user.id)
          .single();
        setProfile(data as Profile);
        if (data) {
          setFirst(data.first_name ?? '');
          setLast(data.last_name ?? '');
          setPhone(data.phone ?? '');
          const u = (data as Profile).username ?? '';
          setUsername(u);
          initialUsername.current = u;
          if (u) setUsernameAvailable(true);
        }
      } catch (e) {
        console.error('Profile load error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [session?.user?.id]);

  useEffect(() => {
    return () => {
      if (usernameCheckTimeout.current) clearTimeout(usernameCheckTimeout.current);
    };
  }, []);

  const handleChangePhoto = async () => {
    if (!session?.user?.id || !profile) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso necesario', 'Necesitamos acceso a tus fotos para cambiar el avatar.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const uri = asset.uri;
    const ext = uri.split('.').pop() || 'jpg';
    const fileName = `avatar.${ext}`;
    const filePath = `avatars/${session.user.id}/${fileName}`;
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', session.user.id);

      if (updateError) throw updateError;
      setProfile((p) => (p ? { ...p, avatar_url: publicUrl } : p));
      Alert.alert('Listo', 'Foto actualizada.');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo subir la foto.');
    }
  };

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
    usernameCheckTimeout.current = setTimeout(() => {
      checkUsernameAvailability(lower);
    }, 500);
  };

  const handleSave = async () => {
    if (!session?.user?.id || !profile) return;
    const usernameTrim = username.trim().toLowerCase();
    const usernameChanged = usernameTrim !== initialUsername.current;
    if (usernameChanged && usernameTrim) {
      const err = validateUsername(usernameTrim);
      if (err) {
        Alert.alert('Nombre de usuario', err);
        return;
      }
      if (usernameAvailable !== true) {
        Alert.alert(
          'Nombre de usuario',
          'Verifica que el nombre esté disponible (sin errores en rojo) antes de guardar.'
        );
        return;
      }
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: first.trim() || null,
          last_name: last.trim() || null,
          phone: phone.trim() || null,
          username: usernameTrim || null,
        })
        .eq('id', session.user.id);

      if (error) throw error;
      initialUsername.current = usernameTrim || '';
      setProfile((p) =>
        p
          ? {
              ...p,
              first_name: first.trim() || null,
              last_name: last.trim() || null,
              phone: phone.trim() || null,
              username: usernameTrim || null,
            }
          : p
      );
      Alert.alert('Listo', 'Perfil actualizado correctamente.');
    } catch (e: any) {
      if (e?.code === '23505') {
        Alert.alert('Error', 'Este nombre de usuario ya está en uso.');
      } else if (e?.code === '23514') {
        Alert.alert('Error', 'El nombre de usuario no cumple el formato requerido.');
      } else {
        Alert.alert('Error', e?.message ?? 'No se pudo guardar.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = () => {
    const email = (session?.user?.email ?? '').trim().toLowerCase();
    const confirm = deactivateEmail.trim().toLowerCase();
    if (confirm !== email) {
      Alert.alert('Correo no coincide', 'El correo debe coincidir con el de tu cuenta.');
      return;
    }
    Alert.alert(
      '¿Desactivar tu cuenta?',
      'Perderás acceso inmediato. Tu perfil dejará de ser visible. Se cerrará tu sesión. Puedes contactarnos para reactivarla.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, desactivar',
          style: 'destructive',
          onPress: async () => {
            if (!session?.user?.id) return;
            setDeactivating(true);
            try {
              const { data, error } = await supabase.rpc('deactivate_user_account', {
                user_id_param: session.user.id,
              });
              if (error) throw new Error(error.message);
              if (data && typeof data === 'object' && 'success' in data && !(data as any).success) {
                throw new Error((data as any).message ?? 'Error al desactivar');
              }
              await supabase.auth.signOut();
              router.replace({ pathname: '/(auth)/login', params: { deactivated: 'true' } } as any);
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? 'No se pudo desactivar la cuenta.');
            } finally {
              setDeactivating(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Text style={[styles.error, { color: c.foreground }]}>No se pudo cargar el perfil</Text>
      </View>
    );
  }

  const avatarUrl =
    profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(`${first} ${last}`.trim() || 'U')}`;

  const emailDisplay = profile.email || session?.user?.email || '';
  const createdDisplay = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.pageTitle, { color: c.foreground }]}>Mi perfil</Text>
        <Text style={[styles.pageSubtitle, { color: c.mutedForeground }]}>
          Gestiona tu información personal
        </Text>

        <View style={[styles.section, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.sectionTitle, { color: c.foreground }]}>Foto de perfil</Text>
          <Text style={[styles.sectionHint, { color: c.mutedForeground }]}>
            Tu foto será visible para los profesionales con los que te conectes.
          </Text>
          <View style={styles.avatarRow}>
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            <Pressable
              onPress={handleChangePhoto}
              style={({ pressed }) => [
                styles.avatarBtn,
                { borderColor: c.primary },
                pressed && styles.pressed,
              ]}>
              <Text style={[styles.avatarBtnText, { color: c.primary }]}>Cambiar foto</Text>
            </Pressable>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.sectionTitle, { color: c.foreground }]}>Información personal</Text>
          <Text style={[styles.sectionHint, { color: c.mutedForeground }]}>
            Esta información será visible para los profesionales.
          </Text>
          <Input
            label="Nombre"
            value={first}
            onChangeText={setFirst}
            placeholder="Tu nombre"
            autoCapitalize="words"
          />
          <Input
            label="Apellido"
            value={last}
            onChangeText={setLast}
            placeholder="Tu apellido"
            autoCapitalize="words"
          />
          <Input
            label="Teléfono"
            value={phone}
            onChangeText={setPhone}
            placeholder="Ej. +52 55 1234 5678"
            keyboardType="phone-pad"
          />
          <View style={styles.usernameRow}>
            <Text style={[styles.inputLabel, { color: c.foreground }]}>Nombre de usuario</Text>
            <View style={styles.usernameInputWrap}>
              <TextInput
                style={[
                  styles.usernameInput,
                  {
                    backgroundColor: c.background,
                    borderColor: validateUsername(username)
                      ? c.destructive
                      : usernameAvailable === true
                        ? '#22c55e'
                        : c.border,
                    color: c.foreground,
                  },
                ]}
                value={username}
                onChangeText={handleUsernameChange}
                placeholder="ejemplo_usuario123"
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor={c.mutedForeground}
              />
              {usernameChecking ? (
                <ActivityIndicator size="small" color={c.primary} style={styles.usernameIndicator} />
              ) : usernameAvailable === true && !validateUsername(username) ? (
                <MaterialIcons name="check-circle" size={20} color="#22c55e" style={styles.usernameIndicator} />
              ) : username && (usernameAvailable === false || validateUsername(username)) ? (
                <MaterialIcons name="cancel" size={20} color={c.destructive} style={styles.usernameIndicator} />
              ) : null}
            </View>
            {username ? (
              <Text style={[styles.usernameHint, { color: validateUsername(username) || usernameAvailable === false ? c.destructive : c.mutedForeground }]}>
                {validateUsername(username) ?? (usernameAvailable === false ? 'No disponible' : usernameChecking ? 'Verificando...' : usernameAvailable === true ? 'Disponible' : '')}
              </Text>
            ) : null}
            <Text style={[styles.sectionHint, { color: c.mutedForeground }]}>
              Entre 3 y 30 caracteres. Solo letras minúsculas, números, guiones y guiones bajos.
            </Text>
          </View>
          {emailDisplay ? (
            <View style={styles.readOnlyRow}>
              <Text style={[styles.readOnlyLabel, { color: c.foreground }]}>Correo electrónico</Text>
              <Text style={[styles.readOnlyValue, { color: c.mutedForeground }]}>{emailDisplay}</Text>
            </View>
          ) : null}
        </View>

        {createdDisplay ? (
          <View style={[styles.section, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.sectionTitle, { color: c.foreground }]}>Información de cuenta</Text>
            <View style={styles.readOnlyRow}>
              <Text style={[styles.readOnlyLabel, { color: c.foreground }]}>Fecha de registro</Text>
              <Text style={[styles.readOnlyValue, { color: c.mutedForeground }]}>{createdDisplay}</Text>
            </View>
            <View style={styles.readOnlyRow}>
              <Text style={[styles.readOnlyLabel, { color: c.foreground }]}>Tipo de cuenta</Text>
              <Text style={[styles.readOnlyValue, { color: c.mutedForeground }]}>Paciente</Text>
            </View>
          </View>
        ) : null}

        <View style={[styles.dangerZone, { backgroundColor: `${c.destructive}12`, borderColor: `${c.destructive}40` }]}>
          <View style={styles.dangerTitleRow}>
            <MaterialIcons name="warning" size={20} color={c.destructive} />
            <Text style={[styles.dangerTitle, { color: c.destructive }]}>Zona de peligro</Text>
          </View>
          <Text style={[styles.sectionHint, { color: c.foreground }]}>
            Desactivar tu cuenta es una acción seria. Perderás acceso a todos los servicios.
          </Text>
          <Text style={[styles.inputLabel, { color: c.foreground }]}>
            Para desactivar, escribe tu correo:
          </Text>
          <TextInput
            style={[styles.deactivateInput, { backgroundColor: c.background, borderColor: c.border, color: c.foreground }]}
            value={deactivateEmail}
            onChangeText={setDeactivateEmail}
            placeholder={emailDisplay || 'tu@email.com'}
            placeholderTextColor={c.mutedForeground}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Pressable
            onPress={handleDeactivate}
            disabled={deactivating || deactivateEmail.trim().toLowerCase() !== (session?.user?.email ?? '').trim().toLowerCase()}
            style={[styles.deactivateBtn, { backgroundColor: c.destructive, opacity: deactivating ? 0.7 : 1 }]}>
            {deactivating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.deactivateBtnText}>Desactivar mi cuenta</Text>
            )}
          </Pressable>
        </View>

        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={({ pressed }) => [
            styles.saveBtn,
            { backgroundColor: c.primary },
            (pressed || saving) && styles.pressed,
          ]}>
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Guardar cambios</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

ProfileEditScreen.options = { title: 'Editar perfil' };

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: { fontSize: 16 },
  pageTitle: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  pageSubtitle: { fontSize: 14, marginBottom: 24 },
  section: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  sectionHint: { fontSize: 13, marginBottom: 16, lineHeight: 18 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  avatarBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  avatarBtnText: { fontSize: 14, fontWeight: '600' },
  readOnlyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  readOnlyLabel: { fontSize: 14, fontWeight: '500' },
  readOnlyValue: { fontSize: 14 },
  saveBtn: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  pressed: { opacity: 0.9 },
  usernameRow: { marginTop: 16 },
  inputLabel: { fontSize: 14, fontWeight: '500', marginBottom: 6 },
  usernameInputWrap: { position: 'relative', flexDirection: 'row', alignItems: 'center' },
  usernameInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    paddingRight: 40,
    fontSize: 16,
  },
  usernameIndicator: { position: 'absolute', right: 12 },
  usernameHint: { fontSize: 13, marginTop: 6 },
  dangerZone: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  dangerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  dangerTitle: { fontSize: 16, fontWeight: '600' },
  deactivateInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginTop: 6,
    marginBottom: 12,
  },
  deactivateBtn: {
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  deactivateBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
