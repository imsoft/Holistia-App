import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const LOGO_URL = 'https://www.holistia.io/logos/holistia-black.png';

export default function ConfirmEmailScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const c = isDark ? Colors.dark : Colors.light;
  const bgColor = c.background;
  const textColor = c.foreground;

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.iconWrapper, { backgroundColor: c.accent }]}>
          <Text style={[styles.mailIcon, { color: c.primary }]}>✉</Text>
        </View>

        <Text style={[styles.title, { color: textColor }]}>¡Revisa tu email!</Text>
        <Text style={[styles.subtitle, { color: textColor }]}>
          Hemos enviado un enlace de confirmación a tu correo electrónico. Haz clic en el
          enlace para activar tu cuenta.
        </Text>

        <View style={[styles.helpBox, { backgroundColor: c.accent }]}>
          <Text style={[styles.helpTitle, { color: textColor }]}>¿No recibiste el email?</Text>
          <Text style={[styles.helpText, { color: textColor }]}>
            • Revisa tu carpeta de spam o correo no deseado{'\n'}
            • Verifica que el email esté escrito correctamente{'\n'}
            • El email puede tardar unos minutos en llegar
          </Text>
        </View>

        <Link href="/(auth)/confirm-success" asChild>
          <Pressable>
            <Text style={[styles.link, { color: c.primary }]}>Ya confirmé mi email</Text>
          </Pressable>
        </Link>
        <Link href="/(auth)/login" style={{ marginTop: 16 }}>
          <Text style={[styles.link, { color: c.primary }]}>Volver al inicio de sesión</Text>
        </Link>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: 'center',
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  mailIcon: {
    fontSize: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
    opacity: 0.9,
  },
  helpBox: {
    padding: 20,
    borderRadius: 12,
    width: '100%',
    marginBottom: 32,
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  helpText: {
    fontSize: 14,
    lineHeight: 22,
    opacity: 0.9,
  },
  link: {
    fontSize: 16,
    fontWeight: '600',
  },
});
