import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Image } from 'expo-image';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useAuthStore } from '@/stores/auth-store';
import { supabase } from '@/lib/supabase';
import { getFollowStats, checkIsFollowing, toggleFollow, getFollowList, type FollowUser } from '@/lib/follows';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function UserProfileScreen() {
  const { id: userId } = useLocalSearchParams<{ id: string }>();
  const session = useAuthStore((s) => s.session);
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const [profile, setProfile] = useState<any | null>(null);
  const [professionalApp, setProfessionalApp] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [followStats, setFollowStats] = useState({ followers_count: 0, following_count: 0 });
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [followsModalOpen, setFollowsModalOpen] = useState(false);
  const [followsModalType, setFollowsModalType] = useState<'followers' | 'following'>('followers');
  const [followsList, setFollowsList] = useState<FollowUser[]>([]);
  const [followsListLoading, setFollowsListLoading] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, type, username, phone')
        .eq('id', userId)
        .single();

      if (profileError || !profileData) {
        setProfile(null);
        return;
      }
      setProfile(profileData);

      if (profileData?.type === 'professional') {
        const { data: proApp } = await supabase
          .from('professional_applications')
          .select('id, profile_photo')
          .eq('user_id', userId)
          .eq('status', 'approved')
          .maybeSingle();
        setProfessionalApp(proApp ?? null);
      } else {
        setProfessionalApp(null);
      }

      const stats = await getFollowStats(userId);
      setFollowStats(stats);

      if (session?.user?.id && session.user.id !== userId) {
        const following = await checkIsFollowing(session.user.id, userId);
        setIsFollowing(following);
      }

      setPostsLoading(true);
      const { data: checkins } = await supabase
        .from('social_feed_checkins')
        .select('*')
        .eq('user_id', userId)
        .order('checkin_time', { ascending: false })
        .limit(30);
      setPosts(checkins ?? []);
    } catch (e) {
      console.error('Profile load:', e);
      setProfile(null);
    } finally {
      setLoading(false);
      setPostsLoading(false);
    }
  }, [userId, session?.user?.id]);

  const openFollowsModal = useCallback(async (type: 'followers' | 'following') => {
    if (!userId) return;
    setFollowsModalType(type);
    setFollowsModalOpen(true);
    setFollowsListLoading(true);
    try {
      const list = await getFollowList(userId, type);
      setFollowsList(list);
    } catch (e) {
      console.error('Follow list load:', e);
      setFollowsList([]);
    } finally {
      setFollowsListLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const isOwnProfile = session?.user?.id === userId;
  const avatarUrl = professionalApp?.profile_photo || profile?.avatar_url;
  const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim() || 'Usuario';
  const typeLabel =
    profile?.type === 'professional'
      ? 'Profesional'
      : profile?.type === 'admin'
        ? 'Administrador'
        : 'Paciente';

  const handleMessage = () => {
    if (!professionalApp?.id) return;
    router.push(`/(patient)/professional/${professionalApp.id}` as any);
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Text style={[styles.error, { color: c.mutedForeground }]}>Usuario no encontrado</Text>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { borderColor: c.border }]}>
          <Text style={[styles.backBtnText, { color: c.foreground }]}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.background }]} contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.back()} style={styles.backRow}>
        <Text style={[styles.backText, { color: c.primary }]}>← Volver</Text>
      </Pressable>

      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={styles.avatarWrap}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: c.muted }]}>
              <Text style={[styles.initials, { color: c.mutedForeground }]}>
                {displayName
                  .split(' ')
                  .map((s) => s[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase() || '?'}
              </Text>
            </View>
          )}
        </View>
        {profile?.username ? (
          <Text style={[styles.username, { color: c.mutedForeground }]}>@{profile.username}</Text>
        ) : null}
        {isOwnProfile && profile?.phone ? (
          <Text style={[styles.phone, { color: c.mutedForeground }]}>{profile.phone}</Text>
        ) : null}
        <Text style={[styles.name, { color: c.foreground }]}>{displayName}</Text>
        <View style={[styles.badge, { backgroundColor: c.primary + '20', borderColor: c.primary }]}>
          <Text style={[styles.badgeText, { color: c.primary }]}>{typeLabel}</Text>
        </View>

        <View style={styles.statsRow}>
          <Pressable
            onPress={() => openFollowsModal('followers')}
            style={({ pressed }) => [styles.statBlock, pressed && { opacity: 0.7 }]}>
            <Text style={[styles.statNumber, { color: c.foreground }]}>{followStats.followers_count}</Text>
            <Text style={[styles.statLabel, { color: c.mutedForeground }]}>
              {followStats.followers_count === 1 ? 'seguidor' : 'seguidores'}
            </Text>
          </Pressable>
          <View style={[styles.statDivider, { backgroundColor: c.border }]} />
          <Pressable
            onPress={() => openFollowsModal('following')}
            style={({ pressed }) => [styles.statBlock, pressed && { opacity: 0.7 }]}>
            <Text style={[styles.statNumber, { color: c.foreground }]}>{followStats.following_count}</Text>
            <Text style={[styles.statLabel, { color: c.mutedForeground }]}>siguiendo</Text>
          </Pressable>
        </View>

        {!isOwnProfile && session?.user?.id && (
          <Pressable
            onPress={async () => {
              if (!userId || followLoading) return;
              setFollowLoading(true);
              try {
                const { following } = await toggleFollow(session.user.id, userId);
                setIsFollowing(following);
                const stats = await getFollowStats(userId);
                setFollowStats(stats);
              } catch (e: any) {
                Alert.alert('Error', e?.message ?? 'No se pudo actualizar.');
              } finally {
                setFollowLoading(false);
              }
            }}
            disabled={followLoading}
            style={({ pressed }) => [
              styles.followBtn,
              {
                backgroundColor: isFollowing ? c.muted : c.primary,
                borderColor: isFollowing ? c.border : c.primary,
              },
              (pressed || followLoading) && styles.pressed,
            ]}>
            {followLoading ? (
              <ActivityIndicator size="small" color={isFollowing ? c.foreground : '#fff'} />
            ) : (
              <>
                <MaterialIcons
                  name={isFollowing ? 'person-remove' : 'person-add'}
                  size={20}
                  color={isFollowing ? c.foreground : '#fff'}
                />
                <Text
                  style={[
                    styles.followBtnText,
                    { color: isFollowing ? c.foreground : '#fff' },
                  ]}>
                  {isFollowing ? 'Dejar de seguir' : 'Seguir'}
                </Text>
              </>
            )}
          </Pressable>
        )}

        {profile?.type === 'professional' && professionalApp && !isOwnProfile && (
          <Pressable
            onPress={handleMessage}
            style={({ pressed }) => [styles.msgBtn, { backgroundColor: c.primary }, pressed && styles.pressed]}>
            <Text style={styles.msgBtnText}>Ver perfil y reservar</Text>
          </Pressable>
        )}

        {isOwnProfile && (
          <>
            <Pressable
              onPress={() => router.push('/(patient)/profile-edit' as any)}
              style={({ pressed }) => [styles.editBtn, { borderColor: c.border }, pressed && styles.pressed]}>
              <Text style={[styles.editBtnText, { color: c.foreground }]}>Editar mi perfil</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/(patient)/privacy' as any)}
              style={({ pressed }) => [styles.editBtn, { borderColor: c.border, marginTop: 8 }, pressed && styles.pressed]}>
              <Text style={[styles.editBtnText, { color: c.foreground }]}>Privacidad</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/(patient)/profile-edit' as any)}
              style={({ pressed }) => [styles.deactivateLink, pressed && styles.pressed]}>
              <Text style={[styles.deactivateLinkText, { color: c.destructive }]}>Desactivar cuenta</Text>
            </Pressable>
          </>
        )}
      </View>

      <View style={[styles.postsSection, { borderColor: c.border }]}>
        <Text style={[styles.postsSectionTitle, { color: c.foreground }]}>Publicaciones</Text>
        {postsLoading ? (
          <ActivityIndicator size="small" color={c.primary} style={styles.postsLoading} />
        ) : posts.length === 0 ? (
          <Text style={[styles.postsEmpty, { color: c.mutedForeground }]}>
            {isOwnProfile ? 'Aún no tienes publicaciones públicas' : 'Este usuario no tiene publicaciones públicas'}
          </Text>
        ) : (
          posts.map((post) => (
            <Pressable
              key={post.checkin_id}
              onPress={() => router.push(`/(tabs)/feed/post/${post.checkin_id}` as any)}
              style={({ pressed }) => [
                styles.postRow,
                { backgroundColor: c.card, borderColor: c.border },
                pressed && styles.pressed,
              ]}>
              {post.notes ? (
                <Text style={[styles.postPreview, { color: c.foreground }]} numberOfLines={2}>{post.notes}</Text>
              ) : (
                <Text style={[styles.postPreview, { color: c.mutedForeground }]}>Publicación</Text>
              )}
              <Text style={[styles.postTime, { color: c.mutedForeground }]}>
                {post.checkin_time
                  ? new Date(post.checkin_time).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
                  : ''}
              </Text>
            </Pressable>
          ))
        )}
      </View>

      <Modal visible={followsModalOpen} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setFollowsModalOpen(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: c.card, borderColor: c.border }]} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.modalHeader, { borderBottomColor: c.border }]}>
              <Text style={[styles.modalTitle, { color: c.foreground }]}>
                {followsModalType === 'followers' ? 'Seguidores' : 'Siguiendo'}
              </Text>
              <Pressable onPress={() => setFollowsModalOpen(false)} hitSlop={12}>
                <MaterialIcons name="close" size={24} color={c.foreground} />
              </Pressable>
            </View>
            {followsListLoading ? (
              <ActivityIndicator size="large" color={c.primary} style={styles.modalLoader} />
            ) : followsList.length === 0 ? (
              <Text style={[styles.modalEmpty, { color: c.mutedForeground }]}>
                {followsModalType === 'followers' ? 'No tiene seguidores aún' : 'No sigue a nadie aún'}
              </Text>
            ) : (
              <FlatList
                data={followsList}
                keyExtractor={(item) => item.id}
                style={styles.modalList}
                renderItem={({ item }) => {
                  const name = [item.first_name, item.last_name].filter(Boolean).join(' ').trim() || 'Usuario';
                  const avatar = item.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`;
                  return (
                    <Pressable
                      onPress={() => {
                        setFollowsModalOpen(false);
                        router.push(`/(patient)/profile/${item.id}` as any);
                      }}
                      style={({ pressed }) => [styles.followRow, { borderBottomColor: c.border }, pressed && { opacity: 0.8 }]}>
                      <Image source={{ uri: avatar }} style={styles.followRowAvatar} />
                      <View style={styles.followRowBody}>
                        <Text style={[styles.followRowName, { color: c.foreground }]}>{name}</Text>
                        {item.username ? (
                          <Text style={[styles.followRowUsername, { color: c.mutedForeground }]}>@{item.username}</Text>
                        ) : null}
                      </View>
                      <MaterialIcons name="chevron-right" size={20} color={c.mutedForeground} />
                    </Pressable>
                  );
                }}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backRow: { marginBottom: 20 },
  backText: { fontSize: 16 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  avatarWrap: { marginBottom: 16 },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: { fontSize: 36, fontWeight: '600' },
  username: { fontSize: 14, marginBottom: 4 },
  phone: { fontSize: 14, marginBottom: 4 },
  name: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  badgeText: { fontSize: 14, fontWeight: '600' },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 24,
  },
  statBlock: { alignItems: 'center' },
  statNumber: { fontSize: 18, fontWeight: '700' },
  statLabel: { fontSize: 12, marginTop: 2 },
  statDivider: { width: 1, height: 28 },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    width: '100%',
    marginBottom: 12,
  },
  followBtnText: { fontSize: 15, fontWeight: '600' },
  msgBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  msgBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  deactivateLink: { marginTop: 8, paddingVertical: 8 },
  deactivateLinkText: { fontSize: 14, fontWeight: '600' },
  editBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    width: '100%',
    alignItems: 'center',
  },
  editBtnText: { fontSize: 16, fontWeight: '600' },
  pressed: { opacity: 0.9 },
  error: { fontSize: 16 },
  backBtn: { marginTop: 16, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10, borderWidth: 1 },
  backBtnText: { fontSize: 16 },
  postsSection: {
    marginTop: 24,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  postsSectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  postsLoading: { marginVertical: 24 },
  postsEmpty: { fontSize: 14, textAlign: 'center', paddingVertical: 24 },
  postRow: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  postPreview: { fontSize: 14, lineHeight: 20 },
  postTime: { fontSize: 12, marginTop: 6 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: '600' },
  modalLoader: { marginVertical: 32 },
  modalEmpty: { fontSize: 14, textAlign: 'center', padding: 24 },
  modalList: { maxHeight: 360 },
  followRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  followRowAvatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  followRowBody: { flex: 1 },
  followRowName: { fontSize: 16, fontWeight: '600' },
  followRowUsername: { fontSize: 13, marginTop: 2 },
});
