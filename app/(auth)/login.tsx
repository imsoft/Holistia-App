import { Button } from '@/components/ui/button';
import { GoogleButton } from '@/components/ui/google-button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { signInWithGoogle } from '@/lib/auth-google';
import { verifyLoginAndProfile } from '@/lib/auth-helpers';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { Image } from 'expo-image';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const LOGO_URL = 'https://www.holistia.io/logos/holistia-black.png';

export default function LoginScreen() {
  const session = useAuthStore((s) => s.session);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const colorScheme = useColorScheme();
  const params = useLocalSearchParams<{
    message?: string;
    error?: string;
    deactivated?: string;
  }>();

  const isDark = colorScheme === 'dark';
  const c = isDark ? Colors.dark : Colors.light;
  const bgColor = c.background;
  const textColor = c.foreground;

  useEffect(() => {
    if (session) {
      router.replace('/');
      return;
    }
    if (params.message === 'password_updated') {
      Alert.alert('Éxito', 'Contraseña actualizada. Ya puedes iniciar sesión con tu nueva contraseña.');
    }
    if (params.error) {
      const isTechnical =
        params.error.startsWith('{') ||
        params.error.includes('session_not_found') ||
        params.error.includes('JWT');
      setError(
        isTechnical
          ? 'Tu sesión ha expirado o no es válida. Inicia sesión de nuevo.'
          : params.error
      );
    }
    if (params.deactivated === 'true') {
      setError(
        'Tu cuenta ha sido desactivada. Para reactivarla, contacta con nosotros en hola@holistia.io'
      );
    }
  }, [params, session]);

  const handleLogin = async () => {
    setError(null);
    if (!email.trim()) {
      setError('Ingresa tu correo electrónico');
      return;
    }
    if (!password) {
      setError('Ingresa tu contraseña');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    setLoading(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      if (data.session) {
        const result = await verifyLoginAndProfile(supabase, data.session);
        if (result.ok === false && result.deactivated) {
          setLoading(false);
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore - ruta account-deactivated (tipos generados por Expo)
          router.replace('/(auth)/account-deactivated');
          return;
        }
        router.replace('/');
      }
    } catch {
      setError('Ocurrió un error inesperado. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      const { error: googleError } = await signInWithGoogle();
      if (googleError) setError(googleError);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: bgColor }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Image source={{ uri: LOGO_URL }} style={styles.logo} contentFit="contain" />
          <Text style={[styles.title, { color: textColor }]}>Inicia sesión en tu cuenta</Text>
        </View>

        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          {error ? (
            <View style={[styles.errorBox, { backgroundColor: c.destructiveMuted }]}>
              <Text style={[styles.errorText, { color: c.destructive }]}>{error}</Text>
            </View>
          ) : null}

          <Input
            label="Correo electrónico"
            placeholder="tu@email.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <PasswordInput
            label="Contraseña"
            placeholder="Mínimo 8 caracteres"
            value={password}
            onChangeText={setPassword}
          />

          <View style={styles.forgotLinkWrapper}>
            <Link href="/(auth)/forgot-password">
              <Text style={[styles.forgotLink, { color: c.primary }]}>¿Olvidaste tu contraseña?</Text>
            </Link>
          </View>

          <Button title="Iniciar sesión" onPress={handleLogin} loading={loading} />

          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: c.border }]} />
            <Text style={[styles.dividerText, { color: textColor }]}>O continúa con</Text>
            <View style={[styles.dividerLine, { backgroundColor: c.border }]} />
          </View>

          <GoogleButton
            title="Continuar con Google"
            onPress={handleGoogleSignIn}
            loading={googleLoading}
          />
        </View>

        <Text style={[styles.footerText, { color: textColor }]}>
          ¿No tienes cuenta?{' '}
          <Link href="/(auth)/signup">
            <Text style={[styles.link, { color: c.primary }]}>Regístrate ahora</Text>
          </Link>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 48,
    height: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  card: {
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
  },
  errorBox: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
  },
  forgotLinkWrapper: {
    marginBottom: 48,
  },
  forgotLink: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
    marginHorizontal: 12,
    fontWeight: '500',
  },
  footerText: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 14,
  },
  link: {
    fontWeight: '600',
  },
});
