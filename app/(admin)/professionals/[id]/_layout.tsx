import { Stack } from 'expo-router';

export default function ProfessionalDetailLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: 'Detalle profesional' }} />
      <Stack.Screen name="services" options={{ headerShown: false }} />
    </Stack>
  );
}
