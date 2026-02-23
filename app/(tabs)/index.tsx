import { useEffect, useState, useCallback } from 'react';
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
import { Image } from 'expo-image';
import { useAuthStore } from '@/stores/auth-store';
import { fetchExploreData } from '@/lib/explore';
import { markExplored } from '@/lib/patient-onboarding';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { EmptyState } from '@/components/ui/empty-state';

function ProfessionalCard({
  item,
  onPress,
  textColor,
  cardBg,
  borderColor,
}: {
  item: any;
  onPress: () => void;
  textColor: string;
  cardBg: string;
  borderColor: string;
}) {
  const name = `${item.first_name || ''} ${item.last_name || ''}`.trim() || 'Profesional';
  const photo = item.profile_photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: cardBg, borderColor },
        pressed && styles.pressed,
      ]}>
      <Image source={{ uri: photo }} style={styles.cardImage} contentFit="cover" />
      <Text style={[styles.cardTitle, { color: textColor }]} numberOfLines={2}>
        {name}
      </Text>
      {item.profession ? (
        <Text style={[styles.cardSubtitle, { color: Colors.light.mutedForeground }]} numberOfLines={1}>
          {item.profession}
        </Text>
      ) : null}
    </Pressable>
  );
}

function EventCard({
  item,
  onPress,
  textColor,
  cardBg,
  borderColor,
}: {
  item: any;
  onPress: () => void;
  textColor: string;
  cardBg: string;
  borderColor: string;
}) {
  const date = item.event_date ? new Date(item.event_date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : '';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: cardBg, borderColor },
        pressed && styles.pressed,
      ]}>
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.cardImage} contentFit="cover" />
      ) : (
        <View style={[styles.cardImagePlaceholder, { backgroundColor: borderColor }]} />
      )}
      <Text style={[styles.cardTitle, { color: textColor }]} numberOfLines={2}>
        {item.name || 'Evento'}
      </Text>
      {date ? (
        <Text style={[styles.cardSubtitle, { color: Colors.light.mutedForeground }]}>{date}</Text>
      ) : null}
    </Pressable>
  );
}

function ChallengeCard({
  item,
  onPress,
  textColor,
  cardBg,
  borderColor,
}: {
  item: any;
  onPress: () => void;
  textColor: string;
  cardBg: string;
  borderColor: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: cardBg, borderColor },
        pressed && styles.pressed,
      ]}>
      {item.cover_image_url ? (
        <Image source={{ uri: item.cover_image_url }} style={styles.cardImage} contentFit="cover" />
      ) : (
        <View style={[styles.cardImagePlaceholder, { backgroundColor: borderColor }]} />
      )}
      <Text style={[styles.cardTitle, { color: textColor }]} numberOfLines={2}>
        {item.title || 'Reto'}
      </Text>
      {item.duration_days ? (
        <Text style={[styles.cardSubtitle, { color: Colors.light.mutedForeground }]}>
          {item.duration_days} días
        </Text>
      ) : null}
    </Pressable>
  );
}

function HolisticCenterCard({
  item,
  onPress,
  textColor,
  cardBg,
  borderColor,
}: {
  item: any;
  onPress: () => void;
  textColor: string;
  cardBg: string;
  borderColor: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: cardBg, borderColor },
        pressed && styles.pressed,
      ]}>
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.cardImage} contentFit="cover" />
      ) : (
        <View style={[styles.cardImagePlaceholder, { backgroundColor: borderColor }]} />
      )}
      <Text style={[styles.cardTitle, { color: textColor }]} numberOfLines={2}>
        {item.name || 'Centro holístico'}
      </Text>
      {item.city ? (
        <Text style={[styles.cardSubtitle, { color: Colors.light.mutedForeground }]} numberOfLines={1}>
          {item.city}
        </Text>
      ) : null}
    </Pressable>
  );
}

