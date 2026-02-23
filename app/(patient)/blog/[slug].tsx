import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, Share } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function BlogPostScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const colorScheme = useColorScheme();
  const c = colorScheme === 'dark' ? Colors.dark : Colors.light;

  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
        let data: any = null;
        if (isUuid) {
          const res = await supabase
            .from('blog_posts')
            .select('*')
            .eq('id', slug)
            .eq('status', 'published')
            .maybeSingle();
          data = res.data;
        }
        if (!data) {
          const res = await supabase
            .from('blog_posts')
            .select('*')
            .eq('slug', slug)
            .eq('status', 'published')
            .maybeSingle();
          data = res.data;
        }
        setPost(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  if (!post) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Text style={[styles.error, { color: c.foreground }]}>Artículo no encontrado</Text>
      </View>
    );
  }

  const displayDate = post.published_at || post.created_at;
  const date = displayDate
    ? new Date(displayDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';
  const readingTime = post.content
    ? `${Math.max(1, Math.ceil(post.content.split(/\s+/).length / 200))} min de lectura`
    : '';

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${post.title || 'Artículo'} - Holistia`,
        title: post.title || 'Compartir',
      });
    } catch (e) {
      // User cancelled or error
    }
  };

  const plainContent = (post.content || post.excerpt || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.background }]} contentContainerStyle={styles.content}>
      {(post.featured_image || post.cover_image_url) ? (
        <Image source={{ uri: post.featured_image || post.cover_image_url }} style={styles.image} contentFit="cover" />
      ) : null}
      <Text style={[styles.title, { color: c.foreground }]}>{post.title || 'Sin título'}</Text>
      <View style={styles.metaRow}>
        <Text style={[styles.date, { color: c.mutedForeground }]}>{date}</Text>
        {readingTime ? (
          <Text style={[styles.readingTime, { color: c.mutedForeground }]}> · {readingTime}</Text>
        ) : null}
      </View>
      <Pressable onPress={handleShare} style={styles.shareBtn}>
        <MaterialIcons name="share" size={20} color={c.primary} />
        <Text style={[styles.shareText, { color: c.primary }]}>Compartir</Text>
      </Pressable>
      {post.excerpt ? (
        <Text style={[styles.excerpt, { color: c.mutedForeground }]}>{post.excerpt}</Text>
      ) : null}
      {post.content ? (
        <Text style={[styles.body, { color: c.foreground }]} selectable>
          {plainContent}
        </Text>
      ) : post.excerpt ? (
        <Text style={[styles.body, { color: c.foreground }]} selectable>
          {post.excerpt}
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: { fontSize: 16 },
  image: { width: '100%', height: 220 },
  title: { fontSize: 24, fontWeight: '700', padding: 20, paddingBottom: 8 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20 },
  date: { fontSize: 14 },
  readingTime: { fontSize: 14 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingTop: 8 },
  shareText: { fontSize: 14, fontWeight: '600' },
  excerpt: { fontSize: 15, fontStyle: 'italic', lineHeight: 22, padding: 20, paddingTop: 16, paddingBottom: 0 },
  body: { fontSize: 16, lineHeight: 26, padding: 20, paddingTop: 16 },
});
