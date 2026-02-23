import { Stack } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ChallengesLayout() {
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
      <Stack.Screen name="index" options={{ title: 'Retos' }} />
      <Stack.Screen name="participants" options={{ title: 'Participantes' }} />
      <Stack.Screen name="new" options={{ title: 'Nuevo reto' }} />
      <Stack.Screen name="[id]/edit" options={{ title: 'Editar reto' }} />
      <Stack.Screen name="[id]/progress" options={{ title: 'Avances del reto' }} />
    </Stack>
  );
}
