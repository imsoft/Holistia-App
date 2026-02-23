import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth-store';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { generateSlug, generateUniqueSlug } from '@/lib/slug-utils';

type Author = { id: string; name: string };

export default function AdminNewBlogPostScreen() {
  const session = useAuthStore((s) => s.session);
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const [authors, setAuthors] = useState<Author[]>([]);
  const [loadingAuthors, setLoadingAuthors] = useState(true);
  const [authorId, setAuthorId] = useState('');

  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [featuredImage, setFeaturedImage] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchAuthors = useCallback(async () => {
    try {
      setLoadingAuthors(true);
      const { data: { user: currentUser } } = await supabase.auth.getUser();

      const allAuthors: Author[] = [];

      const { data: adminProfiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .or('type.eq.admin,type.eq.Admin')
        .not('first_name', 'is', null)
        .not('last_name', 'is', null);

      if (adminProfiles?.length) {
        adminProfiles.forEach((p) => {
          const name = `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim();
          allAuthors.push({
            id: p.id,
            name: p.id === currentUser?.id ? `${name} (Tú - Admin)` : `${name} (Admin)`,
          });
        });
      }

      const { data: professionals } = await supabase
        .from('professional_applications')
        .select('user_id, first_name, last_name')
        .eq('status', 'approved')
        .not('first_name', 'is', null)
        .not('last_name', 'is', null);

      if (professionals?.length) {
        professionals.forEach((p) => {
          const name = `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim();
          allAuthors.push({ id: p.user_id, name: `${name} (Profesional)` });
        });
      }

      allAuthors.sort((a, b) => a.name.localeCompare(b.name));
      setAuthors(allAuthors);
      if (currentUser && !authorId) setAuthorId(currentUser.id);
    } catch (e) {
      console.error('Fetch authors:', e);
    } finally {
      setLoadingAuthors(false);
    }
  }, []);

  useEffect(() => {
    fetchAuthors();
  }, []);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = 'Título requerido';
    else if (title.trim().length < 3) e.title = 'Al menos 3 caracteres';
    if (!content.trim()) e.content = 'Contenido requerido';
    if (!authorId) e.author = 'Selecciona un autor';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!session?.user) {
      Alert.alert('Error', 'No estás autenticado.');
      return;
    }
    if (!validate()) return;

    setLoading(true);
    try {
      const baseSlug = generateSlug(title.trim()) || 'post';
      const slug = await generateUniqueSlug(baseSlug, null, supabase);

      const contentHtml = content.trim()
        .split(/\n\n+/)
        .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
        .join('');

      const payload = {
        title: title.trim(),
        slug,
        excerpt: excerpt.trim() || null,
        content: contentHtml,
        status,
        author_id: authorId,
        published_at: status === 'published' ? new Date().toISOString() : null,
        featured_image: featuredImage.trim() || null,
      };

      const { data, error } = await supabase.from('blog_posts').insert(payload).select().single();
      if (error) throw error;
      Alert.alert('Éxito', 'Post creado.', [
        { text: 'OK', onPress: () => (router as any).push(`/(admin)/blog/${data.id}`) },
      ]);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? String((err as any).message) : 'No se pudo crear.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  if (loadingAuthors && authors.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
        <Text style={[styles.muted, { color: c.mutedForeground }]}>Cargando autores...</Text>
      </View>
    );
  }

  if (authors.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Text style={[styles.muted, { color: c.mutedForeground }]}>No hay autores disponibles.</Text>
        <Button title="Volver" onPress={() => router.back()} style={{ marginTop: 16 }} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={[styles.label, { color: c.foreground }]}>Autor *</Text>
        <View style={styles.authorList}>
          {authors.map((a) => {
            const selected = authorId === a.id;
            return (
              <Pressable
                key={a.id}
                onPress={() => setAuthorId(a.id)}
                style={[styles.authorCard, { backgroundColor: selected ? c.primary : c.card, borderColor: selected ? c.primary : c.border }]}
              >
                <Text style={[styles.authorName, { color: selected ? c.primaryForeground : c.foreground }]} numberOfLines={1}>
                  {a.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {errors.author ? <Text style={[styles.errorText, { color: '#dc2626' }]}>{errors.author}</Text> : null}

        <Input label="Título *" value={title} onChangeText={setTitle} placeholder="Título del post" error={errors.title} />
        <Input
          label="Extracto (opcional)"
          value={excerpt}
          onChangeText={setExcerpt}
          placeholder="Resumen breve..."
          multiline
          numberOfLines={3}
          style={styles.textArea}
        />
        <Input
          label="Contenido *"
          value={content}
          onChangeText={setContent}
          placeholder="Escribe el contenido del post..."
          multiline
          numberOfLines={8}
          style={[styles.textArea, styles.contentArea]}
          error={errors.content}
        />
        <Input
          label="URL imagen destacada (opcional)"
          value={featuredImage}
          onChangeText={setFeaturedImage}
          placeholder="https://..."
          keyboardType="url"
        />

        <Text style={[styles.label, { color: c.foreground }]}>Estado</Text>
        <View style={styles.optionRow}>
          <Button title="Borrador" variant={status === 'draft' ? 'primary' : 'outline'} onPress={() => setStatus('draft')} style={styles.optionBtn} />
          <Button title="Publicado" variant={status === 'published' ? 'primary' : 'outline'} onPress={() => setStatus('published')} style={styles.optionBtn} />
        </View>

        <View style={styles.actions}>
          <Button title="Cancelar" variant="outline" onPress={() => router.back()} style={styles.btn} />
          <Button title="Crear post" onPress={handleSubmit} loading={loading} style={styles.btn} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  muted: { fontSize: 15 },
  scroll: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 8 },
  authorList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  authorCard: { padding: 12, borderRadius: 10, borderWidth: 2, minWidth: 140 },
  authorName: { fontSize: 14, fontWeight: '600' },
  errorText: { fontSize: 12, marginBottom: 8 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  contentArea: { minHeight: 160 },
  optionRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  optionBtn: { flex: 1 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  btn: { flex: 1 },
});
