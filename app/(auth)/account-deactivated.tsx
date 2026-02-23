import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Linking,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { useAuthStore } from '@/stores/auth-store';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const LOGO_URL = 'https://www.holistia.io/logos/holistia-black.png';
const HELP_URL = 'https://www.holistia.io/help';
const EMAIL = 'mailto:hola@holistia.io';
const WHATSAPP = 'https://wa.me/523331733702';

export default function AccountDeactivatedScreen() {
  const [email, setEmail] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const colorScheme = useColorScheme();
  const session = useAuthStore((s) => s.session);

  const isDark = colorScheme === 'dark';
  const c = isDark ? Colors.dark : Colors.light;

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) setEmail(user.email);
    };
    getUser();
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  };

  const handleOpenLink = (url: string) => {
    Linking.openURL(url);
  };

  // Si no hay sesión, redirigir a login
  useEffect(() => {
    if (!session && !isLoggingOut) {
      router.replace('/(auth)/login');
    }
  }, [session, isLoggingOut]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.logoWrapper}>
        <Image source={{ uri: LOGO_URL }} style={styles.logo} contentFit="contain" />
      </View>

      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.destructive }]}>
        <View style={[styles.iconWrapper, { backgroundColor: c.destructiveMuted }]}>
          <Text style={[styles.iconText, { color: c.destructive }]}>⚠</Text>
        </View>

        <Text style={[styles.title, { color: c.destructive }]}>Cuenta desactivada</Text>
        <Text style={[styles.subtitle, { color: c.foreground }]}>
          Tu cuenta de Holistia ha sido desactivada
        </Text>

        <View style={[styles.infoBox, { backgroundColor: c.accent, borderColor: c.border }]}>
          <Text style={[styles.infoTitle, { color: c.foreground }]}>¿Qué significa esto?</Text>
          <Text style={[styles.infoText, { color: c.foreground }]}>
            • Tu cuenta ha sido desactivada y no tienes acceso a la plataforma{'\n'}
            • No puedes acceder a citas, eventos, favoritos o tu perfil{'\n'}
            • Tus datos permanecen guardados de forma segura
          </Text>
        </View>

        {email ? (
          <Text style={[styles.emailText, { color: c.mutedForeground }]}>
            Cuenta: <Text style={[styles.emailValue, { color: c.foreground }]}>{email}</Text>
          </Text>
        ) : null}

        <View style={[styles.contactBox, { backgroundColor: c.accent, borderColor: c.border }]}>
          <Text style={[styles.contactTitle, { color: c.foreground }]}>
            ¿Quieres reactivar tu cuenta?
          </Text>
          <Text style={[styles.contactText, { color: c.foreground }]}>
            Si deseas volver a activar tu cuenta, contáctanos y te ayudaremos.
          </Text>
          <View style={styles.buttons}>
            <Button
              title="Ir al centro de ayuda"
              onPress={() => handleOpenLink(HELP_URL)}
              variant="outline"
            />
            <Button
              title="Enviar email"
              onPress={() => handleOpenLink(EMAIL)}
              variant="outline"
            />
            <Button
              title="WhatsApp"
              onPress={() => handleOpenLink(WHATSAPP)}
              variant="outline"
            />
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            title={isLoggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
            onPress={handleLogout}
            variant="outline"
            loading={isLoggingOut}
            disabled={isLoggingOut}
          />
          <Button
            title="Volver al inicio"
            onPress={() => router.replace('/(auth)/login')}
            variant="outline"
          />
        </View>
      </View>

        <Pressable onPress={() => handleOpenLink(EMAIL)}>
          <Text style={[styles.footer, { color: c.mutedForeground }]}>
            Si crees que esto es un error, contáctanos en{' '}
            <Text style={[styles.footerLink, { color: c.primary }]}>hola@holistia.io</Text>
          </Text>
        </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 40,
  },
  logoWrapper: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 48,
    height: 48,
  },
  card: {
    borderRadius: 12,
    padding: 24,
    borderWidth: 2,
    marginBottom: 24,
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  iconText: {
    fontSize: 28,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    opacity: 0.9,
  },
  infoBox: {
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 22,
    opacity: 0.9,
  },
  emailText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  emailValue: {
    fontWeight: '600',
  },
  contactBox: {
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 20,
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  contactText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
    opacity: 0.9,
  },
  buttons: {
    gap: 12,
  },
  actions: {
    gap: 12,
    alignSelf: 'stretch',
  },
  footer: {
    fontSize: 14,
    textAlign: 'center',
  },
  footerLink: {
    fontWeight: '600',
  },
});
