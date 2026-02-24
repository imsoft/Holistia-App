import { BackButton } from '@/components/ui/back-button';
import { Stack } from 'expo-router';

export default function ProfessionalsLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: 'Profesionales' , headerLeft: () => <BackButton /> }} />
      <Stack.Screen name="[id]" options={{ title: 'Detalle profesional' }} />
    </Stack>
  );
}
