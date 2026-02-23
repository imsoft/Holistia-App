import { Stack } from 'expo-router';

export default function MyChallengesLayout() {
  return (
    <Stack screenOptions={{ headerShown: true, headerBackTitle: 'Atrás' }}>
      <Stack.Screen name="index" options={{ title: 'Mis retos', headerShown: false }} />
      <Stack.Screen name="new" options={{ title: 'Crear reto' }} />
      <Stack.Screen name="edit/[challengeId]" options={{ title: 'Editar reto' }} />
      <Stack.Screen name="completed" options={{ title: '¡Reto completado!' }} />
      <Stack.Screen name="[id]" options={{ title: 'Detalle del reto' }} />
    </Stack>
  );
}
