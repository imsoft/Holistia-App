import { BackButton } from '@/components/ui/back-button';
import { Stack } from 'expo-router';

export default function RestaurantDetailLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: 'Detalle restaurante' , headerLeft: () => <BackButton /> }} />
      <Stack.Screen name="menus" options={{ headerShown: false }} />
    </Stack>
  );
}
