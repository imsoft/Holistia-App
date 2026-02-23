import { Stack } from 'expo-router';

export default function BlogLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: 'Blog' }} />
      <Stack.Screen name="new" options={{ title: 'Crear post' }} />
      <Stack.Screen name="[id]" options={{ headerShown: false }} />
    </Stack>
  );
}
