import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { supabase } from '@/lib/supabase';
import { webApiFetch } from '@/lib/web-api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { API_BASE_URL } from '@/constants/auth';
import { getRegistrationFeeStatus, formatExpirationDate } from '@/lib/registration-utils';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const DRAFT_KEY = 'holistia_become_professional_draft';
const STEPS = 4;

type Service = { name: string; description: string; price: string; duration: string };

const initialForm = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  profession: '',
  specializations: [] as string[],
  languages: ['Español'] as string[],
  experience: '',
  services: [{ name: '', description: '', price: '', duration: '' }] as Service[],
  address: '',
  city: '',
  state: '',
  country: 'México',
  biography: '',
  wellness_areas: [] as string[],
  instagram: '',
  terms_accepted: false,
  privacy_accepted: false,
};

type ExistingApp = {
  id: string;
  status: string;
  first_name: string;
  last_name: string;
  profession: string;
  specializations: string[];
  created_at: string;
  registration_fee_paid: boolean;
  registration_fee_amount: number;
  registration_fee_currency: string;
  registration_fee_expires_at: string | null;
  wellness_areas?: string[];
};

export default function BecomeProfessionalScreen() {
  const session = useAuthStore((s) => s.session);
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [existingApplication, setExistingApplication] = useState<ExistingApp | null>(null);
  const [isEditingRejected, setIsEditingRejected] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [specInput, setSpecInput] = useState('');
  const [langInput, setLangInput] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const loadData = useCallback(async () => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, email, phone, avatar_url')
        .eq('id', session.user.id)
        .single();

      setFormData((prev) => ({
        ...prev,
        first_name: profile?.first_name ?? prev.first_name,
        last_name: profile?.last_name ?? prev.last_name,
        email: profile?.email ?? session.user?.email ?? prev.email,
        phone: profile?.phone ?? prev.phone,
      }));

      const { data: app, error } = await supabase
        .from('professional_applications')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (!error && app) {
        setExistingApplication(app as ExistingApp);
        setFormData({
          first_name: app.first_name ?? '',
          last_name: app.last_name ?? '',
          email: app.email ?? '',
          phone: app.phone ?? '',
          profession: app.profession ?? '',
          specializations: app.specializations ?? [],
          languages: app.languages ?? ['Español'],
          experience: app.experience ?? '',
          services: Array.isArray(app.services) && app.services.length ? app.services : initialForm.services,
          address: app.address ?? '',
          city: app.city ?? '',
          state: app.state ?? '',
          country: app.country ?? 'México',
          biography: app.biography ?? '',
          wellness_areas: app.wellness_areas ?? [],
          instagram: app.instagram ?? '',
          terms_accepted: Boolean(app.terms_accepted),
          privacy_accepted: Boolean(app.privacy_accepted),
        });
      } else {
        const raw = await AsyncStorage.getItem(DRAFT_KEY);
        if (raw) {
          try {
            const { formData: draft, currentStep: step } = JSON.parse(raw);
            if (draft && typeof step === 'number') {
              setFormData({ ...initialForm, ...draft });
              setCurrentStep(Math.min(Math.max(1, step), STEPS));
            }
          } catch {}
        }
      }
    } catch (e) {
      console.error('Become professional load:', e);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);

  useFocusEffect(
    useCallback(() => {
      if (!session?.user?.id || !existingApplication) return;
      setVerifyingPayment(true);
      let attempts = 0;
      const t = setInterval(async () => {
        const { data } = await supabase
          .from('professional_applications')
          .select('registration_fee_paid, status')
          .eq('user_id', session.user.id)
          .maybeSingle();
        attempts++;
        if (data?.registration_fee_paid) {
          clearInterval(t);
          setVerifyingPayment(false);
          setRefreshKey((k) => k + 1);
          return;
        }
        if (attempts >= 10) {
          clearInterval(t);
          setVerifyingPayment(false);
        }
      }, 2000);
      return () => clearInterval(t);
    }, [session?.user?.id, existingApplication])
  );

  const saveDraft = useCallback(() => {
    if (!session?.user?.id || existingApplication) return;
    AsyncStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ formData, currentStep, user_id: session.user.id })
    ).catch(() => {});
  }, [formData, currentStep, session?.user?.id, existingApplication]);

  const draftRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (existingApplication) return;
    draftRef.current = setTimeout(saveDraft, 600);
    return () => {
      if (draftRef.current) clearTimeout(draftRef.current);
    };
  }, [formData, currentStep, existingApplication, saveDraft]);

  const set = (field: string, value: string | boolean | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validateStep = (step: number): boolean => {
    const e: Record<string, string> = {};
    if (step === 1) {
      if (!formData.first_name.trim()) e.first_name = 'Nombre requerido';
      if (!formData.last_name.trim()) e.last_name = 'Apellido requerido';
      if (!formData.email.trim()) e.email = 'Email requerido';
      if (!formData.phone.trim()) e.phone = 'Teléfono requerido';
    }
    if (step === 2) {
      if (!formData.profession.trim()) e.profession = 'Profesión requerida';
      if (formData.specializations.length === 0) e.specializations = 'Al menos una especialización';
      if (!formData.experience.trim()) e.experience = 'Años de experiencia requeridos';
    }
    if (step === 3) {
      if (!formData.address.trim()) e.address = 'Dirección requerida';
      if (!formData.city.trim()) e.city = 'Ciudad requerida';
      if (!formData.state.trim()) e.state = 'Estado requerido';
      if (!formData.country.trim()) e.country = 'País requerido';
    }
    if (step === 4) {
      if (!formData.biography.trim()) e.biography = 'Biografía requerida';
      if (!formData.instagram.trim()) e.instagram = 'Instagram requerido';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 2) {
      if (specInput.trim()) {
        set('specializations', [...formData.specializations, specInput.trim()]);
        setSpecInput('');
      }
      if (langInput.trim() && !formData.languages.includes(langInput.trim())) {
        set('languages', [...formData.languages, langInput.trim()]);
        setLangInput('');
      }
    }
    if (validateStep(currentStep)) setCurrentStep((s) => Math.min(s + 1, STEPS));
  };

  const handleSubmit = async () => {
    if (!validateStep(4) || !session?.user || !formData.terms_accepted || !formData.privacy_accepted) {
      if (!formData.terms_accepted || !formData.privacy_accepted) {
        Alert.alert('Términos', 'Debes aceptar términos y política de privacidad.');
      }
      return;
    }
    setSubmitting(true);
    try {
      const res = await webApiFetch('/api/professional-applications/submit', session, {
        method: 'POST',
        body: JSON.stringify({
          user_id: session.user.id,
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          profession: formData.profession.trim(),
          specializations: formData.specializations,
          languages: formData.languages,
          experience: formData.experience.trim(),
          services: formData.services,
          address: formData.address.trim(),
          city: formData.city.trim(),
          state: formData.state.trim(),
          country: formData.country.trim(),
          biography: formData.biography.trim(),
          wellness_areas: formData.wellness_areas,
          instagram: formData.instagram.replace(/^@/, '').trim(),
          profile_photo: null,
          terms_accepted: true,
          privacy_accepted: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        Alert.alert('Error', data?.error ?? 'No se pudo enviar la solicitud.');
        return;
      }
      AsyncStorage.removeItem(DRAFT_KEY).catch(() => {});
      Alert.alert('Enviado', data.updated ? 'Solicitud actualizada.' : 'Solicitud enviada correctamente.');
      setRefreshKey((k) => k + 1);
      loadData();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Error de conexión.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegistrationPayment = async () => {
    if (!existingApplication) return;
    setProcessingPayment(true);
    try {
      const res = await webApiFetch('/api/stripe/registration-checkout', session, {
        method: 'POST',
        body: JSON.stringify({ professional_application_id: existingApplication.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? 'Error al crear el pago.');
      if (data?.url) await WebBrowser.openBrowserAsync(data.url);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo iniciar el pago.');
    } finally {
      setProcessingPayment(false);
    }
  };

  const openTerms = () => Linking.openURL(`${API_BASE_URL}/terms`);
  const openPrivacy = () => Linking.openURL(`${API_BASE_URL}/privacy`);
  const openCertificationsEmail = () =>
    Linking.openURL(
      `mailto:hola@holistia.io?subject=Certificaciones - ${formData.first_name} ${formData.last_name}`
    );

  if (loading || verifyingPayment) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
        {verifyingPayment && (
          <Text style={[styles.verifyingText, { color: c.mutedForeground }]}>Verificando pago...</Text>
        )}
      </View>
    );
  }

  if (!session?.user?.id) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Text style={[styles.muted, { color: c.mutedForeground }]}>Inicia sesión para continuar</Text>
        <Pressable onPress={() => router.replace('/(auth)/login' as any)} style={[styles.btn, { backgroundColor: c.primary }]}>
          <Text style={styles.btnText}>Iniciar sesión</Text>
        </Pressable>
      </View>
    );
  }

  if (existingApplication && !isEditingRejected) {
    const statusInfo: Record<string, { label: string; desc: string; color: string }> = {
      approved: { label: 'Aprobada', desc: '¡Felicitaciones! Tu solicitud ha sido aprobada.', color: '#16a34a' },
      pending: { label: 'Pendiente', desc: 'Tu solicitud está siendo revisada.', color: '#ca8a04' },
      under_review: { label: 'En revisión', desc: 'Nuestro equipo está evaluando tu solicitud.', color: '#2563eb' },
      rejected: { label: 'Rechazada', desc: 'Tu solicitud no pudo ser aprobada en esta ocasión.', color: '#dc2626' },
    };
    const info = statusInfo[existingApplication.status] ?? {
      label: 'Desconocido',
      desc: 'Estado no reconocido',
      color: c.mutedForeground,
    };
    const feeStatus = getRegistrationFeeStatus(
      existingApplication.registration_fee_paid,
      existingApplication.registration_fee_expires_at
    );
    const createdDate = new Date(existingApplication.created_at).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return (
      <ScrollView style={[styles.container, { backgroundColor: c.background }]} contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: c.foreground }]}>Solicitud de Experto</Text>
        <Text style={[styles.subtitle, { color: c.mutedForeground }]}>Estado de tu solicitud</Text>

        <View style={[styles.card, { borderColor: info.color, backgroundColor: `${info.color}12` }]}>
          <View style={styles.statusRow}>
            <MaterialIcons name="info" size={24} color={info.color} />
            <View style={styles.statusText}>
              <Text style={[styles.statusLabel, { color: info.color }]}>{info.label}</Text>
              <Text style={[styles.statusDesc, { color: c.mutedForeground }]}>{info.desc}</Text>
            </View>
          </View>
          <Text style={[styles.fieldLabel, { color: c.foreground }]}>Profesión</Text>
          <Text style={[styles.fieldValue, { color: c.mutedForeground }]}>{existingApplication.profession}</Text>
          <Text style={[styles.fieldLabel, { color: c.foreground }]}>Fecha de envío</Text>
          <Text style={[styles.fieldValue, { color: c.mutedForeground }]}>{createdDate}</Text>
          {existingApplication.specializations?.length > 0 && (
            <>
              <Text style={[styles.fieldLabel, { color: c.foreground }]}>Especializaciones</Text>
              <View style={styles.chipRow}>
                {existingApplication.specializations.map((s, i) => (
                  <View key={i} style={[styles.chip, { backgroundColor: c.secondary }]}>
                    <Text style={[styles.chipText, { color: c.foreground }]}>{s}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          <View style={[styles.feeBlock, { backgroundColor: c.muted, borderColor: c.border }]}>
            <Text style={[styles.feeTitle, { color: c.foreground }]}>Cuota de inscripción anual</Text>
            <Text style={[styles.feeAmount, { color: c.foreground }]}>
              ${(existingApplication.registration_fee_amount ?? 0).toLocaleString('es-MX', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              {(existingApplication.registration_fee_currency ?? 'MXN').toUpperCase()}
            </Text>
            <View style={[styles.badge, { backgroundColor: feeStatus.color === 'green' ? '#16a34a' : feeStatus.color === 'red' ? '#dc2626' : '#ca8a04' }]}>
              <Text style={styles.badgeText}>{feeStatus.message}</Text>
            </View>
            {existingApplication.registration_fee_expires_at && existingApplication.registration_fee_paid && (
              <Text style={[styles.feeExpiry, { color: c.mutedForeground }]}>
                Expira: {formatExpirationDate(existingApplication.registration_fee_expires_at)}
              </Text>
            )}
            {(feeStatus.isExpired || !existingApplication.registration_fee_paid || feeStatus.isNearExpiration) && (
              <Pressable
                onPress={handleRegistrationPayment}
                disabled={processingPayment}
                style={[styles.payBtn, { backgroundColor: c.primary }]}>
                {processingPayment ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.payBtnText}>
                    {existingApplication.registration_fee_paid ? 'Renovar inscripción' : 'Pagar inscripción'}
                  </Text>
                )}
              </Pressable>
            )}
          </View>

          {existingApplication.status === 'rejected' && (
            <View style={styles.actionRow}>
              <Pressable
                onPress={() => {
                  setIsEditingRejected(true);
                  setExistingApplication(null);
                  setCurrentStep(1);
                }}
                style={[styles.outlineBtn, { borderColor: c.primary }]}>
                <Text style={[styles.outlineBtnText, { color: c.primary }]}>Reenviar solicitud</Text>
              </Pressable>
            </View>
          )}

          {(existingApplication.status === 'pending' || existingApplication.status === 'under_review') && (
            <Pressable onPress={() => setRefreshKey((k) => k + 1)} style={[styles.outlineBtn, { borderColor: c.border }]}>
              <Text style={[styles.outlineBtnText, { color: c.foreground }]}>Actualizar estado</Text>
            </Pressable>
          )}

          {existingApplication.status === 'approved' && feeStatus.isActive && (
            <Pressable
              onPress={() => router.replace('/(expert)/(tabs)' as any)}
              style={[styles.btn, { backgroundColor: c.primary }]}>
              <Text style={styles.btnText}>Ir al dashboard de experto</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    );
  }

  const renderStep = () => {
    if (currentStep === 1) {
      return (
        <View style={styles.stepContent}>
          <Text style={[styles.label, { color: c.foreground }]}>Nombre *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: c.background, color: c.foreground, borderColor: c.border }]}
            value={formData.first_name}
            onChangeText={(v) => set('first_name', v)}
            placeholder="Tu nombre"
            placeholderTextColor={c.mutedForeground}
          />
          {errors.first_name ? <Text style={styles.errText}>{errors.first_name}</Text> : null}
          <Text style={[styles.label, { color: c.foreground }]}>Apellido *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: c.background, color: c.foreground, borderColor: c.border }]}
            value={formData.last_name}
            onChangeText={(v) => set('last_name', v)}
            placeholder="Tu apellido"
            placeholderTextColor={c.mutedForeground}
          />
          {errors.last_name ? <Text style={styles.errText}>{errors.last_name}</Text> : null}
          <Text style={[styles.label, { color: c.foreground }]}>Email *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: c.background, color: c.foreground, borderColor: c.border }]}
            value={formData.email}
            onChangeText={(v) => set('email', v)}
            placeholder="tu@email.com"
            placeholderTextColor={c.mutedForeground}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {errors.email ? <Text style={styles.errText}>{errors.email}</Text> : null}
          <Text style={[styles.label, { color: c.foreground }]}>Teléfono *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: c.background, color: c.foreground, borderColor: c.border }]}
            value={formData.phone}
            onChangeText={(v) => set('phone', v)}
            placeholder="55 1234 5678"
            placeholderTextColor={c.mutedForeground}
            keyboardType="phone-pad"
          />
          {errors.phone ? <Text style={styles.errText}>{errors.phone}</Text> : null}
        </View>
      );
    }
    if (currentStep === 2) {
      return (
        <View style={styles.stepContent}>
          <Text style={[styles.label, { color: c.foreground }]}>Profesión *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: c.background, color: c.foreground, borderColor: c.border }]}
            value={formData.profession}
            onChangeText={(v) => set('profession', v)}
            placeholder="Ej: Psicólogo, Terapeuta..."
            placeholderTextColor={c.mutedForeground}
          />
          {errors.profession ? <Text style={styles.errText}>{errors.profession}</Text> : null}
          <Text style={[styles.label, { color: c.foreground }]}>Especializaciones * (añade con Enter o +)</Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1, backgroundColor: c.background, color: c.foreground, borderColor: c.border }]}
              value={specInput}
              onChangeText={setSpecInput}
              placeholder="Ej: Psicología Clínica"
              placeholderTextColor={c.mutedForeground}
              onSubmitEditing={() => {
                if (specInput.trim()) {
                  set('specializations', [...formData.specializations, specInput.trim()]);
                  setSpecInput('');
                }
              }}
            />
            <Pressable
              onPress={() => {
                if (specInput.trim()) {
                  set('specializations', [...formData.specializations, specInput.trim()]);
                  setSpecInput('');
                }
              }}
              style={[styles.addBtn, { backgroundColor: c.primary }]}>
              <Text style={styles.addBtnText}>+</Text>
            </Pressable>
          </View>
          <View style={styles.chipRow}>
            {formData.specializations.map((s, i) => (
              <Pressable
                key={i}
                onPress={() => set('specializations', formData.specializations.filter((_, j) => j !== i))}
                style={[styles.chip, { backgroundColor: c.secondary }]}>
                <Text style={[styles.chipText, { color: c.foreground }]}>{s} ×</Text>
              </Pressable>
            ))}
          </View>
          {errors.specializations ? <Text style={styles.errText}>{errors.specializations}</Text> : null}
          <Text style={[styles.label, { color: c.foreground }]}>Idiomas (Español incluido)</Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1, backgroundColor: c.background, color: c.foreground, borderColor: c.border }]}
              value={langInput}
              onChangeText={setLangInput}
              placeholder="Añadir idioma"
              placeholderTextColor={c.mutedForeground}
              onSubmitEditing={() => {
                if (langInput.trim() && !formData.languages.includes(langInput.trim())) {
                  set('languages', [...formData.languages, langInput.trim()]);
                  setLangInput('');
                }
              }}
            />
            <Pressable
              onPress={() => {
                if (langInput.trim() && !formData.languages.includes(langInput.trim())) {
                  set('languages', [...formData.languages, langInput.trim()]);
                  setLangInput('');
                }
              }}
              style={[styles.addBtn, { backgroundColor: c.primary }]}>
              <Text style={styles.addBtnText}>+</Text>
            </Pressable>
          </View>
          <View style={styles.chipRow}>
            {formData.languages.map((l, i) => (
              <View key={i} style={[styles.chip, { backgroundColor: c.secondary }]}>
                <Text style={[styles.chipText, { color: c.foreground }]}>{l}</Text>
              </View>
            ))}
          </View>
          <Pressable onPress={openCertificationsEmail} style={[styles.linkBtn, { borderColor: c.primary }]}>
            <Text style={[styles.linkBtnText, { color: c.primary }]}>Enviar certificaciones a hola@holistia.io</Text>
          </Pressable>
          <Text style={[styles.label, { color: c.foreground }]}>Años de experiencia *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: c.background, color: c.foreground, borderColor: c.border }]}
            value={formData.experience}
            onChangeText={(v) => set('experience', v)}
            placeholder="Ej: 5"
            placeholderTextColor={c.mutedForeground}
            keyboardType="number-pad"
          />
          {errors.experience ? <Text style={styles.errText}>{errors.experience}</Text> : null}
        </View>
      );
    }
    if (currentStep === 3) {
      return (
        <View style={styles.stepContent}>
          <Text style={[styles.label, { color: c.foreground }]}>Dirección completa *</Text>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: c.background, color: c.foreground, borderColor: c.border }]}
            value={formData.address}
            onChangeText={(v) => set('address', v)}
            placeholder="Calle, número, colonia"
            placeholderTextColor={c.mutedForeground}
          />
          {errors.address ? <Text style={styles.errText}>{errors.address}</Text> : null}
          <Text style={[styles.label, { color: c.foreground }]}>Ciudad *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: c.background, color: c.foreground, borderColor: c.border }]}
            value={formData.city}
            onChangeText={(v) => set('city', v)}
            placeholder="Ciudad"
            placeholderTextColor={c.mutedForeground}
          />
          {errors.city ? <Text style={styles.errText}>{errors.city}</Text> : null}
          <Text style={[styles.label, { color: c.foreground }]}>Estado *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: c.background, color: c.foreground, borderColor: c.border }]}
            value={formData.state}
            onChangeText={(v) => set('state', v)}
            placeholder="Estado"
            placeholderTextColor={c.mutedForeground}
          />
          {errors.state ? <Text style={styles.errText}>{errors.state}</Text> : null}
          <Text style={[styles.label, { color: c.foreground }]}>País *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: c.background, color: c.foreground, borderColor: c.border }]}
            value={formData.country}
            onChangeText={(v) => set('country', v)}
            placeholder="México"
            placeholderTextColor={c.mutedForeground}
          />
          {errors.country ? <Text style={styles.errText}>{errors.country}</Text> : null}
        </View>
      );
    }
    return (
      <View style={styles.stepContent}>
        <Text style={[styles.label, { color: c.foreground }]}>Biografía * (máx. 500 caracteres)</Text>
        <TextInput
          style={[styles.input, styles.bioInput, { backgroundColor: c.background, color: c.foreground, borderColor: c.border }]}
          value={formData.biography}
          onChangeText={(v) => set('biography', v.slice(0, 500))}
          placeholder="Cuéntanos sobre ti y tu experiencia..."
          placeholderTextColor={c.mutedForeground}
          multiline
        />
        <Text style={[styles.hint, { color: c.mutedForeground }]}>{formData.biography.length}/500</Text>
        {errors.biography ? <Text style={styles.errText}>{errors.biography}</Text> : null}
        <Text style={[styles.label, { color: c.foreground }]}>Instagram * (solo usuario, sin @)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: c.background, color: c.foreground, borderColor: c.border }]}
          value={formData.instagram}
          onChangeText={(v) => set('instagram', v.replace(/^@/, ''))}
          placeholder="tu_usuario"
          placeholderTextColor={c.mutedForeground}
          autoCapitalize="none"
        />
        {errors.instagram ? <Text style={styles.errText}>{errors.instagram}</Text> : null}
        <View style={styles.checkRow}>
          <Pressable onPress={() => set('terms_accepted', !formData.terms_accepted)} style={styles.checkBoxWrap}>
            <MaterialIcons
              name={formData.terms_accepted ? 'check-box' : 'check-box-outline-blank'}
              size={24}
              color={c.primary}
            />
          </Pressable>
          <View style={styles.checkLabelWrap}>
            <Text style={[styles.checkLabel, { color: c.foreground }]}>Acepto los </Text>
            <Pressable onPress={openTerms}>
              <Text style={[styles.checkLabel, styles.link]}>términos y condiciones</Text>
            </Pressable>
            <Text style={[styles.checkLabel, { color: c.foreground }]}> de Holistia</Text>
          </View>
        </View>
        <View style={styles.checkRow}>
          <Pressable onPress={() => set('privacy_accepted', !formData.privacy_accepted)} style={styles.checkBoxWrap}>
            <MaterialIcons
              name={formData.privacy_accepted ? 'check-box' : 'check-box-outline-blank'}
              size={24}
              color={c.primary}
            />
          </Pressable>
          <View style={styles.checkLabelWrap}>
            <Text style={[styles.checkLabel, { color: c.foreground }]}>Acepto la </Text>
            <Pressable onPress={openPrivacy}>
              <Text style={[styles.checkLabel, styles.link]}>política de privacidad</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: c.foreground }]}>
          {isEditingRejected ? 'Reenviar solicitud' : 'Ser profesional'}
        </Text>
        <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
          Paso {currentStep} de {STEPS}
        </Text>
        <View style={[styles.progressBar, { backgroundColor: c.muted }]}>
          <View style={[styles.progressFill, { backgroundColor: c.primary, width: `${(currentStep / STEPS) * 100}%` }]} />
        </View>
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          {renderStep()}
        </View>
        <View style={styles.navRow}>
          <Pressable
            onPress={() => setCurrentStep((s) => Math.max(1, s - 1))}
            disabled={currentStep === 1}
            style={[styles.outlineBtn, { borderColor: c.border }]}>
            <Text style={[styles.outlineBtnText, { color: c.foreground }]}>Anterior</Text>
          </Pressable>
          {currentStep < STEPS ? (
            <Pressable onPress={handleNext} style={[styles.btn, { backgroundColor: c.primary }]}>
              <Text style={styles.btnText}>Siguiente</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={handleSubmit}
              disabled={submitting || !formData.terms_accepted || !formData.privacy_accepted}
              style={[styles.btn, { backgroundColor: c.primary }]}>
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.btnText}>Enviar solicitud</Text>
              )}
            </Pressable>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

