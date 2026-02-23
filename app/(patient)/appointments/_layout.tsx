import { Stack } from 'expo-router';

export default function AppointmentsLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackTitle: 'Atrás',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Mis citas' }} />
      <Stack.Screen name="confirmation" options={{ title: 'Cita confirmada' }} />
      <Stack.Screen name="[id]" options={{ title: 'Detalle de cita' }} />
      <Stack.Screen name="[id]/cancel" options={{ title: 'Cancelar cita' }} />
      <Stack.Screen name="[id]/reschedule" options={{ title: 'Reprogramar' }} />
      <Stack.Screen name="[id]/no-show" options={{ title: 'Marcar inasistencia' }} />
    </Stack>
  );
}
