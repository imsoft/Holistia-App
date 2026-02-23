import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, Alert, Linking } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { createEventCheckout, freeRegisterEvent } from '@/lib/checkout-api';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const colorScheme = useColorScheme();
  const c = colorScheme === 'dark' ? Colors.dark : Colors.light;

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const { data } = await supabase
          .from('events_workshops')
          .select('*, professional_applications(first_name, last_name)')
          .eq('id', id)
          .single();
        setEvent(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Text style={[styles.error, { color: c.foreground }]}>Evento no encontrado</Text>
      </View>
    );
  }

  const handleRegister = async () => {
    setRegistering(true);
    try {
      if (event.is_free) {
        const result = await freeRegisterEvent(event.id);
        if ('error' in result) {
          Alert.alert('Error', result.error);
          return;
        }
        Alert.alert('¡Listo!', result.message);
        return;
      }
      const price = typeof event.price === 'number' ? event.price : parseFloat(event.price) || 0;
      const result = await createEventCheckout(event.id, price);
      if ('error' in result) {
        Alert.alert('Error', result.error);
        return;
      }
      Linking.openURL(result.url);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo completar');
    } finally {
      setRegistering(false);
    }
  };

  const date = event.event_date
    ? new Date(event.event_date).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '';
  const prof = event.professional_applications || {};
  const profName = `${prof.first_name || ''} ${prof.last_name || ''}`.trim();

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.background }]} contentContainerStyle={styles.content}>
      {event.image_url ? (
        <Image source={{ uri: event.image_url }} style={styles.image} contentFit="cover" />
      ) : (
        <View style={[styles.imagePlaceholder, { backgroundColor: c.muted }]} />
      )}
      <Text style={[styles.title, { color: c.foreground }]}>{event.name || 'Evento'}</Text>
      {date ? <Text style={[styles.date, { color: c.primary }]}>{date}</Text> : null}
      {profName ? <Text style={[styles.author, { color: c.mutedForeground }]}>{profName}</Text> : null}
      {event.description ? (
        <Text style={[styles.desc, { color: c.foreground }]}>{event.description}</Text>
      ) : null}

      <View style={styles.registerSection}>
        <Pressable
          onPress={handleRegister}
          disabled={registering}
          style={({ pressed }) => [
            styles.registerBtn,
            { backgroundColor: c.primary },
            (pressed || registering) && styles.pressed,
          ]}>
          {registering ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={styles.registerBtnText}>
                {event.is_free ? 'Registrarse al evento' : 'Registrarse y pagar'}
              </Text>
              <Text style={[styles.registerHint, { color: c.mutedForeground }]}>
                {event.is_free ? 'Inscripción directa' : 'Pago seguro con tarjeta'}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: { fontSize: 16 },
  image: { width: '100%', height: 200 },
  imagePlaceholder: { width: '100%', height: 200 },
  title: { fontSize: 22, fontWeight: '700', padding: 20, paddingBottom: 8 },
  date: { fontSize: 16, paddingHorizontal: 20 },
  author: { fontSize: 14, paddingHorizontal: 20, paddingTop: 4 },
  desc: { fontSize: 15, lineHeight: 24, padding: 20, paddingTop: 16 },
  registerSection: { padding: 20, paddingTop: 24 },
  registerBtn: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  registerBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  registerHint: { fontSize: 12, marginTop: 6 },
  pressed: { opacity: 0.9 },
});
