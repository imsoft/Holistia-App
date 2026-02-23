import { Stack } from 'expo-router';

export default function DigitalProductsLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: 'Programas digitales' }} />
      <Stack.Screen name="new" options={{ title: 'Crear programa' }} />
      <Stack.Screen name="[id]" options={{ headerShown: false }} />
    </Stack>
  );
}
