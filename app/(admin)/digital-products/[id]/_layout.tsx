import { BackButton } from '@/components/ui/back-button';
import { Stack } from 'expo-router';

export default function DigitalProductDetailLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: 'Detalle programa' , headerLeft: () => <BackButton /> }} />
      <Stack.Screen name="edit" options={{ title: 'Editar programa' }} />
    </Stack>
  );
}
