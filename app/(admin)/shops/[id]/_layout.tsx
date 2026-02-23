import { Stack } from 'expo-router';

export default function ShopDetailLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: 'Detalle comercio' }} />
      <Stack.Screen name="products" options={{ headerShown: false }} />
    </Stack>
  );
}
