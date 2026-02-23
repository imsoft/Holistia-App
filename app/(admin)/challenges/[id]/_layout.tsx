import { Stack } from "expo-router";

export default function ChallengeDetailLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: "Detalle reto" }} />
      <Stack.Screen name="edit" options={{ title: "Editar reto" }} />
    </Stack>
  );
}
