import { Button } from '@/components/ui/button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { fetchPrivacy, updatePrivacy, type PrivacySettings } from '@/lib/privacy';
import { registerForPushNotifications, removePushToken } from '@/lib/push-notifications';
import { useAuthStore } from '@/stores/auth-store';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

const PROFILE_VISIBILITY_OPTIONS: { value: PrivacySettings['profile_visibility']; label: string }[] = [
  { value: 'public', label: 'Público - Todos pueden ver' },
  { value: 'followers', label: 'Solo seguidores' },
  { value: 'private', label: 'Privado - Nadie puede ver' },
];

const WHO_CAN_FOLLOW_OPTIONS: { value: PrivacySettings['who_can_follow']; label: string }[] = [
  { value: 'everyone', label: 'Cualquier persona' },
  { value: 'no_one', label: 'Nadie' },
];

const WHO_CAN_MESSAGE_OPTIONS: { value: PrivacySettings['who_can_message']; label: string }[] = [
  { value: 'everyone', label: 'Cualquier persona' },
  { value: 'followers', label: 'Solo seguidores' },
  { value: 'no_one', label: 'Nadie' },
];

const WHO_CAN_SEE_POSTS_OPTIONS: { value: PrivacySettings['who_can_see_posts']; label: string }[] = [
  { value: 'everyone', label: 'Cualquier persona' },
  { value: 'followers', label: 'Solo seguidores' },
  { value: 'private', label: 'Solo tú' },
];

const WHO_CAN_COMMENT_OPTIONS: { value: PrivacySettings['who_can_comment']; label: string }[] = [
  { value: 'everyone', label: 'Cualquier persona' },
  { value: 'followers', label: 'Solo seguidores' },
  { value: 'no_one', label: 'Nadie' },
];

function SelectRow({
  label,
  valueLabel,
  onPress,
  c,
}: {
  label: string;
  valueLabel: string;
  onPress: () => void;
  c: typeof Colors.light;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.selectRow, { borderColor: c.border }]}>
      <Text style={[styles.selectLabel, { color: c.foreground }]}>{label}</Text>
      <View style={styles.selectValueRow}>
        <Text style={[styles.selectValue, { color: c.mutedForeground }]} numberOfLines={1}>
          {valueLabel}
        </Text>
        <IconSymbol name="chevron.right" size={18} color={c.mutedForeground} />
      </View>
    </Pressable>
  );
}

function SwitchRow({
  label,
  value,
  onValueChange,
  c,
}: {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  c: typeof Colors.light;
}) {
  return (
    <View style={[styles.switchRow, { borderColor: c.border }]}>
      <Text style={[styles.switchLabel, { color: c.foreground }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: c.border, true: c.primary }}
        thumbColor="#fff"
      />
    </View>
  );
}

