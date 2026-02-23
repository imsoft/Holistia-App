import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function ErrorScreen() {
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <MaterialIcons name="error-outline" size={64} color={c.destructive} style={styles.icon} />
      <Text style={[styles.title, { color: c.foreground }]}>Algo ha ido mal</Text>
      <Text style={[styles.message, { color: c.mutedForeground }]}>
        Ha ocurrido un error inesperado. Puedes volver atrás o intentar de nuevo.
      </Text>
      <Pressable
        onPress={() => router.back()}
        style={[styles.btn, { backgroundColor: c.primary }]}>
        <Text style={styles.btnText}>Volver</Text>
      </Pressable>
      <Pressable
        onPress={() => router.replace('/' as any)}
        style={[styles.btnOutline, { borderColor: c.border }]}>
        <Text style={[styles.btnOutlineText, { color: c.foreground }]}>Ir al inicio</Text>
      </Pressable>
    </View>
  );
}

ErrorScreen.options = { title: 'Error' };

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  icon: { marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  message: { fontSize: 16, textAlign: 'center', marginBottom: 28, lineHeight: 24 },
  btn: { paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12, marginBottom: 12, minWidth: 200, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  btnOutline: { paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12, borderWidth: 1, minWidth: 200, alignItems: 'center' },
  btnOutlineText: { fontSize: 16, fontWeight: '600' },
});