BecomeProfessionalScreen.options = { title: 'Ser profesional' };

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 14, marginBottom: 12 },
  muted: { fontSize: 15, marginBottom: 16 },
  progressBar: { height: 6, borderRadius: 3, marginBottom: 20 },
  progressFill: { height: '100%', borderRadius: 3 },
  card: { borderRadius: 12, borderWidth: 1, padding: 20, marginBottom: 20 },
  stepContent: { gap: 12 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: { minHeight: 80 },
  bioInput: { minHeight: 120, textAlignVertical: 'top' },
  hint: { fontSize: 12 },
  errText: { color: '#dc2626', fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addBtn: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#fff', fontSize: 20, fontWeight: '600' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  chipText: { fontSize: 14 },
  linkBtn: { borderWidth: 1, padding: 12, borderRadius: 10, marginTop: 8 },
  linkBtnText: { fontSize: 14, fontWeight: '600' },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 12 },
  checkBoxWrap: { padding: 4 },
  checkLabelWrap: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  checkLabel: { fontSize: 14 },
  link: { color: '#6468f0', textDecorationLine: 'underline' },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  btn: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, alignItems: 'center', minWidth: 120 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  outlineBtn: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, borderWidth: 1, alignItems: 'center', minWidth: 120 },
  outlineBtnText: { fontSize: 16, fontWeight: '600' },
  statusRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  statusText: { flex: 1 },
  statusLabel: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  statusDesc: { fontSize: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginTop: 12, marginBottom: 4 },
  fieldValue: { fontSize: 14 },
  feeBlock: { marginTop: 20, padding: 16, borderRadius: 12, borderWidth: 1 },
  feeTitle: { fontSize: 14, fontWeight: '600' },
  feeAmount: { fontSize: 18, fontWeight: '700', marginVertical: 4 },
  feeExpiry: { fontSize: 12, marginTop: 4 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 4 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  payBtn: { marginTop: 12, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  payBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  actionRow: { marginTop: 16, gap: 8 },
  verifyingText: { marginTop: 12, fontSize: 14 },
});
