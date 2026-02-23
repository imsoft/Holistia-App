import { Stack } from 'expo-router';

export default function ChallengesLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: 'Retos' }} />
      <Stack.Screen name="new" options={{ title: 'Crear reto' }} />
      <Stack.Screen name="[id]" options={{ headerShown: false }} />
    </Stack>
  );
}
