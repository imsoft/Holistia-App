import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Pressable,
  Alert,
} from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/stores/auth-store';
import { supabase } from '@/lib/supabase';
import { adminApiFetch } from '@/lib/admin-api';

type Professional = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  profession: string | null;
};

export default function AdminCertificationsScreen() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const session = useAuthStore((s) => s.session);
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data, error } = await supabase
        .from('professional_applications')
        .select('id, first_name, last_name, email, profession')
        .eq('status', 'approved')
        .order('first_name');
      if (error) throw error;
      setProfessionals(data ?? []);
    } catch (e) {
      console.error('Certifications load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, []);

  const filtered = search.trim()
    ? professionals.filter(
        (p) =>
          `${p.first_name ?? ''} ${p.last_name ?? ''} ${p.email ?? ''}`.toLowerCase().includes(search.toLowerCase())
      )
    : professionals;

  const selected = professionals.find((p) => p.id === selectedId);

  const sendCertification = async () => {
    if (!selected?.email) {
      Alert.alert('Error', 'Selecciona un profesional con email');
      return;
    }
    setSending(true);
    try {
      const name = [selected.first_name, selected.last_name].filter(Boolean).join(' ') || 'Profesional';
      const res = await adminApiFetch('/api/admin/send-certification-email', session, {
        method: 'POST',
        body: JSON.stringify({
          professional_email: selected.email,
          professional_name: name,
          profession: selected.profession ?? '',
          message: message || 'Tu certificación ha sido confirmada.',
          admin_name: 'Admin Holistia',
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error || await res.text());
      Alert.alert('Enviado', 'Email de certificación enviado.');
      setMessage('');
      setSelectedId(null);
      load(true);
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setSending(false);
    }
  };

  if (loading && professionals.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.primary} />
      }
    >
      <View style={[styles.card, { backgroundColor: c.card }]}>
        <Text style={[styles.label, { color: c.mutedForeground }]}>Profesionales aprobados</Text>
        <Text style={[styles.value, { color: c.foreground }]}>{professionals.length}</Text>
      </View>
      <TextInput
        style={[styles.input, { backgroundColor: c.card, color: c.foreground, borderColor: c.border }]}
        placeholder="Buscar profesional"
        placeholderTextColor={c.mutedForeground}
        value={search}
        onChangeText={setSearch}
      />
      <Text style={[styles.sectionTitle, { color: c.foreground }]}>Seleccionar profesional</Text>
      {filtered.map((p) => (
        <Pressable
          key={p.id}
          style={[
            styles.row,
            { backgroundColor: c.card },
            selectedId === p.id && { borderWidth: 2, borderColor: c.primary },
          ]}
          onPress={() => setSelectedId(p.id)}
        >
          <Text style={[styles.rowTitle, { color: c.foreground }]}>
            {[p.first_name, p.last_name].filter(Boolean).join(' ') || 'Sin nombre'}
          </Text>
          <Text style={[styles.rowMeta, { color: c.mutedForeground }]} numberOfLines={1}>
            {p.email ?? '—'} · {p.profession ?? '—'}
          </Text>
        </Pressable>
      ))}
      {selected && (
        <View style={[styles.card, { backgroundColor: c.card }]}>
          <Text style={[styles.sectionTitle, { color: c.foreground }]}>Mensaje (opcional)</Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: c.background, color: c.foreground, borderColor: c.border }]}
            placeholder="Mensaje para el email de certificación"
            placeholderTextColor={c.mutedForeground}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={3}
          />
          <Pressable
            style={[styles.sendBtn, { backgroundColor: c.primary }]}
            onPress={sendCertification}
            disabled={sending}
          >
            <Text style={[styles.sendBtnText, { color: c.primaryForeground }]}>
              {sending ? 'Enviando…' : 'Enviar confirmación de certificación'}
            </Text>
          </Pressable>
        </View>
      )}
      <View style={styles.bottomPad} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { padding: 16, borderRadius: 12, marginBottom: 12 },
  label: { fontSize: 12, marginBottom: 4 },
  value: { fontSize: 24, fontWeight: '700' },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  row: { padding: 14, borderRadius: 12, marginBottom: 8 },
  rowTitle: { fontSize: 16, fontWeight: '600' },
  rowMeta: { fontSize: 12, marginTop: 2 },
  textArea: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 16, minHeight: 80, marginBottom: 12 },
  sendBtn: { padding: 14, borderRadius: 12 },
  sendBtnText: { fontSize: 16, fontWeight: '600', color: '#fff', textAlign: 'center' },
  bottomPad: { height: 24 },
});
