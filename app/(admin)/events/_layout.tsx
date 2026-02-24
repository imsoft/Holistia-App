import { BackButton } from '@/components/ui/back-button';
import { Stack } from 'expo-router';

export default function EventsLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: 'Eventos', headerLeft: () => <BackButton /> }} />
      <Stack.Screen name="new" options={{ title: 'Crear evento' }} />
      <Stack.Screen name="[id]" options={{ headerShown: false }} />
    </Stack>
  );
}
