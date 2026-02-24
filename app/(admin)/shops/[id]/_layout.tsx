import { BackButton } from '@/components/ui/back-button';
import { Stack } from 'expo-router';

export default function ShopDetailLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: 'Detalle comercio' , headerLeft: () => <BackButton /> }} />
      <Stack.Screen name="products" options={{ headerShown: false }} />
    </Stack>
  );
}
