import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { useAuthStore } from '@/stores/auth-store';
import { supabase } from '@/lib/supabase';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { EmptyState } from '@/components/ui/empty-state';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function FavoritesScreen() {
  const session = useAuthStore((s) => s.session);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const colorScheme = useColorScheme();
  const c = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const load = useCallback(async (isRefresh = false) => {
    if (!session?.user?.id) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data: favData } = await supabase
        .from('user_favorites')
        .select('professional_id')
        .eq('user_id', session.user.id);
      const profIds = (favData || []).map((f) => f.professional_id).filter(Boolean);
      if (profIds.length === 0) {
        setFavorites([]);
        return;
      }
      const { data: profs } = await supabase
        .from('professional_applications')
        .select('*')
        .in('id', profIds)
        .eq('status', 'approved')
        .eq('is_active', true);
      setFavorites(profs || []);
    } catch (e) {
      console.error('Favorites error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (session) load();
  }, [session?.user?.id]);

  const removeFavorite = async (professionalId: string) => {
    if (!session?.user?.id) return;
    await supabase
      .from('user_favorites')
      .delete()
      .eq('user_id', session.user.id)
      .eq('professional_id', professionalId);
    load(true);
  };

  const renderItem = ({ item }: { item: any }) => {
    const name = `${item.first_name || ''} ${item.last_name || ''}`.trim() || 'Profesional';
    const photo = item.profile_photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`;
    return (
      <Pressable
        onPress={() => router.push(`/(patient)/professional/${item.id}` as any)}
        style={({ pressed }) => [
          styles.row,
          { backgroundColor: c.card, borderColor: c.border },
          pressed && styles.pressed,
        ]}>
        <Image source={{ uri: photo }} style={styles.avatar} />
        <View style={styles.rowContent}>
          <Text style={[styles.name, { color: c.foreground }]}>{name}</Text>
          {item.profession ? (
            <Text style={[styles.profession, { color: c.mutedForeground }]}>{item.profession}</Text>
          ) : null}
        </View>
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            removeFavorite(item.id);
          }}
          style={({ pressed }) => [styles.removeBtn, pressed && styles.pressed]}
        >
          <IconSymbol name="heart.fill" size={20} color={c.destructive} />
          <Text style={[styles.removeLabel, { color: c.mutedForeground }]}>Quitar</Text>
        </Pressable>
      </Pressable>
    );
  };

  if (loading && favorites.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <FlatList
        data={favorites}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.primary} />}
        ListEmptyComponent={
          <EmptyState
            icon="favorite"
            title="No tienes favoritos"
            subtitle="Explora profesionales y marca el corazón para guardarlos aquí."
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

FavoritesScreen.options = { title: 'Favoritos' };

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 20, paddingBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  pressed: { opacity: 0.9 },
  avatar: { width: 56, height: 56, borderRadius: 28, marginRight: 12 },
  rowContent: { flex: 1 },
  removeBtn: { alignItems: 'center', padding: 8 },
  removeLabel: { fontSize: 11, marginTop: 2 },
  name: { fontSize: 16, fontWeight: '600' },
  profession: { fontSize: 14, marginTop: 2 },
});
