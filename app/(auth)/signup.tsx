import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { signInWithGoogle } from '@/lib/auth-google';
import { verifyLoginAndProfile } from '@/lib/auth-helpers';
import { supabase } from '@/lib/supabase';
import { API_BASE_URL } from '@/constants/auth';
import { normalizeName } from '@/lib/text-utils';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Button } from '@/components/ui/button';
import { GoogleButton } from '@/components/ui/google-button';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const LOGO_URL = 'https://www.holistia.io/logos/holistia-black.png';

export default function SignupScreen() {
  const session = useAuthStore((s) => s.session);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const colorScheme = useColorScheme();
  const params = useLocalSearchParams<{ becomeProfessional?: string }>();
  const becomeProfessional = params.becomeProfessional === 'true';

  useEffect(() => {
    if (session) {
      router.replace('/(tabs)');
    }
  }, [session]);

  const isDark = colorScheme === 'dark';
  const c = isDark ? Colors.dark : Colors.light;
  const bgColor = c.background;
  const textColor = c.foreground;

  const handleSignup = async () => {
    setError(null);
    if (!firstName.trim() || firstName.trim().length < 2) {
      setError('El nombre debe tener al menos 2 caracteres');
      return;
    }
    if (!lastName.trim() || lastName.trim().length < 2) {
      setError('El apellido debe tener al menos 2 caracteres');
      return;
    }
    if (!email.trim()) {
      setError('Ingresa un correo electrónico válido');
      return;
    }
    if (!password || password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    setLoading(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            first_name: normalizeName(firstName.trim()),
            last_name: normalizeName(lastName.trim()),
          },
          emailRedirectTo: `${API_BASE_URL}/auth/confirm`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        if (data.session) {
          const result = await verifyLoginAndProfile(supabase, data.session);
          if (result.ok === false && result.deactivated) {
            setLoading(false);
            // @ts-expect-error - ruta account-deactivated (tipos generados por Expo)
            router.replace('/(auth)/account-deactivated');
            return;
          }
          router.replace('/(tabs)');
        } else {
          setSuccess(true);
          router.push('/(auth)/confirm-email');
        }
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
          <Text style={[styles.title, { color: textColor }]}>Crea tu cuenta</Text>
        </View>

        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          {error ? (
            <View style={[styles.errorBox, { backgroundColor: c.destructiveMuted }]}>
              <Text style={[styles.errorText, { color: c.destructive }]}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.row}>
            <View style={styles.half}>
              <Input
                label="Nombre"
                placeholder="Tu nombre"
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
              />
            </View>
            <View style={styles.half}>
              <Input
                label="Apellido"
                placeholder="Tu apellido"
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
              />
            </View>
          </View>

          <Input
            label="Correo electrónico"
            placeholder="tu@email.com"
            value={email}
            onChangeText={(v) => setEmail(v.toLowerCase())}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <PasswordInput
            label="Contraseña"
            placeholder="Mínimo 8 caracteres"
            value={password}
            onChangeText={setPassword}
          />

          <Button
            title={loading ? 'Creando cuenta...' : success ? 'Cuenta creada' : 'Crear cuenta'}
            onPress={handleSignup}
            loading={loading}
            disabled={success}
          />

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
          ¿Ya tienes cuenta?{' '}
          <Link href="/(auth)/login">
            <Text style={[styles.link, { color: c.primary }]}>Inicia sesión</Text>
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
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  half: {
    flex: 1,
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
