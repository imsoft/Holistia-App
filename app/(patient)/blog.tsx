import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { useAuthStore } from '@/stores/auth-store';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { EmptyState } from '@/components/ui/empty-state';

export default function BlogScreen() {
  const session = useAuthStore((s) => s.session);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const colorScheme = useColorScheme();
  const c = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data } = await supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, featured_image, published_at, created_at, author_id')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(50);
      setPosts(data || []);
    } catch (e) {
      console.error('Blog error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, []);

  const renderItem = ({ item }: { item: any }) => {
    const displayDate = item.published_at || item.created_at;
    const date = displayDate
      ? new Date(displayDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
      : '';
    return (
      <Pressable
        onPress={() => router.push(`/(patient)/blog/${item.slug || item.id}` as any)}
        style={({ pressed }) => [styles.card, { backgroundColor: c.card, borderColor: c.border }, pressed && styles.pressed]}>
        {(item.featured_image || item.cover_image_url) ? (
          <Image source={{ uri: item.featured_image || item.cover_image_url }} style={styles.cover} contentFit="cover" />
        ) : (
          <View style={[styles.cover, { backgroundColor: c.muted }]} />
        )}
        <Text style={[styles.title, { color: c.foreground }]} numberOfLines={2}>{item.title || 'Sin título'}</Text>
        {item.excerpt ? (
          <Text style={[styles.excerpt, { color: c.mutedForeground }]} numberOfLines={2}>{item.excerpt}</Text>
        ) : null}
        <Text style={[styles.date, { color: c.mutedForeground }]}>{date}</Text>
      </Pressable>
    );
  };

  if (loading && posts.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: c.foreground }]}>Blog</Text>
        <Text style={[styles.headerSubtitle, { color: c.mutedForeground }]}>
          Artículos sobre bienestar y salud holística
        </Text>
      </View>
      <FlatList
        data={posts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.primary} />}
        ListEmptyComponent={
          <EmptyState
            icon="article"
            title="No hay artículos publicados"
            subtitle="Pronto compartiremos contenido sobre bienestar y salud holística."
            iconColor={c.mutedForeground}
            titleColor={c.foreground}
            subtitleColor={c.mutedForeground}
          />
        }
      />
    </View>
  );
}

BlogScreen.options = { title: 'Blog' };

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, paddingBottom: 8 },
  headerTitle: { fontSize: 26, fontWeight: '700' },
  headerSubtitle: { fontSize: 14, marginTop: 4 },
  list: { padding: 20, paddingBottom: 40 },
  card: { borderRadius: 12, borderWidth: 1, marginBottom: 12, overflow: 'hidden' },
  pressed: { opacity: 0.9 },
  cover: { height: 160, width: '100%' },
  title: { fontSize: 17, fontWeight: '600', padding: 12 },
  excerpt: { fontSize: 14, paddingHorizontal: 12, lineHeight: 20 },
  date: { fontSize: 12, padding: 12, paddingTop: 4 },
});
