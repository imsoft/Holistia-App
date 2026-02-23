import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, TextInput } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { useProfessionalStore } from '@/stores/professional-store';
import { useAuthStore } from '@/stores/auth-store';
import { supabase } from '@/lib/supabase';
import { webApiFetch } from '@/lib/web-api';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

type StripeStatus = {
  connected: boolean;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
};

export default function ExpertSettingsScreen() {
  const professional = useProfessionalStore((s) => s.professional);
  const session = useAuthStore((s) => s.session);
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const [status, setStatus] = useState<StripeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [deactivateEmail, setDeactivateEmail] = useState('');
  const [deactivating, setDeactivating] = useState(false);

  const loadStatus = useCallback(async () => {
    if (!professional?.id || !session) return;
    setLoading(true);
    try {
      const res = await webApiFetch('/api/stripe/connect/account-status', session, {
        method: 'POST',
        body: JSON.stringify({ professional_id: professional.id }),
      });
      const data = await res.json();
      if (res.ok && data.connected) {
        setStatus({
          connected: true,
          charges_enabled: data.charges_enabled,
          payouts_enabled: data.payouts_enabled,
        });
      } else {
        setStatus({ connected: false });
      }
    } catch {
      setStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  }, [professional?.id, session]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleConnect = async () => {
    if (!professional?.id || !session) return;
    setActionLoading(true);
    try {
      const res = await webApiFetch('/api/stripe/connect/create-account', session, {
        method: 'POST',
        body: JSON.stringify({ professional_id: professional.id, entity_type: 'professional' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      if (data.onboardingUrl) {
        await WebBrowser.openBrowserAsync(data.onboardingUrl);
        Alert.alert(
          'Configuración de Stripe',
          'Cuando termines el proceso en el navegador, vuelve aquí y toca "Actualizar estado" para verificar tu cuenta.',
          [{ text: 'Entendido' }]
        );
        loadStatus();
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo conectar con Stripe.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenDashboard = async () => {
    if (!professional?.id || !session) return;
    setActionLoading(true);
    try {
      const res = await webApiFetch('/api/stripe/connect/dashboard-link', session, {
        method: 'POST',
        body: JSON.stringify({ professional_id: professional.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      if (data.url) await WebBrowser.openBrowserAsync(data.url);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo abrir el dashboard.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Desconectar Stripe',
      'No podrás recibir pagos hasta que vuelvas a conectar. ¿Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desconectar',
          style: 'destructive',
          onPress: async () => {
            if (!professional?.id || !session) return;
            setActionLoading(true);
            try {
              const res = await webApiFetch('/api/stripe/connect/disconnect', session, {
                method: 'POST',
                body: JSON.stringify({ professional_id: professional.id }),
              });
              const data = await res.json();
              if (!res.ok) throw new Error(data.error || 'Error');
              setStatus({ connected: false });
              Alert.alert('Listo', 'Cuenta desconectada.');
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? 'No se pudo desconectar.');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const isFullyConnected = status?.connected && status?.charges_enabled && status?.payouts_enabled;

  const userEmail = (session?.user?.email ?? '').trim().toLowerCase();
  const confirmEmailMatch = deactivateEmail.trim().toLowerCase() === userEmail;

  const handleDeactivate = () => {
    if (!confirmEmailMatch) {
      Alert.alert('Correo no coincide', 'El correo debe coincidir con el de tu cuenta.');
      return;
    }
    Alert.alert(
      '¿Desactivar tu cuenta?',
      'Perderás acceso inmediato. Tu perfil y servicios dejarán de ser visibles. No podrás recibir nuevas reservas. Se cerrará tu sesión. Puedes contactarnos para reactivarla.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, desactivar',
          style: 'destructive',
          onPress: async () => {
            if (!session?.user?.id) return;
            setDeactivating(true);
            try {
              const { data, error } = await supabase.rpc('deactivate_user_account', {
                user_id_param: session.user.id,
              });
              if (error) throw new Error(error.message);
              if (data && typeof data === 'object' && 'success' in data && !(data as any).success) {
                throw new Error((data as any).message ?? 'Error al desactivar');
              }
              await supabase.auth.signOut();
              router.replace({ pathname: '/(auth)/login', params: { deactivated: 'true' } } as any);
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? 'No se pudo desactivar la cuenta.');
            } finally {
              setDeactivating(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.background }]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: c.foreground }]}>Configuración</Text>
      <Text style={[styles.desc, { color: c.mutedForeground }]}>Ajustes de tu cuenta profesional.</Text>

      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
        <Text style={[styles.cardTitle, { color: c.foreground }]}>Configuración de pagos</Text>
        <Text style={[styles.cardDesc, { color: c.mutedForeground }]}>
          Conecta tu cuenta de Stripe para recibir pagos directamente por tus servicios.
        </Text>

        {loading ? (
          <ActivityIndicator size="small" color={c.primary} style={styles.spinner} />
        ) : (
          <>
            <View style={styles.badgeRow}>
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: isFullyConnected ? 'rgba(34,197,94,0.2)' : status?.connected ? 'rgba(234,179,8,0.2)' : 'rgba(128,128,128,0.2)',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    {
                      color: isFullyConnected ? '#22c55e' : status?.connected ? '#eab308' : c.mutedForeground,
                    },
                  ]}
                >
                  {isFullyConnected ? 'Conectado' : status?.connected ? 'Pendiente' : 'No conectado'}
                </Text>
              </View>
            </View>

            <Text style={[styles.cardHint, { color: c.mutedForeground }]}>
              {!status?.connected
                ? 'Para recibir pagos por tus servicios, conecta una cuenta de Stripe.'
                : isFullyConnected
                  ? 'Tu cuenta está verificada. Los pagos se transferirán a tu banco.'
                  : 'Completa el proceso de verificación en Stripe para poder recibir pagos.'}
            </Text>

            <View style={styles.actions}>
              {!status?.connected ? (
                <Pressable
                  onPress={handleConnect}
                  disabled={actionLoading}
                  style={[styles.btn, styles.btnPrimary, { backgroundColor: c.primary }]}
                >
                  <Text style={[styles.btnText, { color: c.primaryForeground }]}>
                    {actionLoading ? 'Abriendo...' : 'Conectar con Stripe'}
                  </Text>
                </Pressable>
              ) : (
                <>
                  {!isFullyConnected && (
                    <Pressable
                      onPress={handleConnect}
                      disabled={actionLoading}
                      style={[styles.btn, styles.btnPrimary, { backgroundColor: c.primary }]}
                    >
                      <Text style={[styles.btnText, { color: c.primaryForeground }]}>
                        {actionLoading ? 'Abriendo...' : 'Completar configuración'}
                      </Text>
                    </Pressable>
                  )}
                  <Pressable
                    onPress={handleOpenDashboard}
                    disabled={actionLoading}
                    style={[styles.btn, styles.btnOutline, { borderColor: c.border }]}
                  >
                    <Text style={[styles.btnText, { color: c.foreground }]}>Dashboard de Stripe</Text>
                  </Pressable>
                  <Pressable onPress={loadStatus} disabled={actionLoading} style={[styles.btn, styles.btnOutline, { borderColor: c.border }]}>
                    <Text style={[styles.btnText, { color: c.foreground }]}>Actualizar estado</Text>
                  </Pressable>
                </>
              )}
            </View>

            {status?.connected && (
              <Pressable onPress={handleDisconnect} disabled={actionLoading} style={[styles.btn, styles.btnDestructive]}>
                <Text style={[styles.btnText, { color: c.destructive }]}>Desconectar cuenta</Text>
              </Pressable>
            )}
          </>
        )}
      </View>

      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
        <Text style={[styles.cardTitle, { color: c.foreground }]}>Desactivar cuenta</Text>
        <Text style={[styles.cardDesc, { color: c.mutedForeground }]}>
          Perderás acceso inmediato. Tu perfil y servicios dejarán de ser visibles. No podrás recibir nuevas reservas. Se cerrará tu sesión. Puedes contactarnos para reactivarla.
        </Text>
        <Text style={[styles.label, { color: c.foreground }]}>Escribe tu correo para confirmar:</Text>
        <TextInput
          style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.foreground }]}
          placeholder={userEmail || 'tu@correo.com'}
          placeholderTextColor={c.mutedForeground}
          value={deactivateEmail}
          onChangeText={setDeactivateEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
        />
        <Pressable
          onPress={handleDeactivate}
          disabled={!confirmEmailMatch || deactivating}
          style={[styles.btn, styles.btnDestructive, { marginTop: 12, opacity: confirmEmailMatch ? 1 : 0.5 }]}
        >
          <Text style={[styles.btnText, { color: c.destructive }]}>
            {deactivating ? 'Desactivando...' : 'Desactivar mi cuenta'}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: '700' },
  desc: { fontSize: 15, marginTop: 8, marginBottom: 24 },
  card: { padding: 20, borderRadius: 12, borderWidth: 1 },
  cardTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  cardDesc: { fontSize: 14, marginBottom: 16 },
  badgeRow: { marginBottom: 12 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  badgeText: { fontSize: 14, fontWeight: '600' },
  cardHint: { fontSize: 14, marginBottom: 20 },
  actions: { gap: 12 },
  btn: { padding: 16, borderRadius: 10, alignItems: 'center' },
  btnPrimary: {},
  btnOutline: { borderWidth: 1 },
  btnDestructive: { marginTop: 16 },
  btnText: { fontSize: 16, fontWeight: '600' },
  spinner: { marginVertical: 24 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
});
