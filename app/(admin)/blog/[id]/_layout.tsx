import { Stack } from 'expo-router';

export default function BlogPostDetailLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: 'Detalle post' }} />
      <Stack.Screen name="edit" options={{ title: 'Editar post' }} />
    </Stack>
  );
}
