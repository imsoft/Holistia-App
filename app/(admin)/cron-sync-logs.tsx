import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Switch,
  Alert,
} from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/stores/auth-store';
import { adminApiFetch } from '@/lib/admin-api';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

type CronSyncLogStatus = 'running' | 'completed' | 'error';

interface ProfessionalResult {
  userId: string;
  email: string;
  success: boolean;
  error?: string;
  created?: number;
  deleted?: number;
  diagnostics?: {
    totalFromGoogle: number;
    holistiaEvents: number;
    existingBlocks: number;
    afterFiltering: number;
  };
}

interface CronSyncLog {
  id: string;
  status: CronSyncLogStatus;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  total_profiles: number;
  successful_count: number;
  failed_count: number;
  results: ProfessionalResult[] | null;
  error_message: string | null;
}

const PAGE_SIZE = 15;

function formatDurationMs(ms: number | null): string {
  if (!ms) return 'N/A';
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  const remainder = ms % 1000;
  if (seconds < 60) return `${seconds}.${Math.floor(remainder / 100)}s`;
  const minutes = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${minutes}m ${s}s`;
}

function formatTimestamp(ts: string): string {
  return new Date(ts).toLocaleString('es-MX', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRelative(ts: string): string {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'hace un momento';
  if (diffMins < 60) return `hace ${diffMins} min`;
  if (diffHours < 24) return `hace ${diffHours} h`;
  if (diffDays < 7) return `hace ${diffDays} días`;
  return formatTimestamp(ts);
}

export default function AdminCronSyncLogsScreen() {
  const session = useAuthStore((s) => s.session);
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const [logs, setLogs] = useState<CronSyncLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [selectedLog, setSelectedLog] = useState<CronSyncLog | null>(null);

  const fetchLogs = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: PAGE_SIZE.toString(),
        offset: (page * PAGE_SIZE).toString(),
      });
      const res = await adminApiFetch(`/api/admin/cron-sync-logs?${params}`, session);
      const data = await res.json();

      if (!res.ok) {
        const msg = data.details || data.error || 'Error al cargar logs';
        throw new Error(msg);
      }

      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Error al cargar logs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => fetchLogs(), 30000);
    return () => clearInterval(id);
  }, [autoRefresh, fetchLogs]);

  const lastExecution = logs[0] || null;
  const last24h = logs.filter((l) => {
    const d = new Date(l.started_at);
    return d > new Date(Date.now() - 24 * 60 * 60 * 1000);
  }).length;
  const successRate =
    logs.length > 0
      ? Math.round((logs.filter((l) => l.status === 'completed').length / logs.length) * 100)
      : 0;
  const avgProfiles =
    logs.length > 0 ? Math.round(logs.reduce((s, l) => s + l.total_profiles, 0) / logs.length) : 0;

  const getStatusColor = (status: CronSyncLogStatus) => {
    if (status === 'running') return '#d97706';
    if (status === 'completed') return '#16a34a';
    return '#dc2626';
  };

  const getStatusLabel = (status: CronSyncLogStatus) => {
    if (status === 'running') return 'En proceso';
    if (status === 'completed') return 'Completado';
    return 'Error';
  };

  if (selectedLog) {
    return (
      <ScrollView
        style={[styles.container, { backgroundColor: c.background }]}
        contentContainerStyle={styles.content}
      >
        <Pressable
          onPress={() => setSelectedLog(null)}
          style={({ pressed }) => [styles.backRow, pressed && styles.pressed]}
        >
          <MaterialIcons name="arrow-back" size={24} color={c.primary} />
          <Text style={[styles.backText, { color: c.primary }]}>Volver a la lista</Text>
        </Pressable>

        <View style={[styles.card, { backgroundColor: c.card }]}>
          <Text style={[styles.cardTitle, { color: c.foreground }]}>Resumen de ejecución</Text>
          <View style={styles.detailGrid}>
            <Text style={[styles.detailLabel, { color: c.mutedForeground }]}>Estado</Text>
            <Text style={[styles.detailValue, { color: getStatusColor(selectedLog.status) }]}>
              {getStatusLabel(selectedLog.status)}
            </Text>
            <Text style={[styles.detailLabel, { color: c.mutedForeground }]}>Duración</Text>
            <Text style={[styles.detailValue, { color: c.foreground }]}>
              {formatDurationMs(selectedLog.duration_ms)}
            </Text>
            <Text style={[styles.detailLabel, { color: c.mutedForeground }]}>Profesionales</Text>
            <Text style={[styles.detailValue, { color: c.foreground }]}>
              {selectedLog.total_profiles}
            </Text>
            <Text style={[styles.detailLabel, { color: c.mutedForeground }]}>OK / Fallos</Text>
            <Text style={[styles.detailValue, { color: c.foreground }]}>
              {selectedLog.successful_count} / {selectedLog.failed_count}
            </Text>
          </View>
          {selectedLog.error_message && (
            <View style={[styles.errorBox, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
              <Text style={[styles.errorText, { color: '#991b1b' }]}>
                Error: {selectedLog.error_message}
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: c.card }]}>
          <Text style={[styles.cardTitle, { color: c.foreground }]}>
            Resultados por profesional ({selectedLog.results?.length || 0})
          </Text>
          {(!selectedLog.results || selectedLog.results.length === 0) && (
            <Text style={[styles.muted, { color: c.mutedForeground }]}>
              No hay resultados disponibles
            </Text>
          )}
          {selectedLog.results?.map((r, i) => (
            <View
              key={`${selectedLog.id}-${r.userId}`}
              style={[styles.resultRow, { borderColor: c.border }]}
            >
              <MaterialIcons
                name={r.success ? 'check-circle' : 'cancel'}
                size={20}
                color={r.success ? '#16a34a' : '#dc2626'}
              />
              <View style={styles.resultContent}>
                <Text style={[styles.resultEmail, { color: c.foreground }]}>{r.email}</Text>
                {r.success ? (
                  <Text style={[styles.muted, { color: c.mutedForeground }]}>
                    Creados: {r.created ?? 0} | Eliminados: {r.deleted ?? 0}
                  </Text>
                ) : (
                  <Text style={[styles.errorText, { color: '#dc2626' }]}>{r.error || 'Error'}</Text>
                )}
              </View>
            </View>
          ))}
        </View>
        <View style={styles.bottomPad} />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => fetchLogs(true)}
          tintColor={c.primary}
        />
      }
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.title, { color: c.foreground }]}>
            Logs de sincronización Google Calendar
          </Text>
          <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
            Historial de ejecuciones del cron (cada 30 min)
          </Text>
        </View>
        <View style={styles.switchRow}>
          <Switch
            value={autoRefresh}
            onValueChange={setAutoRefresh}
            trackColor={{ false: c.border, true: c.primary }}
            thumbColor="#fff"
          />
          <Text style={[styles.switchLabel, { color: c.foreground }]}>Auto (30s)</Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: c.card }]}>
          <MaterialIcons name="access-time" size={24} color={c.primary} />
          <View>
            <Text style={[styles.statLabel, { color: c.mutedForeground }]}>Última ejecución</Text>
            <Text style={[styles.statValue, { color: c.foreground }]}>
              {lastExecution ? formatRelative(lastExecution.started_at) : 'Sin datos'}
            </Text>
          </View>
        </View>
        <View style={[styles.statCard, { backgroundColor: c.card }]}>
          <MaterialIcons name="event" size={24} color="#9333ea" />
          <View>
            <Text style={[styles.statLabel, { color: c.mutedForeground }]}>Últimas 24h</Text>
            <Text style={[styles.statValue, { color: c.foreground }]}>{last24h}</Text>
          </View>
        </View>
        <View style={[styles.statCard, { backgroundColor: c.card }]}>
          <MaterialIcons name="trending-up" size={24} color="#16a34a" />
          <View>
            <Text style={[styles.statLabel, { color: c.mutedForeground }]}>Tasa éxito</Text>
            <Text style={[styles.statValue, { color: c.foreground }]}>{successRate}%</Text>
          </View>
        </View>
        <View style={[styles.statCard, { backgroundColor: c.card }]}>
          <MaterialIcons name="people" size={24} color="#ea580c" />
          <View>
            <Text style={[styles.statLabel, { color: c.mutedForeground }]}>Profesionales prom.</Text>
            <Text style={[styles.statValue, { color: c.foreground }]}>{avgProfiles}</Text>
          </View>
        </View>
      </View>

      {loading && logs.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      ) : logs.length === 0 ? (
        <View style={[styles.card, { backgroundColor: c.card }]}>
          <MaterialIcons name="info-outline" size={48} color={c.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: c.foreground }]}>Sin logs</Text>
          <Text style={[styles.muted, { color: c.mutedForeground }]}>
            Los logs aparecerán cuando el cron se ejecute
          </Text>
        </View>
      ) : (
        <>
          {logs.map((log) => (
            <Pressable
              key={log.id}
              onPress={() => setSelectedLog(log)}
              style={({ pressed }) => [
                styles.logCard,
                { backgroundColor: c.card },
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.logTop}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(log.status) + '20' }]}>
                  <Text style={{ color: getStatusColor(log.status), fontSize: 12, fontWeight: '600' }}>
                    {getStatusLabel(log.status)}
                  </Text>
                </View>
                <Text style={[styles.logDate, { color: c.mutedForeground }]}>
                  {formatTimestamp(log.started_at)}
                </Text>
                {log.duration_ms && (
                  <Text style={[styles.logMeta, { color: c.mutedForeground }]}>
                    {formatDurationMs(log.duration_ms)}
                  </Text>
                )}
              </View>
              <View style={styles.logStats}>
                <Text style={[styles.muted, { color: c.mutedForeground }]}>
                  Profesionales: <Text style={[styles.bold, { color: c.foreground }]}>{log.total_profiles}</Text>
                </Text>
                <Text style={[styles.muted, { color: '#16a34a' }]}>
                  OK: <Text style={styles.bold}>{log.successful_count}</Text>
                </Text>
                {log.failed_count > 0 && (
                  <Text style={[styles.muted, { color: '#dc2626' }]}>
                    Fallos: <Text style={styles.bold}>{log.failed_count}</Text>
                  </Text>
                )}
              </View>
              {log.error_message && (
                <Text style={[styles.errorText, { color: '#dc2626' }]} numberOfLines={1}>
                  {log.error_message}
                </Text>
              )}
              <MaterialIcons name="chevron-right" size={24} color={c.mutedForeground} />
            </Pressable>
          ))}

          {total > PAGE_SIZE && (
            <View style={styles.pagination}>
              <Text style={[styles.muted, { color: c.mutedForeground }]}>
                Página {page + 1} de {Math.ceil(total / PAGE_SIZE)} ({total} total)
              </Text>
              <View style={styles.paginationBtns}>
                <Pressable
                  onPress={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0 || loading}
                  style={[styles.pageBtn, { backgroundColor: c.card }]}
                >
                  <Text style={{ color: c.foreground }}>Anterior</Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    setPage((p) => Math.min(Math.ceil(total / PAGE_SIZE) - 1, p + 1))
                  }
                  disabled={page >= Math.ceil(total / PAGE_SIZE) - 1 || loading}
                  style={[styles.pageBtn, { backgroundColor: c.card }]}
                >
                  <Text style={{ color: c.foreground }}>Siguiente</Text>
                </Pressable>
              </View>
            </View>
          )}
        </>
      )}
      <View style={styles.bottomPad} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: '700' },
  subtitle: { fontSize: 13, marginTop: 4 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  switchLabel: { fontSize: 14 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  statCard: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
  },
  statLabel: { fontSize: 12 },
  statValue: { fontSize: 16, fontWeight: '700' },
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: '600', alignSelf: 'stretch' },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignSelf: 'stretch',
    gap: 8,
  },
  detailLabel: { fontSize: 12, width: '45%' },
  detailValue: { fontSize: 14, fontWeight: '600', width: '45%' },
  errorBox: { padding: 12, borderRadius: 8, borderWidth: 1, alignSelf: 'stretch' },
  errorText: { fontSize: 13 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  resultContent: { flex: 1 },
  resultEmail: { fontSize: 14, fontWeight: '500' },
  muted: { fontSize: 13 },
  bold: { fontWeight: '600' },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  backText: { fontSize: 16, fontWeight: '600' },
  pressed: { opacity: 0.8 },
  logCard: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  logTop: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    width: '100%',
  },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  logDate: { fontSize: 12 },
  logMeta: { fontSize: 12 },
  logStats: { flexDirection: 'row', gap: 12, marginTop: 6, flex: 1 },
  emptyTitle: { fontSize: 16, fontWeight: '600' },
  pagination: { marginTop: 16, gap: 12 },
  paginationBtns: { flexDirection: 'row', gap: 8 },
  pageBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
  bottomPad: { height: 24 },
});
