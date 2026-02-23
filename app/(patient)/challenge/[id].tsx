import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, Alert, Linking } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { useAuthStore } from '@/stores/auth-store';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { createChallengeCheckout } from '@/lib/checkout-api';

export default function ChallengeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useAuthStore((s) => s.session);
  const [challenge, setChallenge] = useState<any>(null);
  const [joined, setJoined] = useState(false);
  const [daysCompleted, setDaysCompleted] = useState(0);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const colorScheme = useColorScheme();
  const c = colorScheme === 'dark' ? Colors.dark : Colors.light;

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const { data } = await supabase
          .from('challenges')
          .select('*, professional_applications(first_name, last_name)')
          .eq('id', id)
          .single();
        setChallenge(data);
        if (data && session?.user?.id) {
          const { data: purchase } = await supabase
            .from('challenge_purchases')
            .select('id, days_completed')
            .eq('participant_id', session.user.id)
            .eq('challenge_id', id)
            .eq('access_granted', true)
            .maybeSingle();
          setJoined(!!purchase);
          setDaysCompleted(purchase?.days_completed ?? 0);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, session?.user?.id]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  if (!challenge) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Text style={[styles.error, { color: c.foreground }]}>Reto no encontrado</Text>
      </View>
    );
  }

  const prof = challenge.professional_applications || {};
  const profName = `${prof.first_name || ''} ${prof.last_name || ''}`.trim();
  const durationDays = challenge.duration_days ?? 0;

  const handleJoin = async () => {
    setJoining(true);
    try {
      const result = await createChallengeCheckout(challenge.id);
      if ('error' in result) {
        Alert.alert('Error', result.error);
        return;
      }
      if (result.success) {
        Alert.alert('¡Listo!', result.message ?? 'Te has unido al reto');
        return;
      }
      if (result.url) {
        Linking.openURL(result.url);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo completar');
    } finally {
      setJoining(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.background }]} contentContainerStyle={styles.content}>
      {challenge.cover_image_url ? (
        <Image source={{ uri: challenge.cover_image_url }} style={styles.image} contentFit="cover" />
      ) : (
        <View style={[styles.imagePlaceholder, { backgroundColor: c.muted }]} />
      )}
      <Text style={[styles.title, { color: c.foreground }]}>{challenge.title || 'Reto'}</Text>
      {challenge.duration_days ? (
        <Text style={[styles.meta, { color: c.primary }]}>{challenge.duration_days} días</Text>
      ) : null}
      {profName ? <Text style={[styles.author, { color: c.mutedForeground }]}>{profName}</Text> : null}
      {challenge.description ? (
        <Text style={[styles.desc, { color: c.foreground }]}>{challenge.description}</Text>
      ) : null}

      <View style={styles.joinSection}>
        {joined ? (
          <View style={[styles.joinedBadge, { backgroundColor: c.primary + '20', borderColor: c.primary }]}>
            <Text style={[styles.joinedText, { color: c.primary }]}>✓ Ya estás inscrito en este reto</Text>
            {durationDays > 0 && (
              <Text style={[styles.joinedProgress, { color: c.mutedForeground }]}>
                Progreso: {daysCompleted} / {durationDays} días
              </Text>
            )}
          </View>
        ) : (
          <Pressable
            onPress={handleJoin}
            disabled={joining}
            style={({ pressed }) => [
              styles.joinBtn,
              { backgroundColor: c.primary },
              (pressed || joining) && styles.pressed,
            ]}>
            {joining ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Text style={styles.joinBtnText}>Unirse al reto</Text>
                <Text style={[styles.joinHint, { color: c.mutedForeground }]}>
                  {challenge.price ? 'Pago seguro con tarjeta' : 'Inscripción directa'}
                </Text>
              </>
            )}
          </Pressable>
        )}
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
  meta: { fontSize: 16, paddingHorizontal: 20 },
  author: { fontSize: 14, paddingHorizontal: 20, paddingTop: 4 },
  desc: { fontSize: 15, lineHeight: 24, padding: 20, paddingTop: 16 },
  joinSection: { padding: 20, paddingTop: 24 },
  joinBtn: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  joinBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  joinHint: { fontSize: 12, marginTop: 6 },
  pressed: { opacity: 0.9 },
  joinedBadge: { padding: 20, borderRadius: 12, borderWidth: 2, alignItems: 'center' },
  joinedText: { fontSize: 16, fontWeight: '600' },
  joinedProgress: { fontSize: 14, marginTop: 8 },
});
