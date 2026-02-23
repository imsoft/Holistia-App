import { useCallback, useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Pressable,
  Switch,
  Alert,
  Linking,
  RefreshControl,
  Image,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Button } from '@/components/ui/button';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { API_BASE_URL } from '@/constants/auth';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

type Professional = {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  profession: string;
  city: string;
  state: string;
  biography?: string;
  is_active: boolean;
  specializations?: string[];
};

type Service = {
  id: string;
  name: string;
  description?: string;
  duration: number | null;
  cost: number | null;
  modality: string;
  type: string;
  isactive: boolean;
};

type TabId = 'basic' | 'services' | 'availability' | 'programs' | 'challenges' | 'events' | 'gallery' | 'settings';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'basic', label: 'Básico', icon: 'person' },
  { id: 'services', label: 'Servicios', icon: 'work' },
  { id: 'availability', label: 'Disponibilidad', icon: 'schedule' },
  { id: 'programs', label: 'Programas', icon: 'menu-book' },
  { id: 'challenges', label: 'Retos', icon: 'emoji-events' },
  { id: 'events', label: 'Eventos', icon: 'event' },
  { id: 'gallery', label: 'Galería', icon: 'photo-library' },
  { id: 'settings', label: 'Config', icon: 'settings' },
];

function formatPrice(n: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);
}

const MODALITY_LABELS: Record<string, string> = {
  presencial: 'Presencial',
  online: 'En línea',
  both: 'Presencial y en línea',
};

