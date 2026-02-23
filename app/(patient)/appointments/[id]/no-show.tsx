import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { supabase } from '@/lib/supabase';
import { webApiFetch } from '@/lib/web-api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function NoShowAppointmentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useAuthStore((s) => s.session);
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const [appointment, setAppointment] = useState<any>(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id || !session?.user?.id) return;
    (async () => {
      const { data } = await supabase.from('appointments').select('*').eq('id', id).eq('patient_id', session.user.id).single();
      setAppointment(data);
      setLoading(false);
    })();
  }, [id, session?.user?.id]);

  const handleSubmit = async () => {
    if (!session) return;
    setSubmitting(true);
    try {
      const res = await webApiFetch('/api/appointments/mark-no-show', session, {
        method: 'POST',
        body: JSON.stringify({
          appointmentId: id,
          markedBy: 'patient',
          noShowDescription: description.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      Alert.alert(
        'Inasistencia registrada',
        'Recibirás un crédito como compensación.',
        [{ text: 'OK', onPress: () => router.replace('/appointments') }]
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo registrar.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !appointment) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.background }]} contentContainerStyle={styles.content}>
      <Text style={[styles.description, { color: c.foreground }]}>
        Marca que el profesional no se presentó a la cita. Recibirás un crédito como compensación.
      </Text>
      <Input
        label="Descripción (opcional)"
        value={description}
        onChangeText={setDescription}
        placeholder="Describe qué sucedió..."
        multiline
        numberOfLines={3}
        style={styles.textArea}
      />
      <View style={styles.actions}>
        <Button title="Volver" variant="outline" onPress={() => router.back()} style={styles.btn} />
        <Button title="Confirmar inasistencia" onPress={handleSubmit} loading={submitting} style={styles.btn} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20 },
  description: { fontSize: 15, marginBottom: 20 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  btn: { flex: 1 },
});
