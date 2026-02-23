import { Stack, router } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getProfileType } from '@/lib/admin-auth';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';

export default function AdminLayout() {
  const colorScheme = useColorScheme();
  const session = useAuthStore((s) => s.session);
  const isLoading = useAuthStore((s) => s.isLoading);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const bg = Colors[colorScheme ?? 'light'].background;

  useEffect(() => {
    if (!session?.user?.id || isLoading) return;
    getProfileType(supabase, session.user.id).then((type) => {
      setIsAdmin(type === 'admin');
    });
  }, [session?.user?.id, isLoading]);

  useEffect(() => {
    if (isAdmin === false && !isLoading) {
      (router as any).replace('/(tabs)');
    }
  }, [isAdmin, isLoading]);

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        contentStyle: { backgroundColor: bg },
        animation: 'slide_from_right',
        headerBackTitle: 'Atrás',
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="analytics" options={{ title: 'Analíticas' }} />
      <Stack.Screen name="finances" options={{ title: 'Finanzas' }} />
      <Stack.Screen name="blog" options={{ title: 'Blog', headerShown: false }} />
      <Stack.Screen name="professionals" options={{ title: 'Profesionales', headerShown: false }} />
      <Stack.Screen name="users" options={{ title: 'Usuarios' }} />
      <Stack.Screen name="applications" options={{ title: 'Solicitudes' }} />
      <Stack.Screen name="appointments" options={{ title: 'Citas' }} />
      <Stack.Screen name="certifications" options={{ title: 'Certificaciones' }} />
      <Stack.Screen name="events" options={{ title: 'Eventos', headerShown: false }} />
      <Stack.Screen name="challenges" options={{ title: 'Retos', headerShown: false }} />
      <Stack.Screen name="digital-products" options={{ title: 'Programas digitales', headerShown: false }} />
      <Stack.Screen name="holistic-centers" options={{ title: 'Centros holísticos', headerShown: false }} />
      <Stack.Screen name="restaurants" options={{ title: 'Restaurantes', headerShown: false }} />
      <Stack.Screen name="shops" options={{ title: 'Comercios', headerShown: false }} />
      <Stack.Screen name="companies" options={{ title: 'Empresas' }} />
      <Stack.Screen name="holistic-services" options={{ title: 'Servicios holísticos' }} />
      <Stack.Screen name="tickets" options={{ title: 'Tickets' }} />
      <Stack.Screen name="services-costs" options={{ title: 'Costos de servicios' }} />
      <Stack.Screen name="sync-tools" options={{ title: 'Sync tools' }} />
      <Stack.Screen name="ai-agent" options={{ title: 'Asistente IA' }} />
      <Stack.Screen name="github-commits" options={{ title: 'Commits GitHub' }} />
      <Stack.Screen name="whatsapp-test" options={{ title: 'Prueba WhatsApp' }} />
      <Stack.Screen name="cron-sync-logs" options={{ title: 'Logs sync Google Calendar' }} />
      <Stack.Screen name="my-events" options={{ title: 'Mis eventos' }} />
    </Stack>
  );
}