export default function AdminProfessionalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const [professional, setProfessional] = useState<Professional | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('basic');
  const [availabilityBlocks, setAvailabilityBlocks] = useState<any[]>([]);
  const [programs, setPrograms] = useState<{ id: string; title: string | null; price: number | null; is_active: boolean | null }[]>([]);
  const [challenges, setChallenges] = useState<{ id: string; title: string | null; is_active: boolean | null }[]>([]);
  const [events, setEvents] = useState<{ id: string; name: string | null; event_date: string | null; is_active: boolean | null }[]>([]);
  const [gallery, setGallery] = useState<string[]>([]);
  const [loadingTab, setLoadingTab] = useState(false);
  const [settingsData, setSettingsData] = useState<{
    status: string;
    is_verified: boolean;
    registration_fee_paid?: boolean;
    registration_fee_amount?: number;
    registration_fee_currency?: string;
    registration_fee_paid_at?: string;
    stripe_account_id?: string;
    stripe_account_status?: string;
    stripe_onboarding_completed?: boolean;
    stripe_charges_enabled?: boolean;
    stripe_payouts_enabled?: boolean;
    stripe_connected_at?: string;
    submitted_at?: string;
    reviewed_at?: string;
    review_notes?: string;
    terms_accepted?: boolean;
    privacy_accepted?: boolean;
  } | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  // Basic form
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [profession, setProfession] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [biography, setBiography] = useState('');
  const [isActive, setIsActive] = useState(true);

  const load = useCallback(async (isRefresh = false) => {
    if (!id) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { data: profData, error: profError } = await supabase
        .from('professional_applications')
        .select('id, user_id, first_name, last_name, email, profession, city, state, biography, is_active, specializations')
        .eq('id', id)
        .single();

      if (profError || !profData) {
        setProfessional(null);
        return;
      }

      let emailVal = profData.email || '';
      if (profData.user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', profData.user_id)
          .maybeSingle();
        if (profile?.email) emailVal = profile.email;
      }

      const prof: Professional = {
        ...profData,
        email: emailVal,
        first_name: profData.first_name || '',
        last_name: profData.last_name || '',
        profession: profData.profession || '',
        city: profData.city || '',
        state: profData.state || '',
        biography: profData.biography || '',
        is_active: profData.is_active ?? true,
      };
      setProfessional(prof);
      setFirstName(prof.first_name);
      setLastName(prof.last_name);
      setEmail(prof.email);
      setProfession(prof.profession);
      setCity(prof.city);
      setState(prof.state);
      setBiography(prof.biography || '');
      setIsActive(prof.is_active);

      const { data: svcData } = await supabase
        .from('professional_services')
        .select('id, name, description, duration, cost, modality, type, isactive')
        .eq('professional_id', id)
        .order('created_at', { ascending: false });
      setServices((svcData as Service[]) || []);
    } catch (e) {
      console.error('Load professional error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const loadTabData = useCallback(async (tab: TabId) => {
    if (!id) return;
    setLoadingTab(true);
    try {
      if (tab === 'availability') {
        const { data } = await supabase
          .from('availability_blocks')
          .select('*')
          .eq('professional_id', id)
          .order('start_date', { ascending: true })
          .order('start_time', { ascending: true });
        setAvailabilityBlocks((data ?? []).filter((b: any) => !b.is_external_event));
      } else if (tab === 'programs') {
        const { data } = await supabase
          .from('digital_products')
          .select('id, title, price, is_active')
          .eq('professional_id', id)
          .order('created_at', { ascending: false });
        setPrograms(data ?? []);
      } else if (tab === 'challenges') {
        const { data } = await supabase
          .from('challenges')
          .select('id, title, is_active')
          .eq('linked_professional_id', id)
          .order('created_at', { ascending: false });
        setChallenges(data ?? []);
      } else if (tab === 'events') {
        const { data } = await supabase
          .from('events_workshops')
          .select('id, name, event_date, is_active')
          .eq('professional_id', id)
          .order('event_date', { ascending: false });
        setEvents(data ?? []);
      } else if (tab === 'gallery') {
        const { data } = await supabase
          .from('professional_applications')
          .select('gallery')
          .eq('id', id)
          .single();
        setGallery(Array.isArray(data?.gallery) ? data.gallery : []);
      } else if (tab === 'settings') {
        const { data } = await supabase
          .from('professional_applications')
          .select('status, is_verified, registration_fee_paid, registration_fee_amount, registration_fee_currency, registration_fee_paid_at, stripe_account_id, stripe_account_status, stripe_onboarding_completed, stripe_charges_enabled, stripe_payouts_enabled, stripe_connected_at, submitted_at, reviewed_at, review_notes, terms_accepted, privacy_accepted')
          .eq('id', id)
          .single();
        if (data) {
          setSettingsData(data as any);
          setReviewNotes(data.review_notes || '');
        } else {
          setSettingsData(null);
        }
      }
    } catch (e) {
      console.error('Load tab:', tab, e);
    } finally {
      setLoadingTab(false);
    }
  }, [id]);

  useEffect(() => {
    if (activeTab && activeTab !== 'basic' && activeTab !== 'services') {
      loadTabData(activeTab);
    }
  }, [activeTab, loadTabData]);

  const handleSettingsToggle = async (field: 'is_active' | 'is_verified', value: boolean) => {
    if (!id) return;
    try {
      const { error } = await supabase
        .from('professional_applications')
        .update({ [field]: value })
        .eq('id', id);
      if (error) throw error;
      if (field === 'is_active') {
        setIsActive(value);
        setProfessional((p) => (p ? { ...p, is_active: value } : null));
      } else if (field === 'is_verified' && settingsData) {
        setSettingsData({ ...settingsData, is_verified: value });
      }
      Alert.alert('Éxito', field === 'is_active' ? (value ? 'Profesional visible' : 'Profesional oculto') : (value ? 'Profesional verificado' : 'Verificación removida'));
    } catch (e) {
      Alert.alert('Error', 'No se pudo actualizar');
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;
    try {
      const { error } = await supabase
        .from('professional_applications')
        .update({ status: newStatus })
        .eq('id', id);
      if (error) throw error;
      if (settingsData) setSettingsData({ ...settingsData, status: newStatus });
      Alert.alert('Éxito', 'Estado actualizado');
    } catch (e) {
      Alert.alert('Error', 'No se pudo actualizar el estado');
    }
  };

  const handleSaveReviewNotes = async () => {
    if (!id) return;
    setSavingNotes(true);
    try {
      const { error } = await supabase
        .from('professional_applications')
        .update({ review_notes: reviewNotes })
        .eq('id', id);
      if (error) throw error;
      if (settingsData) setSettingsData({ ...settingsData, review_notes: reviewNotes });
      Alert.alert('Éxito', 'Notas guardadas');
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleSaveBasic = async () => {
    if (!professional) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('professional_applications')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          profession: profession.trim(),
          city: city.trim(),
          state: state.trim(),
          biography: biography.trim() || null,
          is_active: isActive,
        })
        .eq('id', professional.id);

      if (error) throw error;
      setProfessional({
        ...professional,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        profession: profession.trim(),
        city: city.trim(),
        state: state.trim(),
        biography: biography.trim() || undefined,
        is_active: isActive,
      });
      Alert.alert('Éxito', 'Información guardada');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleService = async (serviceId: string, current: boolean) => {
    try {
      const { error } = await supabase
        .from('professional_services')
        .update({ isactive: !current })
        .eq('id', serviceId);
      if (error) throw error;
      setServices((prev) =>
        prev.map((s) => (s.id === serviceId ? { ...s, isactive: !current } : s))
      );
    } catch (e) {
      Alert.alert('Error', 'No se pudo actualizar el servicio');
    }
  };

  const openServiceEdit = (serviceId: string) => {
    router.push(`/(admin)/professionals/${id}/services/${serviceId}/edit`);
  };

  const openNewService = () => {
    router.push(`/(admin)/professionals/${id}/services/new`);
  };

  const openProfessionalInWeb = () => {
    Linking.openURL(`${API_BASE_URL}/admin/professionals/${id}`);
  };

  const openProgramInWeb = (programId: string) => {
    Linking.openURL(`${API_BASE_URL}/admin/digital-products/${programId}/edit?professional_id=${id}&from=list`);
  };

  const openNewProgramInWeb = () => {
    Linking.openURL(`${API_BASE_URL}/admin/digital-products/new?professional_id=${id}`);
  };

  const openChallengeInWeb = (challengeId: string) => {
    Linking.openURL(`${API_BASE_URL}/admin/challenges/${challengeId}/edit?professional_id=${id}`);
  };

  const openNewChallengeInWeb = () => {
    Linking.openURL(`${API_BASE_URL}/admin/challenges/new?professional_id=${id}`);
  };

  const openEventInWeb = (eventId: string) => {
    Linking.openURL(`${API_BASE_URL}/admin/events/${eventId}/edit`);
  };

  const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  function formatBlockDisplay(b: any): { line1: string; line2: string } {
    if (b.block_type === 'full_day') {
      const start = b.start_date ? String(b.start_date).slice(0, 10) : '';
      const end = b.end_date && b.end_date !== b.start_date ? String(b.end_date).slice(0, 10) : '';
      return { line1: b.title || 'Día bloqueado', line2: end ? `${start} → ${end}` : start };
    }
    if (b.block_type === 'time_range' && b.start_time && b.end_time) {
      const start = String(b.start_time).slice(0, 5);
      const end = String(b.end_time).slice(0, 5);
      const date = b.start_date ? String(b.start_date).slice(0, 10) : '';
      return { line1: b.title || `${start} - ${end}`, line2: date ? `${date} · ${start} - ${end}` : `${start} - ${end}` };
    }
    if (b.day_of_week != null) {
      const day = DAY_NAMES[b.day_of_week] ?? `Día ${b.day_of_week}`;
      const time = b.start_time && b.end_time ? `${String(b.start_time).slice(0, 5)} - ${String(b.end_time).slice(0, 5)}` : day;
      return { line1: b.title || day, line2: time };
    }
    return { line1: b.title || 'Bloqueo', line2: b.start_date ? String(b.start_date).slice(0, 10) : '' };
  }

  if (loading && !professional) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  if (!professional) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Text style={[styles.muted, { color: c.mutedForeground }]}>Profesional no encontrado</Text>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: c.primary }]}>
          <Text style={[styles.backBtnText, { color: c.primaryForeground }]}>Volver</Text>
        </Pressable>
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
      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.tabScroll, { backgroundColor: c.card }]} contentContainerStyle={styles.tabRow}>
        {TABS.map((tab) => (
          <Pressable
            key={tab.id}
            onPress={() => setActiveTab(tab.id)}
            style={[
              styles.tab,
              activeTab === tab.id && { borderBottomColor: c.primary, borderBottomWidth: 2 },
            ]}
          >
            <MaterialIcons
              name={tab.icon as any}
              size={18}
              color={activeTab === tab.id ? c.primary : c.mutedForeground}
            />
            <Text
              style={[styles.tabLabel, { color: activeTab === tab.id ? c.primary : c.mutedForeground }]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {activeTab === 'basic' && (
        <View style={[styles.card, { backgroundColor: c.card }]}>
          <Text style={[styles.sectionTitle, { color: c.foreground }]}>Información básica</Text>
          <TextInput
            style={[styles.input, { backgroundColor: c.background, color: c.foreground }]}
            placeholder="Nombre"
            placeholderTextColor={c.mutedForeground}
            value={firstName}
            onChangeText={setFirstName}
          />
          <TextInput
            style={[styles.input, { backgroundColor: c.background, color: c.foreground }]}
            placeholder="Apellido"
            placeholderTextColor={c.mutedForeground}
            value={lastName}
            onChangeText={setLastName}
          />
          <TextInput
            style={[styles.input, { backgroundColor: c.background, color: c.foreground }]}
            placeholder="Email"
            placeholderTextColor={c.mutedForeground}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={[styles.input, { backgroundColor: c.background, color: c.foreground }]}
            placeholder="Profesión"
            placeholderTextColor={c.mutedForeground}
            value={profession}
            onChangeText={setProfession}
          />
          <TextInput
            style={[styles.input, { backgroundColor: c.background, color: c.foreground }]}
            placeholder="Ciudad"
            placeholderTextColor={c.mutedForeground}
            value={city}
            onChangeText={setCity}
          />
          <TextInput
            style={[styles.input, { backgroundColor: c.background, color: c.foreground }]}
            placeholder="Estado"
            placeholderTextColor={c.mutedForeground}
            value={state}
            onChangeText={setState}
          />
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: c.background, color: c.foreground }]}
            placeholder="Biografía"
            placeholderTextColor={c.mutedForeground}
            value={biography}
            onChangeText={setBiography}
            multiline
            numberOfLines={4}
          />
          <View style={styles.switchRow}>
            <Text style={[styles.label, { color: c.foreground }]}>Activo</Text>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: c.border, true: c.primary }}
              thumbColor="#fff"
            />
          </View>
          <Pressable
            onPress={handleSaveBasic}
            disabled={saving}
            style={[styles.saveBtn, { backgroundColor: c.primary }]}
          >
            {saving ? (
              <ActivityIndicator size="small" color={c.primaryForeground} />
            ) : (
              <Text style={[styles.saveBtnText, { color: c.primaryForeground }]}>Guardar cambios</Text>
            )}
          </Pressable>
        </View>
      )}

      {activeTab === 'services' && (
        <View style={[styles.card, { backgroundColor: c.card }]}>
          <View style={styles.servicesHeader}>
            <Text style={[styles.sectionTitle, { color: c.foreground }]}>Servicios</Text>
            <Pressable onPress={openNewService} style={[styles.webLink, { borderColor: c.primary }]}>
              <MaterialIcons name="add" size={20} color={c.primary} />
              <Text style={[styles.webLinkText, { color: c.primary }]}>Nuevo servicio</Text>
            </Pressable>
          </View>
          {services.length === 0 ? (
            <Text style={[styles.empty, { color: c.mutedForeground }]}>No hay servicios</Text>
          ) : (
            services.map((s) => (
              <View key={s.id} style={[styles.serviceRow, { borderColor: c.border }]}>
                <View style={styles.serviceInfo}>
                  <Text style={[styles.serviceName, { color: c.foreground }]}>{s.name}</Text>
                  <Text style={[styles.muted, { color: c.mutedForeground }]}>
                    {s.duration ? `${s.duration} min` : '—'} ·{' '}
                    {s.cost != null ? formatPrice(s.cost) : 'Cotización'} ·{' '}
                    {MODALITY_LABELS[s.modality] || s.modality}
                  </Text>
                </View>
                <View style={styles.serviceActions}>
                  <Switch
                    value={s.isactive}
                    onValueChange={() => handleToggleService(s.id, s.isactive)}
                    trackColor={{ false: c.border, true: c.primary }}
                    thumbColor="#fff"
                  />
                  <Pressable onPress={() => openServiceEdit(s.id)} style={styles.iconBtn}>
                    <MaterialIcons name="edit" size={20} color={c.primary} />
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {activeTab === 'availability' && (
        <View style={[styles.card, { backgroundColor: c.card }]}>
          <View style={styles.servicesHeader}>
            <Text style={[styles.sectionTitle, { color: c.foreground }]}>Disponibilidad</Text>
            <Pressable onPress={openProfessionalInWeb} style={[styles.webLink, { borderColor: c.primary }]}>
              <MaterialIcons name="open-in-new" size={18} color={c.primary} />
              <Text style={[styles.webLinkText, { color: c.primary }]}>Gestionar (web)</Text>
            </Pressable>
          </View>
          <Text style={[styles.hint, { color: c.mutedForeground }]}>Bloques de disponibilidad y bloqueos.</Text>
          {loadingTab ? (
            <ActivityIndicator size="small" color={c.primary} style={{ marginVertical: 16 }} />
          ) : availabilityBlocks.length === 0 ? (
            <Text style={[styles.empty, { color: c.mutedForeground }]}>No hay bloques</Text>
          ) : (
            availabilityBlocks.map((b) => {
              const { line1, line2 } = formatBlockDisplay(b);
              return (
                <View key={b.id} style={[styles.serviceRow, { borderColor: c.border }]}>
                  <View style={styles.serviceInfo}>
                    <Text style={[styles.serviceName, { color: c.foreground }]}>{line1}</Text>
                    <Text style={[styles.muted, { color: c.mutedForeground }]}>{line2}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      )}

      {activeTab === 'programs' && (
        <View style={[styles.card, { backgroundColor: c.card }]}>
          <View style={styles.servicesHeader}>
            <Text style={[styles.sectionTitle, { color: c.foreground }]}>Programas digitales</Text>
            <Pressable onPress={openNewProgramInWeb} style={[styles.webLink, { borderColor: c.primary }]}>
              <MaterialIcons name="add" size={18} color={c.primary} />
              <Text style={[styles.webLinkText, { color: c.primary }]}>Nuevo (web)</Text>
            </Pressable>
          </View>
          {loadingTab ? (
            <ActivityIndicator size="small" color={c.primary} style={{ marginVertical: 16 }} />
          ) : programs.length === 0 ? (
            <Text style={[styles.empty, { color: c.mutedForeground }]}>No hay programas</Text>
          ) : (
            programs.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => openProgramInWeb(p.id)}
                style={[styles.serviceRow, { borderColor: c.border }]}
              >
                <View style={styles.serviceInfo}>
                  <Text style={[styles.serviceName, { color: c.foreground }]}>{p.title ?? '—'}</Text>
                  <Text style={[styles.muted, { color: c.mutedForeground }]}>
                    {formatPrice(p.price ?? 0)} · {p.is_active ? 'Activo' : 'Inactivo'}
                  </Text>
                </View>
                <MaterialIcons name="open-in-new" size={20} color={c.primary} />
              </Pressable>
            ))
          )}
        </View>
      )}

      {activeTab === 'challenges' && (
        <View style={[styles.card, { backgroundColor: c.card }]}>
          <View style={styles.servicesHeader}>
            <Text style={[styles.sectionTitle, { color: c.foreground }]}>Retos</Text>
            <Pressable onPress={openNewChallengeInWeb} style={[styles.webLink, { borderColor: c.primary }]}>
              <MaterialIcons name="add" size={18} color={c.primary} />
              <Text style={[styles.webLinkText, { color: c.primary }]}>Nuevo (web)</Text>
            </Pressable>
          </View>
          {loadingTab ? (
            <ActivityIndicator size="small" color={c.primary} style={{ marginVertical: 16 }} />
          ) : challenges.length === 0 ? (
            <Text style={[styles.empty, { color: c.mutedForeground }]}>No hay retos</Text>
          ) : (
            challenges.map((ch) => (
              <Pressable
                key={ch.id}
                onPress={() => openChallengeInWeb(ch.id)}
                style={[styles.serviceRow, { borderColor: c.border }]}
              >
                <View style={styles.serviceInfo}>
                  <Text style={[styles.serviceName, { color: c.foreground }]}>{ch.title ?? '—'}</Text>
                  <Text style={[styles.muted, { color: c.mutedForeground }]}>{ch.is_active ? 'Activo' : 'Inactivo'}</Text>
                </View>
                <MaterialIcons name="open-in-new" size={20} color={c.primary} />
              </Pressable>
            ))
          )}
        </View>
      )}

      {activeTab === 'events' && (
        <View style={[styles.card, { backgroundColor: c.card }]}>
          <View style={styles.servicesHeader}>
            <Text style={[styles.sectionTitle, { color: c.foreground }]}>Eventos</Text>
            <Pressable onPress={openProfessionalInWeb} style={[styles.webLink, { borderColor: c.primary }]}>
              <MaterialIcons name="open-in-new" size={18} color={c.primary} />
              <Text style={[styles.webLinkText, { color: c.primary }]}>Gestionar (web)</Text>
            </Pressable>
          </View>
          {loadingTab ? (
            <ActivityIndicator size="small" color={c.primary} style={{ marginVertical: 16 }} />
          ) : events.length === 0 ? (
            <Text style={[styles.empty, { color: c.mutedForeground }]}>No hay eventos</Text>
          ) : (
            events.map((ev) => (
              <Pressable
                key={ev.id}
                onPress={() => openEventInWeb(ev.id)}
                style={[styles.serviceRow, { borderColor: c.border }]}
              >
                <View style={styles.serviceInfo}>
                  <Text style={[styles.serviceName, { color: c.foreground }]}>{ev.name ?? '—'}</Text>
                  <Text style={[styles.muted, { color: c.mutedForeground }]}>
                    {ev.event_date ? new Date(ev.event_date).toLocaleDateString() : '—'} · {ev.is_active ? 'Activo' : 'Inactivo'}
                  </Text>
                </View>
                <MaterialIcons name="open-in-new" size={20} color={c.primary} />
              </Pressable>
            ))
          )}
        </View>
      )}

      {activeTab === 'gallery' && (
        <View style={[styles.card, { backgroundColor: c.card }]}>
          <View style={styles.servicesHeader}>
            <Text style={[styles.sectionTitle, { color: c.foreground }]}>Galería</Text>
            <Pressable onPress={openProfessionalInWeb} style={[styles.webLink, { borderColor: c.primary }]}>
              <MaterialIcons name="open-in-new" size={18} color={c.primary} />
              <Text style={[styles.webLinkText, { color: c.primary }]}>Gestionar (web)</Text>
            </Pressable>
          </View>
          {loadingTab ? (
            <ActivityIndicator size="small" color={c.primary} style={{ marginVertical: 16 }} />
          ) : gallery.length === 0 ? (
            <Text style={[styles.empty, { color: c.mutedForeground }]}>No hay imágenes</Text>
          ) : (
            <View style={styles.galleryGrid}>
              {gallery.map((url, i) => (
                <Image key={i} source={{ uri: url }} style={styles.galleryThumb} />
              ))}
            </View>
          )}
        </View>
      )}

      {activeTab === 'settings' && (
        <View style={[styles.card, { backgroundColor: c.card }]}>
          <Text style={[styles.sectionTitle, { color: c.foreground }]}>Configuración</Text>
          {loadingTab ? (
            <ActivityIndicator size="small" color={c.primary} style={{ marginVertical: 16 }} />
          ) : settingsData ? (
            <>
              <Text style={[styles.label, { color: c.foreground }]}>Estado de aplicación</Text>
              <View style={[styles.optionRow, { flexWrap: 'wrap' }]}>
                {(['pending', 'approved', 'rejected', 'suspended'] as const).map((st) => (
                  <Button
                    key={st}
                    title={st === 'approved' ? 'Aprobado' : st === 'pending' ? 'Pendiente' : st === 'rejected' ? 'Rechazado' : 'Suspendido'}
                    variant={settingsData.status === st ? 'primary' : 'outline'}
                    onPress={() => handleStatusChange(st)}
                    style={[styles.optionBtn, { minWidth: 80 }]}
                  />
                ))}
              </View>
              <View style={[styles.settingsRow, { borderColor: c.border }]}>
                <View style={styles.settingsInfo}>
                  <Text style={[styles.serviceName, { color: c.foreground }]}>Visibilidad pública</Text>
                  <Text style={[styles.muted, { color: c.mutedForeground }]}>Aparece en listados y búsquedas</Text>
                </View>
                <Switch value={isActive} onValueChange={(v) => handleSettingsToggle('is_active', v)} trackColor={{ false: c.border, true: c.primary }} thumbColor="#fff" />
              </View>
              <View style={[styles.settingsRow, { borderColor: c.border }]}>
                <View style={styles.settingsInfo}>
                  <Text style={[styles.serviceName, { color: c.foreground }]}>Profesional verificado</Text>
                  <Text style={[styles.muted, { color: c.mutedForeground }]}>Insignia de verificación</Text>
                </View>
                <Switch value={settingsData.is_verified} onValueChange={(v) => handleSettingsToggle('is_verified', v)} trackColor={{ false: c.border, true: c.primary }} thumbColor="#fff" />
              </View>
              {settingsData.registration_fee_paid != null && (
                <>
                  <Text style={[styles.label, { color: c.foreground, marginTop: 16 }]}>Pago de inscripción</Text>
                  <View style={[styles.settingsRow, { borderColor: c.border }]}>
                    <Text style={[styles.muted, { color: c.mutedForeground }]}>Estado:</Text>
                    <Text style={[styles.serviceName, { color: c.foreground }]}>{settingsData.registration_fee_paid ? 'Pagado' : 'Pendiente'}</Text>
                  </View>
                  {settingsData.registration_fee_paid && settingsData.registration_fee_amount != null && (
                    <Text style={[styles.muted, { color: c.mutedForeground }]}>
                      ${settingsData.registration_fee_amount} {settingsData.registration_fee_currency?.toUpperCase() || 'MXN'}
                      {settingsData.registration_fee_paid_at ? ` · ${new Date(settingsData.registration_fee_paid_at).toLocaleDateString()}` : ''}
                    </Text>
                  )}
                </>
              )}
              {settingsData.stripe_account_id && (
                <>
                  <Text style={[styles.label, { color: c.foreground, marginTop: 16 }]}>Stripe Connect</Text>
                  <View style={[styles.settingsRow, { borderColor: c.border }]}>
                    <Text style={[styles.muted, { color: c.mutedForeground }]}>Estado:</Text>
                    <Text style={[styles.serviceName, { color: c.foreground }]}>{settingsData.stripe_account_status === 'connected' ? 'Conectado' : settingsData.stripe_account_status || '—'}</Text>
                  </View>
                  <Text style={[styles.muted, { color: c.mutedForeground, fontSize: 11 }]} numberOfLines={1}>ID: {settingsData.stripe_account_id}</Text>
                </>
              )}
              <Text style={[styles.label, { color: c.foreground, marginTop: 16 }]}>Notas de revisión</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: c.background, color: c.foreground }]}
                placeholder="Notas sobre la revisión..."
                placeholderTextColor={c.mutedForeground}
                value={reviewNotes}
                onChangeText={setReviewNotes}
                multiline
                numberOfLines={4}
              />
              <Button title={savingNotes ? 'Guardando...' : 'Guardar notas'} onPress={handleSaveReviewNotes} disabled={savingNotes} style={{ marginTop: 8 }} />
              {(settingsData.submitted_at || settingsData.reviewed_at) && (
                <Text style={[styles.muted, { color: c.mutedForeground, marginTop: 12 }]}>
                  {settingsData.submitted_at ? `Enviado: ${new Date(settingsData.submitted_at).toLocaleDateString()}` : ''}
                  {settingsData.reviewed_at ? ` · Revisado: ${new Date(settingsData.reviewed_at).toLocaleDateString()}` : ''}
                </Text>
              )}
              <View style={[styles.settingsRow, { borderColor: c.border, marginTop: 16 }]}>
                <Text style={[styles.muted, { color: c.mutedForeground }]}>Términos aceptados:</Text>
                <Text style={[styles.serviceName, { color: c.foreground }]}>{settingsData.terms_accepted ? 'Sí' : 'No'}</Text>
              </View>
              <View style={[styles.settingsRow, { borderColor: c.border }]}>
                <Text style={[styles.muted, { color: c.mutedForeground }]}>Privacidad aceptada:</Text>
                <Text style={[styles.serviceName, { color: c.foreground }]}>{settingsData.privacy_accepted ? 'Sí' : 'No'}</Text>
              </View>
            </>
          ) : (
            <Text style={[styles.empty, { color: c.mutedForeground }]}>No se pudo cargar</Text>
          )}
        </View>
      )}

      <View style={styles.bottomPad} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  tabScroll: { marginBottom: 8, borderRadius: 12 },
  tabRow: { flexDirection: 'row', padding: 4 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  tabLabel: { fontSize: 15, fontWeight: '600' },
  card: { padding: 16, borderRadius: 12, marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  textArea: { minHeight: 80 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  label: { fontSize: 16 },
  saveBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveBtnText: { fontSize: 16, fontWeight: '600' },
  servicesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  webLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  webLinkText: { fontSize: 14, fontWeight: '600' },
  hint: { fontSize: 13, marginBottom: 16 },
  empty: { textAlign: 'center', padding: 24 },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  serviceInfo: { flex: 1 },
  serviceName: { fontSize: 16, fontWeight: '600' },
  serviceActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBtn: { padding: 4 },
  muted: { fontSize: 13 },
  galleryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  galleryThumb: { width: 80, height: 80, borderRadius: 8, backgroundColor: '#e5e7eb' },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionBtn: { minWidth: 80 },
  settingsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1 },
  settingsInfo: { flex: 1 },
  backBtn: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
  backBtnText: { fontSize: 16, fontWeight: '600' },
  bottomPad: { height: 24 },
});
