import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { useProfessionalStore } from '@/stores/professional-store';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ExpertProfileScreen() {
  const professional = useProfessionalStore((s) => s.professional);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  useEffect(() => {
    if (!professional) return;
    (async () => {
      try {
        const { data: d } = await supabase
          .from('professional_applications')
          .select('*')
          .eq('id', professional.id)
          .single();
        setData(d);
      } catch (e) {
        console.error('Profile load:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [professional?.id]);

  if (loading || !data) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  const photo = data.profile_photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(`${data.first_name} ${data.last_name}`.trim() || 'P')}`;

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.background }]} contentContainerStyle={styles.content}>
      <Image source={{ uri: photo }} style={styles.avatar} />
      <Text style={[styles.name, { color: c.foreground }]}>
        {data.first_name} {data.last_name}
      </Text>
      {data.profession && (
        <Text style={[styles.profession, { color: c.mutedForeground }]}>{data.profession}</Text>
      )}
      {data.biography && (
        <Text style={[styles.bio, { color: c.foreground }]}>{data.biography}</Text>
      )}
      <Pressable
        onPress={() => router.push('/(expert)/profile/edit' as any)}
        style={[styles.editBtn, { borderColor: c.primary }]}
      >
        <Text style={[styles.editBtnText, { color: c.primary }]}>Editar perfil</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, alignItems: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  avatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 16 },
  name: { fontSize: 22, fontWeight: '700' },
  profession: { fontSize: 15, marginTop: 4 },
  bio: { fontSize: 15, lineHeight: 22, marginTop: 16, textAlign: 'center' },
  editBtn: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    borderWidth: 1,
  },
  editBtnText: { fontSize: 16, fontWeight: '600' },
});
