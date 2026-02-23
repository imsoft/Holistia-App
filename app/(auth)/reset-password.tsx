import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Link, useLocalSearchParams, router } from 'expo-router';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Button } from '@/components/ui/button';
import { API_BASE_URL } from '@/constants/auth';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ token?: string }>();
  const tokenFromUrl = params.token;
  const [token, setToken] = useState(tokenFromUrl || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(!!tokenFromUrl);
  const [tokenValid, setTokenValid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const colorScheme = useColorScheme();
  const c = colorScheme === 'dark' ? Colors.dark : Colors.light;

  useEffect(() => {
    if (tokenFromUrl) setToken(tokenFromUrl);
  }, [tokenFromUrl]);

  const validateToken = async (t: string) => {
    if (!t.trim()) return;
    setValidating(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/auth/reset-password?token=${encodeURIComponent(t.trim())}`
      );
      const data = await res.json();
      setTokenValid(res.ok && data.valid === true);
      if (!res.ok) setError(data.error || 'Token inválido');
    } catch {
      setError('Error al validar el enlace');
    } finally {
      setValidating(false);
    }
  };

  useEffect(() => {
    if (tokenFromUrl) {
      validateToken(tokenFromUrl);
    } else {
      setValidating(false);
    }
  }, [tokenFromUrl]);

  const handleSubmit = async () => {
    setError(null);
    const t = tokenFromUrl || token.trim();
    if (!t) {
      setError('No hay token. Abre el enlace que te enviamos por correo o pégalo arriba.');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenFromUrl || token.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar');
      Alert.alert(
        'Contraseña actualizada',
        'Ya puedes iniciar sesión con tu nueva contraseña.',
        [{ text: 'OK', onPress: () => (router as any).replace('/(auth)/login') }]
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  if (!tokenFromUrl && !token.trim()) {
    return (
      <View style={[styles.container, { backgroundColor: c.background }]}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={[styles.title, { color: c.foreground }]}>
            Restablecer contraseña
          </Text>
          <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
            Abre el enlace que te enviamos por correo. Si lo abriste en el navegador, puedes pegar aquí el token de la URL:
          </Text>
          <Input
            label="Token"
            value={token}
            onChangeText={(v) => { setToken(v); setError(null); }}
            placeholder="Pega el token del enlace (ej: ?token=...)"
            autoCapitalize="none"
          />
          {error ? (
            <View style={[styles.errorBox, { backgroundColor: c.destructiveMuted }]}>
              <Text style={[styles.errorText, { color: c.destructive }]}>{error}</Text>
            </View>
          ) : null}
          <Button
            title={validating ? 'Validando...' : 'Continuar'}
            onPress={() => validateToken(token)}
            loading={validating}
          />
          <Link href="/(auth)/login" asChild>
            <Pressable style={styles.backLink}>
              <Text style={[styles.link, { color: c.primary }]}>← Volver al inicio de sesión</Text>
            </Pressable>
          </Link>
        </ScrollView>
      </View>
    );
  }

  if (!tokenValid) {
    return (
      <View style={[styles.container, { backgroundColor: c.background }]}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={[styles.title, { color: c.foreground }]}>
            Enlace inválido
          </Text>
          <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
            {error || 'El enlace no es válido o ya fue utilizado. Solicita uno nuevo.'}
          </Text>
          <Link href="/(auth)/forgot-password" asChild>
            <Pressable>
              <Text style={[styles.link, { color: c.primary }]}>Solicitar nuevo enlace</Text>
            </Pressable>
          </Link>
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, { color: c.foreground }]}>
          Nueva contraseña
        </Text>
        <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
          Ingresa tu nueva contraseña (mínimo 8 caracteres).
        </Text>
        {error ? (
          <View style={[styles.errorBox, { backgroundColor: c.destructiveMuted }]}>
            <Text style={[styles.errorText, { color: c.destructive }]}>{error}</Text>
          </View>
        ) : null}
        <PasswordInput
          label="Contraseña"
          value={password}
          onChangeText={setPassword}
          autoCapitalize="none"
        />
        <PasswordInput
          label="Confirmar contraseña"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          autoCapitalize="none"
        />
        <Button
          title={loading ? 'Guardando...' : 'Guardar contraseña'}
          onPress={handleSubmit}
          loading={loading}
        />
        <Link href="/(auth)/login" asChild>
          <Pressable style={styles.backLink}>
            <Text style={[styles.link, { color: c.primary }]}>← Volver al inicio de sesión</Text>
          </Pressable>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 24, paddingTop: 48 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 14, marginBottom: 24, opacity: 0.9 },
  errorBox: { padding: 12, borderRadius: 8, marginBottom: 16 },
  errorText: { fontSize: 14 },
  backLink: { marginTop: 16, alignItems: 'center' },
  link: { fontSize: 14, fontWeight: '600' },
});
