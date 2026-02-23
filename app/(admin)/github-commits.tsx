import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Pressable } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/stores/auth-store';
import { adminApiJson } from '@/lib/admin-api';

type Commit = {
  sha?: string;
  commit?: { message?: string; author?: { name?: string; date?: string } };
};

export default function AdminGitHubCommitsScreen() {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const session = useAuthStore((s) => s.session);
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await adminApiJson<Commit[]>(
        '/api/github/commits?per_page=30',
        session
      );
      setCommits(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('GitHub commits load error:', e);
      setCommits([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session]);

  useEffect(() => {
    load();
  }, []);

  if (loading && commits.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.primary} />
      }
    >
      <Pressable style={[styles.refreshBtn, { backgroundColor: c.primary }]} onPress={() => load(true)}>
        <Text style={[styles.refreshBtnText, { color: c.primaryForeground }]}>Actualizar</Text>
      </Pressable>
      {commits.map((commit, i) => (
        <View key={commit.sha ?? i} style={[styles.row, { backgroundColor: c.card }]}>
          <Text style={[styles.rowMessage, { color: c.foreground }]} numberOfLines={2}>
            {commit.commit?.message ?? '—'}
          </Text>
          <Text style={[styles.rowMeta, { color: c.mutedForeground }]}>
            {commit.commit?.author?.name ?? '—'} · {commit.commit?.author?.date ? new Date(commit.commit.author.date).toLocaleString() : '—'}
          </Text>
        </View>
      ))}
      {commits.length === 0 && (
        <Text style={[styles.empty, { color: c.mutedForeground }]}>
          No se pudieron cargar los commits
        </Text>
      )}
      <View style={styles.bottomPad} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  refreshBtn: { padding: 14, borderRadius: 12, marginBottom: 16, alignItems: 'center' },
  refreshBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  row: { padding: 14, borderRadius: 12, marginBottom: 8 },
  rowMessage: { fontSize: 14, fontWeight: '500' },
  rowMeta: { fontSize: 12, marginTop: 4 },
  empty: { textAlign: 'center', padding: 24 },
  bottomPad: { height: 24 },
});
