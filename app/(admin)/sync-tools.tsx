import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/stores/auth-store';
import { adminApiFetch } from '@/lib/admin-api';

export default function AdminSyncToolsScreen() {
  const [professionalId, setProfessionalId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const session = useAuthStore((s) => s.session);
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const runSync = async (clearFirst: boolean) => {
    const id = professionalId.trim();
    if (!id) {
      Alert.alert('Campo requerido', 'Ingresa el ID del profesional.');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await adminApiFetch('/api/admin/force-sync-google-calendar', session, {
        method: 'POST',
        body: JSON.stringify({ professionalId: id, clearFirst: clearFirst || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || res.statusText);
      setResult(JSON.stringify(data, null, 2));
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.label, { color: c.mutedForeground }]}>
        Diagnóstico y sincronización de Google Calendar
      </Text>
      <TextInput
        style={[styles.input, { backgroundColor: c.card, color: c.foreground, borderColor: c.border }]}
        placeholder="Professional ID"
        placeholderTextColor={c.mutedForeground}
        value={professionalId}
        onChangeText={setProfessionalId}
        autoCapitalize="none"
      />
      <View style={styles.buttons}>
        <Pressable
          style={[styles.btn, { backgroundColor: c.primary }]}
          onPress={() => runSync(false)}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={c.primaryForeground} size="small" />
          ) : (
            <Text style={[styles.btnText, { color: c.primaryForeground }]}>Diagnosticar</Text>
          )}
        </Pressable>
        <Pressable
          style={[styles.btn, { backgroundColor: c.secondary }]}
          onPress={() => runSync(true)}
          disabled={loading}
        >
          <Text style={[styles.btnText, { color: c.secondaryForeground }]}>Sync (limpiar primero)</Text>
        </Pressable>
      </View>
      {result ? (
        <View style={[styles.result, { backgroundColor: c.card }]}>
          <Text style={[styles.resultText, { color: c.foreground }]} selectable>
            {result}
          </Text>
        </View>
      ) : null}
      <View style={styles.bottomPad} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  label: { fontSize: 14, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 16, marginBottom: 12 },
  buttons: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  btn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  btnText: { fontSize: 16, fontWeight: '600' },
  result: { padding: 12, borderRadius: 12 },
  resultText: { fontFamily: 'monospace', fontSize: 12 },
  bottomPad: { height: 24 },
});
