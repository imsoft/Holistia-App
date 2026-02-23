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

const TEMPLATES = [
  'confirmacion_cita_holistia',
  'confirmacion_cita_botones_holistia',
  'recordatorio_cita_holistia',
  'recordatorio_evento_holistia',
];

export default function AdminWhatsAppTestScreen() {
  const [phone, setPhone] = useState('');
  const [template, setTemplate] = useState(TEMPLATES[0]);
  const [loading, setLoading] = useState(false);
  const session = useAuthStore((s) => s.session);
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const send = async () => {
    const normalized = phone.replace(/\D/g, '').slice(-10);
    if (normalized.length < 10) {
      Alert.alert('Número inválido', 'Ingresa 10 dígitos (México).');
      return;
    }
    setLoading(true);
    try {
      const res = await adminApiFetch('/api/admin/test-whatsapp', session, {
        method: 'POST',
        body: JSON.stringify({
          phone: normalized,
          template,
          variables: {},
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || res.statusText);
      Alert.alert('Enviado', 'Mensaje de prueba enviado por Twilio.');
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
        Solo para pruebas internas. Los mensajes se envían por Twilio WhatsApp Business.
      </Text>
      <Text style={[styles.fieldLabel, { color: c.foreground }]}>Número (10 dígitos México)</Text>
      <TextInput
        style={[styles.input, { backgroundColor: c.card, color: c.foreground, borderColor: c.border }]}
        placeholder="Ej: 5512345678"
        placeholderTextColor={c.mutedForeground}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        maxLength={14}
      />
      <Text style={[styles.fieldLabel, { color: c.foreground }]}>Template</Text>
      <View style={styles.templateList}>
        {TEMPLATES.map((t) => (
          <Pressable
            key={t}
            style={[
              styles.templateBtn,
              { backgroundColor: template === t ? c.primary : c.card },
            ]}
            onPress={() => setTemplate(t)}
          >
            <Text
              style={[
                styles.templateBtnText,
                { color: template === t ? c.primaryForeground : c.foreground },
              ]}
              numberOfLines={1}
            >
              {t}
            </Text>
          </Pressable>
        ))}
      </View>
      <Pressable
        style={[styles.sendBtn, { backgroundColor: c.primary }]}
        onPress={send}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={c.primaryForeground} size="small" />
        ) : (
          <Text style={[styles.sendBtnText, { color: c.primaryForeground }]}>
            Enviar mensaje de prueba
          </Text>
        )}
      </Pressable>
      <View style={styles.bottomPad} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  label: { fontSize: 12, marginBottom: 12 },
  fieldLabel: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 16, marginBottom: 16 },
  templateList: { gap: 8, marginBottom: 16 },
  templateBtn: { padding: 12, borderRadius: 10 },
  templateBtnText: { fontSize: 14 },
  sendBtn: { padding: 14, borderRadius: 12, alignItems: 'center' },
  sendBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  bottomPad: { height: 24 },
});
