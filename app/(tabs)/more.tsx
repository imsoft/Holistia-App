import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { supabase } from '@/lib/supabase';
import { useProfessionalStore } from '@/stores/professional-store';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { getOnboardingSteps, type OnboardingStep } from '@/lib/patient-onboarding';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
const MENU_ITEMS = [
  { id: 'help', label: 'Centro de ayuda', icon: 'questionmark.circle.fill', route: '/help' },
  { id: 'my-profile', label: 'Mi perfil', icon: 'person.circle.fill', route: '/(patient)/profile/' },
  { id: 'profile-edit', label: 'Editar perfil', icon: 'person.fill', route: '/(patient)/profile-edit' },
  { id: 'privacy', label: 'Privacidad', icon: 'lock.shield.fill', route: '/(patient)/privacy' },
  { id: 'notifications', label: 'Notificaciones', icon: 'bell.fill', route: '/(patient)/notifications' },
  { id: 'favorites', label: 'Favoritos', icon: 'heart.fill', route: '/(patient)/favorites' },
  { id: 'appointments', label: 'Mis citas', icon: 'calendar', route: '/(patient)/appointments' },
  { id: 'my-products', label: 'Mis programas', icon: 'doc.text.fill', route: '/(patient)/my-products' },
  { id: 'my-challenges', label: 'Mis retos', icon: 'flame.fill', route: '/(patient)/my-challenges' },
  { id: 'my-registrations', label: 'Mis inscripciones', icon: 'ticket.fill', route: '/(patient)/my-registrations' },
  { id: 'blog', label: 'Blog', icon: 'book.fill', route: '/(patient)/blog' },
  { id: 'programs', label: 'Explorar programas', icon: 'doc.text.fill', route: '/(patient)/programs' },
  { id: 'challenges', label: 'Explorar retos', icon: 'safari.fill', route: '/(patient)/challenges' },
  { id: 'become-professional', label: 'Volverme profesional', icon: 'briefcase.fill', route: '/(patient)/become-professional' },
];

export default function MoreScreen() {
  const session = useAuthStore((s) => s.session);
  const professional = useProfessionalStore((s) => s.professional);
  const [onboardingSteps, setOnboardingSteps] = useState<OnboardingStep[]>([]);
  const colorScheme = useColorScheme();
  const c = colorScheme === 'dark' ? Colors.dark : Colors.light;

  useEffect(() => {
    if (!professional && session?.user?.id) {
      getOnboardingSteps(session.user.id).then(setOnboardingSteps);
    } else {
      setOnboardingSteps([]);
    }
  }, [professional, session?.user?.id]);

  const onboardingComplete = onboardingSteps.length > 0 && onboardingSteps.every((s) => s.done);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  };

  const userName =
    session?.user?.user_metadata?.first_name ||
    session?.user?.email?.split('@')[0] ||
    'Usuario';

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.background }]} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.foreground }]}>Más</Text>
        <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
          Accede a tu contenido y ajustes
        </Text>
      </View>

      {!professional && onboardingSteps.length > 0 && !onboardingComplete && (
        <View style={[styles.onboardingCard, { backgroundColor: `${c.primary}12`, borderColor: c.primary }]}>
          <View style={styles.onboardingHeader}>
            <MaterialIcons name="check-circle" size={20} color={c.primary} />
            <Text style={[styles.onboardingTitle, { color: c.foreground }]}>Completa tu experiencia</Text>
          </View>
          <Text style={[styles.onboardingSub, { color: c.mutedForeground }]}>
            {onboardingSteps.filter((s) => s.done).length} de {onboardingSteps.length} pasos
          </Text>
          {onboardingSteps.map((step) => (
            <Pressable
              key={step.id}
              onPress={() => router.push(step.route as any)}
              style={styles.onboardingRow}>
              <MaterialIcons
                name={step.done ? 'check-circle' : 'radio-button-unchecked'}
                size={20}
                color={step.done ? c.primary : c.mutedForeground}
              />
              <Text style={[styles.onboardingLabel, { color: step.done ? c.mutedForeground : c.foreground }]}>
                {step.label}
              </Text>
              {!step.done && <IconSymbol name="chevron.right" size={16} color={c.mutedForeground} />}
            </Pressable>
          ))}
        </View>
      )}

      <View style={[styles.menuCard, { backgroundColor: c.card, borderColor: c.border }]}>
        {MENU_ITEMS.map((item) => (
          <Pressable
            key={item.id}
            onPress={() =>
              router.push(
                (item.id === 'my-profile' && session?.user?.id
                  ? `/(patient)/profile/${session.user.id}`
                  : item.route) as any
              )
            }
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
  onboardingCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  onboardingHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  onboardingTitle: { fontSize: 16, fontWeight: '600' },
  onboardingSub: { fontSize: 13, marginBottom: 12 },
  onboardingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  onboardingLabel: { flex: 1, fontSize: 15 },
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