function RestaurantCard({
  item,
  onPress,
  textColor,
  cardBg,
  borderColor,
}: {
  item: any;
  onPress: () => void;
  textColor: string;
  cardBg: string;
  borderColor: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: cardBg, borderColor },
        pressed && styles.pressed,
      ]}>
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.cardImage} contentFit="cover" />
      ) : (
        <View style={[styles.cardImagePlaceholder, { backgroundColor: borderColor }]} />
      )}
      <Text style={[styles.cardTitle, { color: textColor }]} numberOfLines={2}>
        {item.name || 'Restaurante'}
      </Text>
      {item.cuisine_type ? (
        <Text style={[styles.cardSubtitle, { color: Colors.light.mutedForeground }]} numberOfLines={1}>
          {item.cuisine_type}
        </Text>
      ) : null}
    </Pressable>
  );
}

function ShopCard({
  item,
  onPress,
  textColor,
  cardBg,
  borderColor,
}: {
  item: any;
  onPress: () => void;
  textColor: string;
  cardBg: string;
  borderColor: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: cardBg, borderColor },
        pressed && styles.pressed,
      ]}>
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.cardImage} contentFit="cover" />
      ) : (
        <View style={[styles.cardImagePlaceholder, { backgroundColor: borderColor }]} />
      )}
      <Text style={[styles.cardTitle, { color: textColor }]} numberOfLines={2}>
        {item.name || 'Comercio'}
      </Text>
      {item.category ? (
        <Text style={[styles.cardSubtitle, { color: Colors.light.mutedForeground }]} numberOfLines={1}>
          {item.category}
        </Text>
      ) : null}
    </Pressable>
  );
}

function ProgramCard({
  item,
  onPress,
  textColor,
  cardBg,
  borderColor,
}: {
  item: any;
  onPress: () => void;
  textColor: string;
  cardBg: string;
  borderColor: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: cardBg, borderColor },
        pressed && styles.pressed,
      ]}>
      {item.cover_image_url ? (
        <Image source={{ uri: item.cover_image_url }} style={styles.cardImage} contentFit="cover" />
      ) : (
        <View style={[styles.cardImagePlaceholder, { backgroundColor: borderColor }]} />
      )}
      <Text style={[styles.cardTitle, { color: textColor }]} numberOfLines={2}>
        {item.title || 'Programa'}
      </Text>
      <Text style={[styles.cardSubtitle, { color: Colors.light.mutedForeground }]}>
        {item.price ? `$${item.price} MXN` : 'Gratis'}
      </Text>
    </Pressable>
  );
}

