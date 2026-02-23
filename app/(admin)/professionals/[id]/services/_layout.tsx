import { Stack } from 'expo-router';

export default function ProfessionalServicesLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="new" options={{ title: 'Nuevo servicio' }} />
      <Stack.Screen name="[serviceId]/edit" options={{ title: 'Editar servicio' }} />
    </Stack>
  );
}
