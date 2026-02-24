import { BackButton } from '@/components/ui/back-button';
import { Stack } from 'expo-router';

export default function EventDetailLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: 'Detalle evento' , headerLeft: () => <BackButton /> }} />
      <Stack.Screen name="edit" options={{ title: 'Editar evento' }} />
      <Stack.Screen name="registrations" options={{ title: 'Registraciones' }} />
    </Stack>
  );
}
