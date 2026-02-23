import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { fetchAdminDashboardData, type AdminDashboardStat } from '@/lib/admin-dashboard-data';
import { supabase } from '@/lib/supabase';
import { IconSymbol } from '@/components/ui/icon-symbol';

function StatCard({
  stat,
  onPress,
  colors,
}: {
  stat: AdminDashboardStat;
  onPress?: () => void;
  colors: { card: string; cardForeground: string; mutedForeground: string; primary: string; destructive: string };
}) {
  return (
    <Pressable
      style={[styles.statCard, { backgroundColor: colors.card }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <Text style={[styles.statTitle, { color: colors.mutedForeground }]} numberOfLines={1}>
        {stat.title}
      </Text>
      <Text style={[styles.statValue, { color: colors.cardForeground }]}>{stat.value}</Text>
      {stat.tertiaryText ? (
        <Text style={[styles.statTertiary, { color: colors.mutedForeground }]} numberOfLines={1}>
          {stat.tertiaryText}
        </Text>
      ) : null}
      {stat.trend ? (
        <Text
          style={[
            styles.trend,
            { color: stat.trend.positive ? colors.primary : colors.destructive },
          ]}
        >
          {stat.trend.value}
          {stat.secondaryText ? ` ${stat.secondaryText}` : ''}
        </Text>
      ) : null}
    </Pressable>
  );
}

export default function AdminDashboardScreen() {
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchAdminDashboardData>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const colorScheme = useColorScheme();
  const c = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const d = await fetchAdminDashboardData(supabase);
      setData(d);
    } catch (e) {
      console.error('Admin dashboard load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, []);

  const navigate = (route: string) => {
    (router as any).push(route);
  };

  if (loading && !data) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  const colors = {
    card: c.card,
    cardForeground: c.cardForeground,
    mutedForeground: c.mutedForeground,
    primary: c.primary,
    destructive: c.destructive,
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.primary} />
      }
    >
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: c.foreground }]}>
          Usuarios y Profesionales
        </Text>
        <View style={styles.grid}>
          {(data?.coreStats ?? []).map((stat) => (
            <StatCard
              key={stat.title}
              stat={stat}
              colors={colors}
              onPress={stat.route ? () => navigate(stat.route) : undefined}
            />
          ))}
        </View>
      </View>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: c.foreground }]}>
          Contenido de la plataforma
        </Text>
        <View style={styles.grid}>
          {(data?.contentStats ?? []).map((stat) => (
            <StatCard
              key={stat.title}
              stat={stat}
              colors={colors}
              onPress={stat.route ? () => navigate(stat.route) : undefined}
            />
          ))}
        </View>
      </View>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: c.foreground }]}>
          Negocios y empresas
        </Text>
        <View style={styles.grid}>
          {(data?.businessStats ?? []).map((stat) => (
            <StatCard
              key={stat.title}
              stat={stat}
              colors={colors}
              onPress={stat.route ? () => navigate(stat.route) : undefined}
            />
          ))}
        </View>
      </View>
      <Pressable
        style={[styles.button, { backgroundColor: c.primary }]}
        onPress={() => navigate('/(admin)/applications')}
      >
        <IconSymbol name="person.fill" size={20} color={c.primaryForeground} />
        <Text style={[styles.buttonText, { color: c.primaryForeground }]}>
          Revisar solicitudes
        </Text>
      </Pressable>
      <View style={styles.bottomPad} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: {
    width: '47%',
    minWidth: 140,
    padding: 14,
    borderRadius: 12,
  },
  statTitle: { fontSize: 12, marginBottom: 4 },
  statValue: { fontSize: 22, fontWeight: '700' },
  statTertiary: { fontSize: 11, marginTop: 4 },
  trend: { fontSize: 11, marginTop: 2, fontWeight: '600' },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  buttonText: { fontSize: 16, fontWeight: '600' },
  bottomPad: { height: 24 },
});
