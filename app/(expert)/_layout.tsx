import { Stack } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ExpertLayout() {
  const colorScheme = useColorScheme();
  const bg = Colors[colorScheme ?? 'light'].background;

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
      <Stack.Screen name="services" options={{ headerShown: false }} />
      <Stack.Screen name="schedule" options={{ title: 'Horarios' }} />
      <Stack.Screen name="availability" options={{ headerShown: false }} />
      <Stack.Screen name="cotizaciones" options={{ title: 'Cotizaciones' }} />
      <Stack.Screen name="patients" options={{ title: 'Pacientes' }} />
      <Stack.Screen name="gallery" options={{ title: 'Galería' }} />
      <Stack.Screen name="digital-products" options={{ headerShown: false }} />
      <Stack.Screen name="challenges" options={{ headerShown: false }} />
      <Stack.Screen name="my-events" options={{ title: 'Mis eventos' }} />
      <Stack.Screen name="finances" options={{ title: 'Finanzas' }} />
      <Stack.Screen name="profile" options={{ title: 'Perfil' }} />
      <Stack.Screen name="profile/edit" options={{ title: 'Editar perfil' }} />
      <Stack.Screen name="settings" options={{ title: 'Configuración' }} />
    </Stack>
  );
}
