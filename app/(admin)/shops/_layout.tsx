import { BackButton } from '@/components/ui/back-button';
import { Stack } from 'expo-router';

export default function ShopsLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: 'Comercios' , headerLeft: () => <BackButton /> }} />
      <Stack.Screen name="[id]" options={{ headerShown: false }} />
    </Stack>
  );
}
