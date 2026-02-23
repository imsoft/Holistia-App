import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { useAuthStore } from '@/stores/auth-store';
import { useProfessionalStore } from '@/stores/professional-store';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { EmptyState } from '@/components/ui/empty-state';
import { fetchConversations } from '@/lib/messages';
import { supabase } from '@/lib/supabase';

export default function MessagesScreen() {
  const session = useAuthStore((s) => s.session);
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const colorScheme = useColorScheme();
  const c = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const loadConversations = useCallback(async (isRefresh = false) => {
    if (!session) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const list = await fetchConversations();
      setConversations(list);
    } catch (e) {
      console.error('Messages error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (session) loadConversations();
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session) return;
    const channel = supabase
      .channel('messages-list')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'direct_messages' },
        () => loadConversations(true)
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'direct_conversations' },
        () => loadConversations(true)
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  const getUnreadCount = (item: any) => {
    const profId = item.professional?.id;
    const app = useProfessionalStore.getState().professional;
    if (app && profId === app.id) return (item.professional_unread_count ?? 0) as number;
    return (item.user_unread_count ?? 0) as number;
  };

  const renderItem = ({ item }: { item: any }) => {
    const prof = item.professional || {};
    const name = `${prof.first_name || ''} ${prof.last_name || ''}`.trim() || 'Profesional';
    const photo = prof.profile_photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`;
    const unread = getUnreadCount(item);

    return (
      <Pressable
        onPress={() => router.push(`/(patient)/conversation/${item.id}` as any)}
        style={({ pressed }) => [
          styles.row,
          { backgroundColor: c.card, borderColor: c.border },
          pressed && styles.pressed,
        ]}>
        <Image source={{ uri: photo }} style={styles.avatar} />
        <View style={[styles.rowContent, unread > 0 && styles.rowContentUnread]}>
          <Text style={[styles.name, { color: c.foreground }]}>{name}</Text>
          <Text style={[styles.preview, { color: c.mutedForeground }]} numberOfLines={1}>
            {item.last_message_preview?.trim() || 'Sin mensajes aún'}
          </Text>
        </View>
        {item.last_message_at ? (
          <Text style={[styles.time, { color: c.mutedForeground }]}>
            {formatMessageTime(item.last_message_at)}
          </Text>
        ) : null}
        {unread > 0 && (
          <View style={[styles.badge, { backgroundColor: c.primary }]}>
            <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
          </View>
        )}
      </Pressable>
    );
  };

  const formatMessageTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60 * 60 * 1000) return 'Ahora';
    if (diff < 24 * 60 * 60 * 1000) return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    if (diff < 7 * 24 * 60 * 60 * 1000) return d.toLocaleDateString('es-MX', { weekday: 'short' });
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  };

  if (loading && conversations.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.foreground }]}>Mensajes</Text>
        <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
          Tus conversaciones con profesionales
        </Text>
      </View>
      <FlatList
        data={conversations}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadConversations(true)} tintColor={c.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="chat"
            title="No tienes conversaciones"
            subtitle="Explora profesionales y envíales un mensaje para iniciar un chat."
            actionLabel="Explorar"
            onAction={() => router.push('/(tabs)' as any)}
            iconColor={c.mutedForeground}
            titleColor={c.foreground}
            subtitleColor={c.mutedForeground}
            buttonBgColor={c.primary}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 15, marginTop: 4 },
  list: { paddingHorizontal: 20, paddingBottom: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  pressed: { opacity: 0.9 },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
  rowContent: { flex: 1, minWidth: 0 },
  rowContentUnread: {},
  name: { fontSize: 16, fontWeight: '600' },
  preview: { fontSize: 14, marginTop: 2 },
  time: { fontSize: 11, marginLeft: 8 },
  badge: {
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    marginLeft: 8,
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});
