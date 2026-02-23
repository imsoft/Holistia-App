import { Stack } from 'expo-router';

export default function ShopProductsLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="new" options={{ title: 'Nuevo producto' }} />
      <Stack.Screen name="[productId]/edit" options={{ title: 'Editar producto' }} />
    </Stack>
  );
}
