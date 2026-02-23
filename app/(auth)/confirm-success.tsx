import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ConfirmSuccessScreen() {
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={[styles.iconWrap, { backgroundColor: c.primary + '20' }]}>
        <MaterialIcons name="check-circle" size={56} color={c.primary} />
      </View>
      <Text style={[styles.title, { color: c.foreground }]}>¡Email confirmado!</Text>
      <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
        Tu cuenta ha sido activada correctamente. Ya puedes acceder a todos los servicios de Holistia.
      </Text>
      <Pressable
        onPress={() => router.replace('/(tabs)' as any)}
        style={({ pressed }) => [styles.btn, { backgroundColor: c.primary }, pressed && styles.pressed]}>
        <Text style={styles.btnText}>Explorar Holistia</Text>
        <MaterialIcons name="arrow-forward" size={20} color="#fff" />
      </Pressable>
      <Pressable
        onPress={() => router.replace('/(auth)/login' as any)}
        style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
        <Text style={[styles.linkText, { color: c.primary }]}>Ir al inicio de sesión</Text>
      </Pressable>
    </View>
  );
}

ConfirmSuccessScreen.options = { title: 'Email confirmado' };

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 12,
    marginBottom: 16,
    minWidth: 220,
  },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  link: { paddingVertical: 12 },
  linkText: { fontSize: 16, fontWeight: '600' },
  pressed: { opacity: 0.9 },
});
