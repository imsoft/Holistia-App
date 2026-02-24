import { BackButton } from '@/components/ui/back-button';
import { Stack } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function AvailabilityLayout() {
  const colorScheme = useColorScheme();
  const bg = Colors[colorScheme ?? 'light'].background;

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        contentStyle: { backgroundColor: bg },
        headerBackTitle: 'Atrás',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Disponibilidad' , headerLeft: () => <BackButton /> }} />
      <Stack.Screen name="new" options={{ title: 'Nuevo bloqueo' }} />
      <Stack.Screen name="[id]/edit" options={{ title: 'Editar bloqueo' }} />
    </Stack>
  );
}
