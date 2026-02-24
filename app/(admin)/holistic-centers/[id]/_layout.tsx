import { BackButton } from '@/components/ui/back-button';
import { Stack } from 'expo-router';

export default function HolisticCenterDetailLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: 'Detalle centro' , headerLeft: () => <BackButton /> }} />
      <Stack.Screen name="services" options={{ headerShown: false }} />
    </Stack>
  );
}
