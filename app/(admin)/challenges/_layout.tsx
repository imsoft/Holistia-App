import { BackButton } from '@/components/ui/back-button';
import { Stack } from 'expo-router';

export default function ChallengesLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: 'Retos' , headerLeft: () => <BackButton /> }} />
      <Stack.Screen name="new" options={{ title: 'Crear reto' }} />
      <Stack.Screen name="[id]" options={{ headerShown: false }} />
    </Stack>
  );
}
