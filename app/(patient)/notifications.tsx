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
import { Linking } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { EmptyState } from '@/components/ui/empty-state';

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  action_url: string | null;
  created_at: string;
};

export default function NotificationsScreen() {
  const session = useAuthStore((s) => s.session);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const pageSize = 20;
  const colorScheme = useColorScheme();
  const c = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const load = useCallback(
    async (opts?: { reset?: boolean; offset?: number }) => {
      if (!session?.user?.id) return;
      const reset = opts?.reset ?? false;
      let offset = opts?.offset;
      if (offset === undefined) {
        if (reset) offset = 0;
        else offset = notifications.length;
      }

      if (reset) setLoading(true);
      else setLoadingMore(true);

      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('id, type, title, message, is_read, action_url, created_at')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .range(offset, offset + pageSize - 1);

        if (error) throw error;

        const list = (data || []) as Notification[];
        setNotifications((prev) => (reset ? list : [...prev, ...list]));
        setHasMore(list.length === pageSize);
      } catch (e) {
        console.error('Notifications load error:', e);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [session?.user?.id]
  );

  useEffect(() => {
    if (session?.user?.id) load({ reset: true });
  }, [session?.user?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    load({ reset: true });
  };

  const markAsRead = async (n: Notification) => {
    if (n.is_read) return;
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', n.id)
        .eq('user_id', session?.user?.id);
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x))
      );
    } catch (e) {
      console.error('Mark as read error:', e);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.is_read);
    if (unread.length === 0) return;
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', session?.user?.id)
        .eq('is_read', false);
      setNotifications((prev) => prev.map((x) => ({ ...x, is_read: true })));
    } catch (e) {
      console.error('Mark all as read error:', e);
    }
  };

  /** Navega in-app o abre URL externa según action_url */
  const handlePress = (n: Notification) => {
    markAsRead(n);
    if (!n.action_url) return;
    const url = n.action_url.trim();
    if (url.startsWith('http://') || url.startsWith('https://')) {
      Linking.openURL(url);
      return;
    }
    const [path, query] = url.split('?');
    const params = query ? Object.fromEntries(new URLSearchParams(query)) : {};
    let route = path.startsWith('/') ? path : `/${path}`;
    if (route === '/explore/events') route = '/events';
    if (route === '/messages' && params.conversation) {
      router.push(`/(patient)/conversation/${params.conversation}` as any);
    } else if (route.startsWith('/appointments/') && route !== '/appointments') {
      const id = route.replace('/appointments/', '');
      if (id) router.push(`/(patient)/appointments/${id}` as any);
      else router.push(route as any);
    } else {
      router.push(route as any);
    }
  };

  const formatDate = (s: string) => {
    const d = new Date(s);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60 * 60 * 1000) return 'Hace un momento';
    if (diff < 24 * 60 * 60 * 1000) return 'Hoy';
    if (diff < 48 * 60 * 60 * 1000) return 'Ayer';
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  };

  const renderItem = ({ item }: { item: Notification }) => (
    <Pressable
      onPress={() => handlePress(item)}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: item.is_read ? c.card : c.card, borderColor: c.border },
        !item.is_read && [styles.unread, { borderLeftColor: c.primary }],
        pressed && styles.pressed,
      ]}>
      <View style={[styles.iconWrap, { backgroundColor: c.muted }]}>
        <IconSymbol name="bell.fill" size={20} color={c.primary} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.title, { color: c.foreground }]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={[styles.message, { color: c.mutedForeground }]} numberOfLines={2}>
          {item.message}
        </Text>
        <Text style={[styles.date, { color: c.mutedForeground }]}>{formatDate(item.created_at)}</Text>
      </View>
    </Pressable>
  );

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (!session?.user?.id) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <IconSymbol name="bell" size={48} color={c.mutedForeground} />
        <Text style={[styles.emptyText, { color: c.mutedForeground }]}>
          Inicia sesión para ver tus notificaciones
        </Text>
      </View>
    );
  }

  if (loading && notifications.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      {unreadCount > 0 && (
        <Pressable
          onPress={markAllAsRead}
          style={[styles.markAll, { borderColor: c.border }]}>
          <Text style={[styles.markAllText, { color: c.primary }]}>
            Marcar todas como leídas
          </Text>
        </Pressable>
      )}
      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />
        }
        onEndReached={() => {
          if (hasMore && !loadingMore) load({ offset: notifications.length });
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={c.primary} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon="notifications"
            title="No tienes notificaciones"
            subtitle="Te avisaremos cuando tengas nuevas actualizaciones."
            iconColor={c.mutedForeground}
            titleColor={c.foreground}
            subtitleColor={c.mutedForeground}
          />
        }
      />
    </View>
  );
}

NotificationsScreen.options = { title: 'Notificaciones' };

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 15 },
  markAll: {
    padding: 12,
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  markAllText: { fontSize: 14, fontWeight: '600' },
  list: { padding: 20, paddingBottom: 40 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    gap: 12,
  },
  unread: { borderLeftWidth: 4 },
  pressed: { opacity: 0.9 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { flex: 1 },
  title: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  message: { fontSize: 14, lineHeight: 20 },
  date: { fontSize: 12, marginTop: 6 },
  footerLoader: { paddingVertical: 20, alignItems: 'center' },
});
