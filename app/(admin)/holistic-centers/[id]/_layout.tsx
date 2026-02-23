import { Stack } from 'expo-router';

export default function HolisticCenterDetailLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: 'Detalle centro' }} />
      <Stack.Screen name="services" options={{ headerShown: false }} />
    </Stack>
  );
}