export default function PrivacyScreen() {
  const session = useAuthStore((s) => s.session);
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectKey, setSelectKey] = useState<string | null>(null);
  const colorScheme = useColorScheme();
  const c = colorScheme === 'dark' ? Colors.dark : Colors.light;

  useEffect(() => {
    if (!session) return;
    (async () => {
      try {
        const data = await fetchPrivacy(session);
        setSettings(data);
      } catch (e) {
        console.error('fetchPrivacy', e);
        Alert.alert('Error', e instanceof Error ? e.message : 'Error al cargar privacidad');
      } finally {
        setLoading(false);
      }
    })();
  }, [session]);

  const update = (key: keyof PrivacySettings, value: PrivacySettings[keyof PrivacySettings]) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  const handleSave = async () => {
    if (!session || !settings) return;
    setSaving(true);
    try {
      await updatePrivacy(session, settings);
      Alert.alert('Guardado', 'Configuración de privacidad guardada.');
    } catch (e) {
      console.error('updatePrivacy', e);
      Alert.alert('Error', e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  if (!settings) {
    return (
      <View style={[styles.centered, { backgroundColor: c.background }]}>
        <Text style={[styles.errorText, { color: c.mutedForeground }]}>
          No se pudo cargar la configuración
        </Text>
      </View>
    );
  }

  const getOptionLabel = (
    options: { value: string; label: string }[],
    value: string
  ) => options.find((o) => o.value === value)?.label ?? value;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.background }]}
      contentContainerStyle={styles.content}>
      <Text style={[styles.sectionTitle, { color: c.foreground }]}>
        Privacidad y seguridad
      </Text>
      <Text style={[styles.sectionSubtitle, { color: c.mutedForeground }]}>
        Controla quién puede ver tu información y cómo interactúan contigo
      </Text>

      {/* Visibilidad del perfil */}
      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={styles.cardHeader}>
          <MaterialIcons name="visibility" size={22} color={c.primary} />
          <Text style={[styles.cardTitle, { color: c.foreground }]}>Visibilidad del perfil</Text>
        </View>
        <Text style={[styles.cardDesc, { color: c.mutedForeground }]}>
          Controla quién puede ver tu perfil y su contenido
        </Text>
        <SelectRow
          label="Visibilidad general"
          valueLabel={getOptionLabel(PROFILE_VISIBILITY_OPTIONS, settings.profile_visibility)}
          onPress={() => setSelectKey('profile_visibility')}
          c={c}
        />
        <View style={styles.switchBlock}>
          <SwitchRow
            label="Mostrar retos"
            value={settings.show_challenges}
            onValueChange={(v) => update('show_challenges', v)}
            c={c}
          />
          <SwitchRow
            label="Mostrar estadísticas"
            value={settings.show_stats}
            onValueChange={(v) => update('show_stats', v)}
            c={c}
          />
          <SwitchRow
            label="Mostrar logros"
            value={settings.show_achievements}
            onValueChange={(v) => update('show_achievements', v)}
            c={c}
          />
          <SwitchRow
            label="Mostrar seguidores"
            value={settings.show_followers}
            onValueChange={(v) => update('show_followers', v)}
            c={c}
          />
          <SwitchRow
            label="Mostrar actividad reciente"
            value={settings.show_activity}
            onValueChange={(v) => update('show_activity', v)}
            c={c}
          />
        </View>
      </View>

      {/* Interacciones */}
      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={styles.cardHeader}>
          <MaterialIcons name="people" size={22} color={c.primary} />
          <Text style={[styles.cardTitle, { color: c.foreground }]}>Interacciones</Text>
        </View>
        <Text style={[styles.cardDesc, { color: c.mutedForeground }]}>
          Controla quién puede interactuar contigo
        </Text>
        <SelectRow
          label="Quién puede seguirte"
          valueLabel={getOptionLabel(WHO_CAN_FOLLOW_OPTIONS, settings.who_can_follow)}
          onPress={() => setSelectKey('who_can_follow')}
          c={c}
        />
        <SelectRow
          label="Quién puede enviarte mensajes"
          valueLabel={getOptionLabel(WHO_CAN_MESSAGE_OPTIONS, settings.who_can_message)}
          onPress={() => setSelectKey('who_can_message')}
          c={c}
        />
        <SelectRow
          label="Quién puede ver tus publicaciones"
          valueLabel={getOptionLabel(WHO_CAN_SEE_POSTS_OPTIONS, settings.who_can_see_posts)}
          onPress={() => setSelectKey('who_can_see_posts')}
          c={c}
        />
        <SelectRow
          label="Quién puede comentar"
          valueLabel={getOptionLabel(WHO_CAN_COMMENT_OPTIONS, settings.who_can_comment)}
          onPress={() => setSelectKey('who_can_comment')}
          c={c}
        />
      </View>

      {/* Notificaciones */}
      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={styles.cardHeader}>
          <MaterialIcons name="notifications" size={22} color={c.primary} />
          <Text style={[styles.cardTitle, { color: c.foreground }]}>Notificaciones</Text>
        </View>
        <Text style={[styles.cardDesc, { color: c.mutedForeground }]}>
          Controla qué notificaciones recibes
        </Text>
        <SwitchRow
          label="Notificaciones por email"
          value={settings.email_notifications}
          onValueChange={(v) => update('email_notifications', v)}
          c={c}
        />
        <SwitchRow
          label="Notificaciones push"
          value={settings.push_notifications}
          onValueChange={(v) => {
            update('push_notifications', v);
            if (session?.user?.id && Platform.OS !== 'web') {
              if (v) registerForPushNotifications(session.user.id).catch(() => { });
              else removePushToken(session.user.id).catch(() => { });
            }
          }}
          c={c}
        />
        <Text style={[styles.subBlockTitle, { color: c.foreground }]}>Notificarme cuando</Text>
        <SwitchRow
          label="Alguien me sigue"
          value={settings.notify_on_follow}
          onValueChange={(v) => update('notify_on_follow', v)}
          c={c}
        />
        <SwitchRow
          label="Alguien da like a mi publicación"
          value={settings.notify_on_like}
          onValueChange={(v) => update('notify_on_like', v)}
          c={c}
        />
        <SwitchRow
          label="Alguien comenta en mi publicación"
          value={settings.notify_on_comment}
          onValueChange={(v) => update('notify_on_comment', v)}
          c={c}
        />
        <SwitchRow
          label="Me invitan a un equipo"
          value={settings.notify_on_team_invite}
          onValueChange={(v) => update('notify_on_team_invite', v)}
          c={c}
        />
        <SwitchRow
          label="Hay actualizaciones en mis retos"
          value={settings.notify_on_challenge_update}
          onValueChange={(v) => update('notify_on_challenge_update', v)}
          c={c}
        />
      </View>

      {/* Búsqueda y descubrimiento */}
      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={styles.cardHeader}>
          <MaterialIcons name="search" size={22} color={c.primary} />
          <Text style={[styles.cardTitle, { color: c.foreground }]}>Búsqueda y descubrimiento</Text>
        </View>
        <Text style={[styles.cardDesc, { color: c.mutedForeground }]}>
          Controla cómo otros pueden encontrarte
        </Text>
        <SwitchRow
          label="Permitir búsqueda por email"
          value={settings.allow_search_by_email}
          onValueChange={(v) => update('allow_search_by_email', v)}
          c={c}
        />
        <SwitchRow
          label="Permitir búsqueda por nombre"
          value={settings.allow_search_by_name}
          onValueChange={(v) => update('allow_search_by_name', v)}
          c={c}
        />
        <SwitchRow
          label="Mostrar estado en línea"
          value={settings.show_online_status}
          onValueChange={(v) => update('show_online_status', v)}
          c={c}
        />
      </View>

      <Button
        title={saving ? 'Guardando...' : 'Guardar cambios'}
        onPress={handleSave}
        disabled={saving}
        style={styles.saveBtn}
      />

      {/* Modal selector */}
      <Modal
        visible={!!selectKey}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectKey(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setSelectKey(null)}>
          <Pressable
            style={[styles.modalContent, { backgroundColor: c.card, borderColor: c.border }]}
            onPress={(e) => e.stopPropagation()}>
            {selectKey === 'profile_visibility' && (
              <>
                <Text style={[styles.modalTitle, { color: c.foreground }]}>Visibilidad del perfil</Text>
                {PROFILE_VISIBILITY_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.value}
                    onPress={() => {
                      update('profile_visibility', opt.value);
                      setSelectKey(null);
                    }}
                    style={[styles.modalOption, { borderColor: c.border }]}>
                    <Text style={[styles.modalOptionText, { color: c.foreground }]}>{opt.label}</Text>
                    {settings.profile_visibility === opt.value && (
                      <MaterialIcons name="check" size={22} color={c.primary} />
                    )}
                  </Pressable>
                ))}
              </>
            )}
            {selectKey === 'who_can_follow' && (
              <>
                <Text style={[styles.modalTitle, { color: c.foreground }]}>Quién puede seguirte</Text>
                {WHO_CAN_FOLLOW_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.value}
                    onPress={() => {
                      update('who_can_follow', opt.value);
                      setSelectKey(null);
                    }}
                    style={[styles.modalOption, { borderColor: c.border }]}>
                    <Text style={[styles.modalOptionText, { color: c.foreground }]}>{opt.label}</Text>
                    {settings.who_can_follow === opt.value && (
                      <MaterialIcons name="check" size={22} color={c.primary} />
                    )}
                  </Pressable>
                ))}
              </>
            )}
            {selectKey === 'who_can_message' && (
              <>
                <Text style={[styles.modalTitle, { color: c.foreground }]}>Quién puede enviarte mensajes</Text>
                {WHO_CAN_MESSAGE_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.value}
                    onPress={() => {
                      update('who_can_message', opt.value);
                      setSelectKey(null);
                    }}
                    style={[styles.modalOption, { borderColor: c.border }]}>
                    <Text style={[styles.modalOptionText, { color: c.foreground }]}>{opt.label}</Text>
                    {settings.who_can_message === opt.value && (
                      <MaterialIcons name="check" size={22} color={c.primary} />
                    )}
                  </Pressable>
                ))}
              </>
            )}
            {selectKey === 'who_can_see_posts' && (
              <>
                <Text style={[styles.modalTitle, { color: c.foreground }]}>Quién puede ver tus publicaciones</Text>
                {WHO_CAN_SEE_POSTS_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.value}
                    onPress={() => {
                      update('who_can_see_posts', opt.value);
                      setSelectKey(null);
                    }}
                    style={[styles.modalOption, { borderColor: c.border }]}>
                    <Text style={[styles.modalOptionText, { color: c.foreground }]}>{opt.label}</Text>
                    {settings.who_can_see_posts === opt.value && (
                      <MaterialIcons name="check" size={22} color={c.primary} />
                    )}
                  </Pressable>
                ))}
              </>
            )}
            {selectKey === 'who_can_comment' && (
              <>
                <Text style={[styles.modalTitle, { color: c.foreground }]}>Quién puede comentar</Text>
                {WHO_CAN_COMMENT_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.value}
                    onPress={() => {
                      update('who_can_comment', opt.value);
                      setSelectKey(null);
                    }}
                    style={[styles.modalOption, { borderColor: c.border }]}>
                    <Text style={[styles.modalOptionText, { color: c.foreground }]}>{opt.label}</Text>
                    {settings.who_can_comment === opt.value && (
                      <MaterialIcons name="check" size={22} color={c.primary} />
                    )}
                  </Pressable>
                ))}
              </>
            )}
            <Pressable onPress={() => setSelectKey(null)} style={styles.modalClose}>
              <Text style={[styles.modalCloseText, { color: c.primary }]}>Cerrar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Expo Router options
PrivacyScreen.options = { title: 'Privacidad' };

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16 },
  sectionTitle: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  sectionSubtitle: { fontSize: 14, marginBottom: 20 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  cardTitle: { fontSize: 17, fontWeight: '600' },
  cardDesc: { fontSize: 13, marginBottom: 12 },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  selectLabel: { fontSize: 15, flex: 1 },
  selectValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  selectValue: { fontSize: 14, maxWidth: 180 },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  switchLabel: { fontSize: 15, flex: 1 },
  switchBlock: { marginTop: 4 },
  subBlockTitle: { fontSize: 14, fontWeight: '600', marginTop: 12, marginBottom: 4 },
  saveBtn: { marginTop: 8 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    maxHeight: '80%',
  },
  modalTitle: { fontSize: 17, fontWeight: '600', marginBottom: 12 },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  modalOptionText: { fontSize: 15 },
  modalClose: { marginTop: 16, alignItems: 'center' },
  modalCloseText: { fontSize: 16, fontWeight: '600' },
});
