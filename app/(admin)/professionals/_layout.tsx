import { Stack } from 'expo-router';

export default function ProfessionalsLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: 'Profesionales' }} />
      <Stack.Screen name="[id]" options={{ title: 'Detalle profesional' }} />
    </Stack>
  );
}
