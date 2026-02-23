import { Stack } from 'expo-router';

export default function RestaurantMenusLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="new" options={{ title: 'Nuevo plato' }} />
      <Stack.Screen name="[menuId]/edit" options={{ title: 'Editar plato' }} />
    </Stack>
  );
}
