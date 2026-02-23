import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useProfessionalStore } from '@/stores/professional-store';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { EmptyState } from '@/components/ui/empty-state';
import { Image } from 'expo-image';

type Conv = {
  id: string;
  other_name: string;
  other_avatar: string | null;
  last_message?: string;
  last_at?: string;
  unread_count: number;
};

export default function ExpertConsultationsScreen() {
  const professional = useProfessionalStore((s) => s.professional);
  const [convs, setConvs] = useState<Conv[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const colorScheme = useColorScheme();
  const c = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const load = useCallback(async (isRefresh = false) => {
    if (!professional) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data } = await supabase
        .from('direct_conversations')
        .select('id, user_id, last_message_preview, last_message_at, professional_unread_count')
        .eq('professional_id', professional.id)
        .order('last_message_at', { ascending: false });

      const list: Conv[] = [];
      const userIds = [...new Set((data || []).map((d: any) => d.user_id).filter(Boolean))];
      const { data: profiles } = userIds.length > 0
        ? await supabase.from('profiles').select('id, first_name, last_name, avatar_url').in('id', userIds)
        : { data: [] };
      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

      for (const dc of data || []) {
        const p = profileMap.get((dc as any).user_id);
        const name = p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Paciente' : 'Paciente';
        list.push({
          id: dc.id,
          other_name: name,
          other_avatar: p?.avatar_url || null,
          last_message: (dc as any).last_message_preview,
          last_at: (dc as any).last_message_at,
          unread_count: (dc as any).professional_unread_count || 0,
        });
      }
      setConvs(list);
    } catch (e) {
      console.error('Consultations load:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [professional?.id]);

  useEffect(() => {
    if (professional) load();
  }, [professional?.id]);

  useEffect(() => {
    if (!professional?.id) return;
    const channel = supabase
      .channel('consultations-list')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages' },
        () => load(true)
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'direct_conversations' },
        () => load(true)
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [professional?.id]);

  if (loading && convs.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.foreground }]}>Consultas</Text>
        <Text style={[styles.subtitle, { color: c.mutedForeground }]}>Mensajes con pacientes</Text>
      </View>
      <FlatList
        data={convs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.primary} />
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/(patient)/conversation/${item.id}` as any)}
            style={({ pressed }) => [
              styles.row,
              { backgroundColor: c.card, borderColor: c.border },
              pressed && styles.pressed,
            ]}>
            {item.other_avatar ? (
              <Image source={{ uri: item.other_avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: c.muted }]}>
                <Text style={[styles.avatarText, { color: c.foreground }]}>
                  {item.other_name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.rowContent}>
              <Text style={[styles.name, { color: c.foreground }]}>{item.other_name}</Text>
              <Text style={[styles.preview, { color: c.mutedForeground }]} numberOfLines={1}>
                {item.last_message || 'Sin mensajes'}
              </Text>
            </View>
            {item.unread_count > 0 && (
              <View style={[styles.badge, { backgroundColor: c.primary }]}>
                <Text style={styles.badgeText}>{item.unread_count}</Text>
              </View>
            )}
          </Pressable>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="chat"
            title="No hay conversaciones"
            subtitle="Cuando los pacientes te escriban, aparecerán aquí."
            iconColor={c.mutedForeground}
            titleColor={c.foreground}
            subtitleColor={c.mutedForeground}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 15, marginTop: 4 },
  list: { padding: 20, paddingBottom: 40 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  pressed: { opacity: 0.9 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 18, fontWeight: '600' },
  rowContent: { flex: 1, marginLeft: 12 },
  name: { fontSize: 16, fontWeight: '600' },
  preview: { fontSize: 14, marginTop: 2 },
  badge: { borderRadius: 12, minWidth: 24, height: 24, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});
