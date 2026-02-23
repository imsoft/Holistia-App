import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { useProfessionalStore } from '@/stores/professional-store';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';

const MENU_ITEMS = [
  { id: 'help', label: 'Centro de ayuda', icon: 'questionmark.circle.fill', route: '/help' },
  { id: 'notifications', label: 'Notificaciones', icon: 'bell.fill', route: '/(patient)/notifications' },
  { id: 'services', label: 'Servicios', icon: 'heart.fill', route: '/(expert)/services' },
  { id: 'schedule', label: 'Horarios', icon: 'clock.fill', route: '/(expert)/schedule' },
  { id: 'availability', label: 'Bloqueos de disponibilidad', icon: 'calendar', route: '/(expert)/availability' },
  { id: 'cotizaciones', label: 'Cotizaciones', icon: 'heart.fill', route: '/(expert)/cotizaciones' },
  { id: 'patients', label: 'Pacientes', icon: 'person.fill', route: '/(expert)/patients' },
  { id: 'gallery', label: 'Galería', icon: 'rectangle.stack.fill', route: '/(expert)/gallery' },
  { id: 'digital-products', label: 'Programas digitales', icon: 'doc.text.fill', route: '/(expert)/digital-products' },
  { id: 'challenges', label: 'Retos', icon: 'flame.fill', route: '/(expert)/challenges' },
  { id: 'my-events', label: 'Mis eventos', icon: 'calendar', route: '/(expert)/my-events' },
  { id: 'finances', label: 'Finanzas', icon: 'heart.fill', route: '/(expert)/finances' },
  { id: 'profile', label: 'Perfil', icon: 'person.fill', route: '/(expert)/profile' },
  { id: 'settings', label: 'Configuración', icon: 'ellipsis.circle.fill', route: '/(expert)/settings' },
];

export default function ExpertMoreScreen() {
  const session = useAuthStore((s) => s.session);
  const professional = useProfessionalStore((s) => s.professional);
  const colorScheme = useColorScheme();
  const c = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const handleSignOut = async () => {
    useProfessionalStore.getState().clear();
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  };

  const userName =
    professional
      ? `${professional.first_name || ''} ${professional.last_name || ''}`.trim()
      : session?.user?.email?.split('@')[0] || 'Profesional';

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.background }]} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.foreground }]}>Más</Text>
        <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
          Gestión de tu práctica
        </Text>
      </View>

      <View style={[styles.menuCard, { backgroundColor: c.card, borderColor: c.border }]}>
        {MENU_ITEMS.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => router.push(item.route as any)}
            style={({ pressed }) => [
              styles.menuRow,
              pressed && styles.pressed,
            ]}>
            <IconSymbol name={item.icon as any} size={22} color={c.primary} />
            <Text style={[styles.menuLabel, { color: c.foreground }]}>{item.label}</Text>
            <IconSymbol name="chevron.right" size={18} color={c.mutedForeground} />
          </Pressable>
        ))}
      </View>

      <View style={styles.footer}>
        <Text style={[styles.userText, { color: c.mutedForeground }]}>{userName}</Text>
        <Pressable
          onPress={handleSignOut}
          style={[styles.signOutBtn, { borderColor: c.destructive }]}>
          <Text style={[styles.signOutText, { color: c.destructive }]}>Cerrar sesión</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 40 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 15, marginTop: 4 },
  menuCard: {
    marginHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  pressed: { opacity: 0.8 },
  menuLabel: { flex: 1, fontSize: 16, fontWeight: '500' },
  footer: { marginTop: 32, paddingHorizontal: 20, alignItems: 'center', gap: 12 },
  userText: { fontSize: 14 },
  signOutBtn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10, borderWidth: 2 },
  signOutText: { fontSize: 16, fontWeight: '600' },
});