export default function ExploreScreen() {
  const session = useAuthStore((s) => s.session);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const colorScheme = useColorScheme();
  const c = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const d = await fetchExploreData();
      setData(d);
    } catch (e) {
      console.error('Error loading explore:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (session) load();
  }, [session, load]);

  useEffect(() => {
    markExplored();
  }, []);

  if (loading && !data) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  const professionals = data?.professionals || [];
  const events = data?.events || [];
  const challenges = data?.challenges || [];
  const programs = data?.digitalProducts || [];
  const holisticCenters = data?.holisticCenters || [];
  const restaurants = data?.restaurants || [];
  const shops = data?.shops || [];

  const slug = (s: string) => (s || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.background }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={c.primary} />
      }
      showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.foreground }]}>Explorar</Text>
        <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
          Descubre profesionales, eventos y retos
        </Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: c.foreground }]}>Especialidades</Text>
          <Pressable onPress={() => router.push('/(patient)/specialties' as any)}>
            <Text style={[styles.seeAll, { color: c.primary }]}>Ver todas</Text>
          </Pressable>
        </View>
        <Pressable
          onPress={() => router.push('/(patient)/specialties' as any)}
          style={({ pressed }) => [
            styles.specialtyBanner,
            { backgroundColor: c.card, borderColor: c.border },
            pressed && styles.pressed,
          ]}>
          <Text style={[styles.specialtyBannerText, { color: c.foreground }]}>
            Explora por especialidad y encuentra al profesional ideal
          </Text>
          <Text style={[styles.seeAll, { color: c.primary }]}>Explorar</Text>
        </Pressable>
      </View>

      {professionals.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.foreground }]}>Profesionales</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontal}>
            {professionals.slice(0, 10).map((p: any) => (
              <ProfessionalCard
                key={p.id}
                item={p}
                onPress={() => router.push(`/(patient)/professional/${p.id}` as any)}
                textColor={c.foreground}
                cardBg={c.card}
                borderColor={c.border}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {events.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: c.foreground }]}>Eventos</Text>
            <Pressable onPress={() => router.push('/(patient)/events' as any)}>
              <Text style={[styles.seeAll, { color: c.primary }]}>Ver todos</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontal}>
            {events.slice(0, 8).map((e: any) => (
              <EventCard
                key={e.id}
                item={e}
                onPress={() => router.push(`/(patient)/event/${e.id}` as any)}
                textColor={c.foreground}
                cardBg={c.card}
                borderColor={c.border}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {challenges.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: c.foreground }]}>Retos</Text>
            <Pressable onPress={() => router.push('/(patient)/challenges' as any)}>
              <Text style={[styles.seeAll, { color: c.primary }]}>Ver todos</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontal}>
            {challenges.slice(0, 8).map((ch: any) => (
              <ChallengeCard
                key={ch.id}
                item={ch}
                onPress={() => router.push(`/(patient)/challenge/${ch.id}` as any)}
                textColor={c.foreground}
                cardBg={c.card}
                borderColor={c.border}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {programs.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: c.foreground }]}>Programas</Text>
            <Pressable onPress={() => router.push('/(patient)/programs' as any)}>
              <Text style={[styles.seeAll, { color: c.primary }]}>Ver todos</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontal}>
            {programs.slice(0, 8).map((pr: any) => (
              <ProgramCard
                key={pr.id}
                item={pr}
                onPress={() => router.push(`/(patient)/program/${pr.id}` as any)}
                textColor={c.foreground}
                cardBg={c.card}
                borderColor={c.border}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {holisticCenters.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: c.foreground }]}>Centros holísticos</Text>
            <Pressable onPress={() => router.push('/(patient)/holistic-centers' as any)}>
              <Text style={[styles.seeAll, { color: c.primary }]}>Ver todos</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontal}>
            {holisticCenters.slice(0, 8).map((h: any) => (
              <HolisticCenterCard
                key={h.id}
                item={h}
                onPress={() => router.push(`/(patient)/holistic-center/${h.id}` as any)}
                textColor={c.foreground}
                cardBg={c.card}
                borderColor={c.border}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {restaurants.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: c.foreground }]}>Restaurantes</Text>
            <Pressable onPress={() => router.push('/(patient)/restaurants' as any)}>
              <Text style={[styles.seeAll, { color: c.primary }]}>Ver todos</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontal}>
            {restaurants.slice(0, 8).map((r: any) => (
              <RestaurantCard
                key={r.id}
                item={r}
                onPress={() => router.push(`/(patient)/restaurant/${r.id}` as any)}
                textColor={c.foreground}
                cardBg={c.card}
                borderColor={c.border}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {shops.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: c.foreground }]}>Comercios</Text>
            <Pressable onPress={() => router.push('/(patient)/shops' as any)}>
              <Text style={[styles.seeAll, { color: c.primary }]}>Ver todos</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontal}>
            {shops.slice(0, 8).map((s: any) => (
              <ShopCard
                key={s.id}
                item={s}
                onPress={() => router.push(`/(patient)/shop/${s.id}` as any)}
                textColor={c.foreground}
                cardBg={c.card}
                borderColor={c.border}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {(professionals.length === 0 && events.length === 0 && challenges.length === 0 && programs.length === 0 && holisticCenters.length === 0 && restaurants.length === 0 && shops.length === 0) && (
        <EmptyState
          icon="explore"
          title="No hay contenido disponible"
          subtitle="Explora el menú para descubrir profesionales, eventos y más."
          iconColor={c.mutedForeground}
          titleColor={c.foreground}
          subtitleColor={c.mutedForeground}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 15, marginTop: 4 },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '600' },
  seeAll: { fontSize: 14, fontWeight: '600' },
  specialtyBanner: {
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  specialtyBannerText: { flex: 1, fontSize: 14, marginRight: 12 },
  horizontal: { paddingLeft: 20 },
  card: {
    width: 140,
    marginRight: 12,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardImage: { width: '100%', height: 100 },
  cardImagePlaceholder: { width: '100%', height: 100 },
  cardTitle: { fontSize: 14, fontWeight: '600', padding: 10, paddingBottom: 2 },
  cardSubtitle: { fontSize: 12, paddingHorizontal: 10, paddingBottom: 10 },
  pressed: { opacity: 0.9 },
});
