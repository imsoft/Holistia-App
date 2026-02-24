import { BackButton } from '@/components/ui/back-button';
import { Stack } from 'expo-router';

export default function BlogPostDetailLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: 'Detalle post', headerLeft: () => <BackButton /> }} />
      <Stack.Screen name="edit" options={{ title: 'Editar post' }} />
    </Stack>
  );
}
