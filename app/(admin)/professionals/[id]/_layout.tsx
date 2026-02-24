import { BackButton } from '@/components/ui/back-button';
import { Stack } from 'expo-router';

export default function ProfessionalDetailLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: 'Detalle profesional' , headerLeft: () => <BackButton /> }} />
      <Stack.Screen name="services" options={{ headerShown: false }} />
    </Stack>
  );
}
