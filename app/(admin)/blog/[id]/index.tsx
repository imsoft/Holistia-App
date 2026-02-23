import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Image,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

type Post = {
  id: string;
  title: string | null;
  slug: string | null;
  excerpt: string | null;
  content: string | null;
  status: string | null;
  featured_image: string | null;
  author_id: string | null;
  published_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  author_name?: string;
};

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

export default function AdminBlogPostDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id as string;
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!id) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('id', id)
        .single();
      if (error || !data) {
        setPost(null);
        return;
      }
      let authorName = '—';
      if (data.author_id) {
        const { data: prof } = await supabase
          .from('professional_applications')
          .select('first_name, last_name')
          .eq('user_id', data.author_id)
          .maybeSingle();
        if (prof) {
          authorName = `${prof.first_name ?? ''} ${prof.last_name ?? ''}`.trim() || '—';
        } else {
          const { data: prof2 } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', data.author_id)
            .maybeSingle();
          if (prof2) authorName = `${prof2.first_name ?? ''} ${prof2.last_name ?? ''}`.trim() || '—';
        }
      }
      setPost({ ...data, author_name: authorName });
    } catch (e) {
      console.error('Load post error:', e);
      setPost(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !post) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }
  if (!post) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Text style={[styles.muted, { color: c.mutedForeground }]}>Post no encontrado</Text>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: c.primary }]}>
          <Text style={[styles.backBtnText, { color: c.primaryForeground }]}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  const contentPreview = post.content ? stripHtml(post.content).slice(0, 200) + (stripHtml(post.content).length > 200 ? '…' : '') : null;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.primary} />}
    >
      {post.featured_image ? (
        <Image source={{ uri: post.featured_image }} style={styles.hero} resizeMode="cover" />
      ) : null}
      <View style={[styles.card, { backgroundColor: c.card }]}>
        <Text style={[styles.title, { color: c.foreground }]}>{post.title ?? 'Sin título'}</Text>
        <View style={styles.badges}>
          <View
            style={[
              styles.badge,
              post.status === 'published' ? { backgroundColor: '#16a34a20' } : { backgroundColor: '#6b728020' },
            ]}
          >
            <Text style={[styles.badgeText, { color: post.status === 'published' ? '#16a34a' : '#6b7280' }]}>
              {post.status === 'published' ? 'Publicado' : 'Borrador'}
            </Text>
          </View>
          {post.published_at ? (
            <View style={[styles.badge, { backgroundColor: c.border }]}>
              <Text style={[styles.badgeText, { color: c.foreground }]}>
                {new Date(post.published_at).toLocaleDateString()}
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={[styles.label, { color: c.mutedForeground }]}>Autor</Text>
        <Text style={[styles.value, { color: c.foreground }]}>{post.author_name ?? '—'}</Text>
        {post.excerpt ? (
          <>
            <Text style={[styles.label, { color: c.mutedForeground }]}>Extracto</Text>
            <Text style={[styles.desc, { color: c.foreground }]}>{post.excerpt}</Text>
          </>
        ) : null}
        {contentPreview ? (
          <>
            <Text style={[styles.label, { color: c.mutedForeground }]}>Contenido (preview)</Text>
            <Text style={[styles.desc, { color: c.foreground }]}>{contentPreview}</Text>
          </>
        ) : null}
        <Pressable
          onPress={() => (router as any).push(`/(admin)/blog/${id}/edit`)}
          style={({ pressed }) => [styles.editBtn, { backgroundColor: c.primary }, pressed && styles.pressed]}
        >
          <MaterialIcons name="edit" size={20} color={c.primaryForeground} />
          <Text style={[styles.editBtnText, { color: c.primaryForeground }]}>Editar post</Text>
        </Pressable>
      </View>
      <View style={styles.bottomPad} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  hero: { width: '100%', height: 160, backgroundColor: '#e5e7eb' },
  card: { margin: 16, padding: 16, borderRadius: 12 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  badgeText: { fontSize: 14, fontWeight: '600' },
  label: { fontSize: 12, marginTop: 12, marginBottom: 4 },
  value: { fontSize: 16 },
  desc: { fontSize: 15, lineHeight: 22, marginTop: 4 },
  editBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 10, marginTop: 20 },
  editBtnText: { fontSize: 16, fontWeight: '600' },
  pressed: { opacity: 0.8 },
  backBtn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
  backBtnText: { fontSize: 16, fontWeight: '600' },
  muted: { fontSize: 15 },
  bottomPad: { height: 24 },
});
