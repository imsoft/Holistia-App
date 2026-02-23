import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/stores/auth-store';
import { IconSymbol } from '@/components/ui/icon-symbol';

const MENU_ITEMS: { title: string; route: string }[] = [
  { title: 'Analíticas', route: '/(admin)/analytics' },
  { title: 'Finanzas', route: '/(admin)/finances' },
  { title: 'Blog', route: '/(admin)/blog' },
  { title: 'Profesionales', route: '/(admin)/professionals' },
  { title: 'Usuarios', route: '/(admin)/users' },
  { title: 'Solicitudes', route: '/(admin)/applications' },
  { title: 'Citas', route: '/(admin)/appointments' },
  { title: 'Certificaciones', route: '/(admin)/certifications' },
  { title: 'Eventos', route: '/(admin)/events' },
  { title: 'Mis eventos', route: '/(admin)/my-events' },
  { title: 'Retos', route: '/(admin)/challenges' },
  { title: 'Programas digitales', route: '/(admin)/digital-products' },
  { title: 'Centros holísticos', route: '/(admin)/holistic-centers' },
  { title: 'Restaurantes', route: '/(admin)/restaurants' },
  { title: 'Comercios', route: '/(admin)/shops' },
  { title: 'Empresas', route: '/(admin)/companies' },
  { title: 'Servicios holísticos', route: '/(admin)/holistic-services' },
  { title: 'Tickets', route: '/(admin)/tickets' },
  { title: 'Costos de servicios', route: '/(admin)/services-costs' },
  { title: 'Sync tools', route: '/(admin)/sync-tools' },
  { title: 'Logs sync Google Calendar', route: '/(admin)/cron-sync-logs' },
  { title: 'Asistente IA', route: '/(admin)/ai-agent' },
  { title: 'Commits GitHub', route: '/(admin)/github-commits' },
  { title: 'Prueba WhatsApp', route: '/(admin)/whatsapp-test' },
];

export default function AdminMoreScreen() {
  const colorScheme = useColorScheme();
  const c = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const signOut = useAuthStore((s) => s.signOut);

  const handleSignOut = async () => {
    await signOut();
    (router as any).replace('/(auth)/login');
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.sectionLabel, { color: c.mutedForeground }]}>Administración</Text>
      {MENU_ITEMS.map((item) => (
        <Pressable
          key={item.route}
          style={({ pressed }) => [
            styles.row,
            { backgroundColor: c.card },
            pressed && styles.pressed,
          ]}
          onPress={() => (router as any).push(item.route)}
        >
          <Text style={[styles.rowTitle, { color: c.foreground }]}>{item.title}</Text>
          <IconSymbol name="chevron.right" size={20} color={c.mutedForeground} />
        </Pressable>
      ))}
      <View style={styles.spacer} />
      <Pressable
        style={({ pressed }) => [
          styles.signOutBtn,
          { backgroundColor: c.destructive },
          pressed && styles.pressed,
        ]}
        onPress={handleSignOut}
      >
        <Text style={[styles.signOutText, { color: c.primaryForeground }]}>Cerrar sesión</Text>
      </Pressable>
      <View style={styles.bottomPad} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  sectionLabel: { fontSize: 12, fontWeight: '600', marginBottom: 8, marginLeft: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  rowTitle: { fontSize: 16 },
  pressed: { opacity: 0.8 },
  spacer: { height: 24 },
  signOutBtn: { padding: 16, borderRadius: 12 },
  signOutText: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  bottomPad: { height: 24 },
});
