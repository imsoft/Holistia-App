import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Image,
  Linking,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  fetchSinglePost,
  fetchComments,
  addComment,
  deleteComment,
  fetchReactions,
  setReaction,
  removeReaction,
  REACTION_TYPES,
  REACTION_EMOJI,
  type CommentWithProfile,
  type ReactionType,
} from '@/lib/feed';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export default function FeedPostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useAuthStore((s) => s.session);
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const [post, setPost] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [reactions, setReactionsState] = useState<Record<string, { count: number }>>({});
  const [userReaction, setUserReaction] = useState<ReactionType | null>(null);
  const [reactionsTotal, setReactionsTotal] = useState(0);
  const [reactionPickerOpen, setReactionPickerOpen] = useState(false);
  const [comments, setComments] = useState<CommentWithProfile[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

  const loadPost = useCallback(async () => {
    if (!id || typeof id !== 'string') return;
    try {
      const data = await fetchSinglePost(id);
      setPost(data);
      if (data) {
        const r = await fetchReactions(id);
        setReactionsState(r.reactions);
        setUserReaction(r.userReaction);
        setReactionsTotal(r.totalCount);
      }
    } catch (e) {
      console.error('Error loading post:', e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadComments = useCallback(async () => {
    if (!id || typeof id !== 'string') return;
    setCommentsLoading(true);
    try {
      const data = await fetchComments(id);
      setComments(data);
    } catch (e) {
      console.error('Error loading comments:', e);
    } finally {
      setCommentsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadPost();
  }, [loadPost]);

  useEffect(() => {
    if (post && id) loadComments();
  }, [post, id, loadComments]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
        <Text style={[styles.muted, { color: c.mutedForeground }]}>Cargando...</Text>
      </View>
    );
  }

  if (!post) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Text style={[styles.title, { color: c.foreground }]}>Post no encontrado</Text>
        <Text style={[styles.muted, { color: c.mutedForeground, marginTop: 8 }]}>
          El post que buscas no existe o ya no está disponible.
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: c.primary, marginTop: 24 }]}>
          <Text style={[styles.backBtnText, { color: c.primaryForeground }]}>Volver al feed</Text>
        </Pressable>
      </View>
    );
  }

  const userName = [post.user_first_name, post.user_last_name].filter(Boolean).join(' ') || 'Usuario';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.background }]}
      contentContainerStyle={styles.content}>
      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={styles.postHeader}>
          <Text style={[styles.postUser, { color: c.foreground }]}>{userName}</Text>
          <Text style={[styles.postTime, { color: c.mutedForeground }]}>
            {post.checkin_time
              ? new Date(post.checkin_time).toLocaleDateString('es-MX', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })
              : ''}
          </Text>
        </View>
        {post.challenge_title ? (
          <View style={[styles.challengeBadge, { backgroundColor: `${c.primary}20` }]}>
            <MaterialIcons name="emoji-events" size={18} color={c.primary} />
            <Text style={[styles.challengeTitle, { color: c.primary }]}>{post.challenge_title}</Text>
          </View>
        ) : null}
        {post.notes ? (
          <Text style={[styles.notes, { color: c.foreground }]}>{post.notes}</Text>
        ) : null}
        {post.evidence_url ? (
          <View style={styles.evidenceSection}>
            <Text style={[styles.evidenceLabel, { color: c.mutedForeground }]}>Evidencia</Text>
            <Pressable
              onPress={() => Linking.openURL(post.evidence_url)}
              style={[styles.evidenceLink, { borderColor: c.border }]}>
              <MaterialIcons name="link" size={20} color={c.primary} />
              <Text style={[styles.evidenceLinkText, { color: c.primary }]}>Ver evidencia</Text>
              <MaterialIcons name="open-in-new" size={16} color={c.primary} />
            </Pressable>
          </View>
        ) : null}
        <View style={styles.postFooter}>
          <View style={styles.reactionsRow}>
            <Pressable
              onPress={() => setReactionPickerOpen(true)}
              style={({ pressed }) => [styles.reactionTrigger, pressed && { opacity: 0.8 }]}>
              <View style={styles.reactionSummary}>
                {userReaction ? (
                  <Text style={styles.reactionEmoji}>{REACTION_EMOJI[userReaction]}</Text>
                ) : (
                  <MaterialIcons name="add-reaction" size={22} color={c.mutedForeground} />
                )}
                <Text style={[styles.likes, { color: c.mutedForeground }]}>
                  {reactionsTotal > 0
                    ? `${reactionsTotal} reaccion${reactionsTotal !== 1 ? 'es' : ''}`
                    : 'Reaccionar'}
                </Text>
              </View>
              {Object.keys(reactions).length > 0 && (
                <View style={styles.reactionBadges}>
                  {Object.entries(reactions).map(([type, { count }]) => (
                    <Text key={type} style={styles.reactionBadge}>
                      {REACTION_EMOJI[type as ReactionType]} {count}
                    </Text>
                  ))}
                </View>
              )}
            </Pressable>
            <View style={[styles.statsRow, { marginLeft: 16 }]}>
              <MaterialIcons name="chat-bubble-outline" size={20} color={c.mutedForeground} />
              <Text style={[styles.likes, { color: c.mutedForeground }]}>
                {comments.length} {comments.length === 1 ? 'comentario' : 'comentarios'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <Modal
        visible={reactionPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setReactionPickerOpen(false)}>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setReactionPickerOpen(false)}>
          <View style={[styles.reactionPicker, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.reactionPickerTitle, { color: c.foreground }]}>
              Reaccionar
            </Text>
            <View style={styles.reactionPickerRow}>
              {REACTION_TYPES.map((type) => (
                <Pressable
                  key={type}
                  onPress={async () => {
                    try {
                      if (userReaction === type) {
                        await removeReaction(id!);
                        setUserReaction(null);
                        setReactionsTotal((prev) => Math.max(0, prev - 1));
                        const next = await fetchReactions(id!);
                        setReactionsState(next.reactions);
                      } else {
                        await setReaction(id!, type);
                        setUserReaction(type);
                        const next = await fetchReactions(id!);
                        setReactionsState(next.reactions);
                        setReactionsTotal(next.totalCount);
                      }
                      setReactionPickerOpen(false);
                    } catch (e) {
                      console.error('Reaction error:', e);
                    }
                  }}
                  style={[
                    styles.reactionPickerBtn,
                    { borderColor: c.border },
                    userReaction === type && { backgroundColor: c.muted },
                  ]}>
                  <Text style={styles.reactionPickerEmoji}>{REACTION_EMOJI[type]}</Text>
                </Pressable>
              ))}
            </View>
            {userReaction && (
              <Pressable
                onPress={async () => {
                  try {
                    await removeReaction(id!);
                    setUserReaction(null);
                    setReactionsTotal((prev) => Math.max(0, prev - 1));
                    const next = await fetchReactions(id!);
                    setReactionsState(next.reactions);
                    setReactionPickerOpen(false);
                  } catch (e) {
                    console.error('Remove reaction error:', e);
                  }
                }}
                style={[styles.removeReactionBtn, { borderColor: c.border }]}>
                <Text style={[styles.removeReactionText, { color: c.mutedForeground }]}>
                  Quitar reacción
                </Text>
              </Pressable>
            )}
          </View>
        </Pressable>
      </Modal>
      <View style={[styles.commentsSection, { borderTopColor: c.border }]}>
        <Text style={[styles.commentsTitle, { color: c.foreground }]}>Comentarios</Text>
        {commentsLoading ? (
          <ActivityIndicator size="small" color={c.primary} style={styles.commentsLoading} />
        ) : comments.length === 0 ? (
          <Text style={[styles.noComments, { color: c.mutedForeground }]}>
            Aún no hay comentarios. ¡Sé el primero!
          </Text>
        ) : (
          comments.map((comment) => {
            const name = [comment.profiles.first_name, comment.profiles.last_name]
              .filter(Boolean)
              .join(' ') || 'Usuario';
            const isOwn = session?.user?.id && comment.user_id === session.user.id;
            return (
              <View
                key={comment.id}
                style={[styles.commentRow, { borderBottomColor: c.border }]}>
                {comment.profiles.avatar_url ? (
                  <Image source={{ uri: comment.profiles.avatar_url }} style={styles.commentAvatar} />
                ) : (
                  <View style={[styles.commentAvatarPlaceholder, { backgroundColor: c.muted }]}>
                    <Text style={[styles.commentAvatarText, { color: c.mutedForeground }]}>
                      {name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.commentContent}>
                  <View style={styles.commentHeaderRow}>
                    <Text style={[styles.commentAuthor, { color: c.foreground }]}>{name}</Text>
                    {isOwn && (
                      <Pressable
                        onPress={() => {
                          Alert.alert(
                            'Eliminar comentario',
                            '¿Seguro que quieres eliminar este comentario?',
                            [
                              { text: 'Cancelar', style: 'cancel' },
                              {
                                text: 'Eliminar',
                                style: 'destructive',
                                onPress: async () => {
                                  try {
                                    await deleteComment(comment.id);
                                    setComments((prev) => prev.filter((x) => x.id !== comment.id));
                                  } catch (e: any) {
                                    Alert.alert('Error', e?.message ?? 'No se pudo eliminar');
                                  }
                                },
                              },
                            ]
                          );
                        }}
                        hitSlop={8}
                        style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
                        <Text style={[styles.deleteCommentText, { color: c.destructive }]}>
                          Eliminar
                        </Text>
                      </Pressable>
                    )}
                  </View>
                  <Text style={[styles.commentText, { color: c.foreground }]}>
                    {comment.comment_text}
                  </Text>
                  <Text style={[styles.commentTime, { color: c.mutedForeground }]}>
                    {new Date(comment.created_at).toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              </View>
            );
          })
        )}
        {post?.allow_comments !== false && (
          <View style={[styles.commentInputRow, { borderTopColor: c.border }]}>
            <TextInput
              style={[
                styles.commentInput,
                {
                  backgroundColor: c.muted,
                  color: c.foreground,
                  borderColor: c.border,
                },
              ]}
              placeholder="Escribe un comentario..."
              placeholderTextColor={c.mutedForeground}
              value={commentText}
              onChangeText={setCommentText}
              multiline
              maxLength={500}
              editable={!sendingComment}
            />
            <Pressable
              onPress={async () => {
                const text = commentText.trim();
                if (!text || sendingComment) return;
                setSendingComment(true);
                try {
                  const newComment = await addComment(id!, text);
                  setComments((prev) => [...prev, newComment]);
                  setCommentText('');
                } catch (e: any) {
                  Alert.alert('Error', e?.message ?? 'No se pudo enviar el comentario');
                } finally {
                  setSendingComment(false);
                }
              }}
              disabled={!commentText.trim() || sendingComment}
              style={[
                styles.sendCommentBtn,
                {
                  backgroundColor: commentText.trim() && !sendingComment ? c.primary : c.muted,
                  opacity: commentText.trim() && !sendingComment ? 1 : 0.6,
                },
              ]}>
              <MaterialIcons
                name="send"
                size={20}
                color={commentText.trim() && !sendingComment ? c.primaryForeground : c.mutedForeground}
              />
            </Pressable>
          </View>
        )}
      </View>
      <Pressable onPress={() => router.back()} style={[styles.backBtn, { borderColor: c.border }]}>
        <Text style={[styles.backBtnText, { color: c.foreground }]}>Volver al feed</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  content: { padding: 20, paddingBottom: 40 },
  muted: { fontSize: 15 },
  title: { fontSize: 20, fontWeight: '700' },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
  },
  postHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  postUser: { fontWeight: '600', fontSize: 17 },
  postTime: { fontSize: 13 },
  challengeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  challengeTitle: { fontSize: 14, fontWeight: '600' },
  notes: { fontSize: 16, lineHeight: 24, marginBottom: 16 },
  evidenceSection: { marginBottom: 16 },
  evidenceLabel: { fontSize: 12, marginBottom: 8 },
  evidenceLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  evidenceLinkText: { fontSize: 14, fontWeight: '600' },
  postFooter: {},
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reactionsRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  reactionTrigger: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reactionSummary: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reactionEmoji: { fontSize: 20 },
  reactionBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  reactionBadge: { fontSize: 13 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  reactionPicker: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  reactionPickerTitle: { fontSize: 16, fontWeight: '600', marginBottom: 16, textAlign: 'center' },
  reactionPickerRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  reactionPickerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionPickerEmoji: { fontSize: 24 },
  removeReactionBtn: {
    marginTop: 8,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  removeReactionText: { fontSize: 14 },
  likeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  likes: { fontSize: 14 },
  commentHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  deleteCommentText: { fontSize: 13, fontWeight: '600' },
  commentsSection: {
    borderTopWidth: 1,
    paddingTop: 16,
    marginTop: 8,
    marginBottom: 20,
  },
  commentsTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  commentsLoading: { marginVertical: 16 },
  noComments: { fontSize: 14, marginBottom: 16 },
  commentRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  commentAvatar: { width: 36, height: 36, borderRadius: 18 },
  commentAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentAvatarText: { fontSize: 16, fontWeight: '600' },
  commentContent: { flex: 1 },
  commentAuthor: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  commentText: { fontSize: 14, lineHeight: 20 },
  commentTime: { fontSize: 12, marginTop: 4 },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  commentInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 15,
  },
  sendCommentBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  backBtnText: { fontSize: 16, fontWeight: '600' },
});
