import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import { router } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useProfessionalStore } from '@/stores/professional-store';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { API_BASE_URL } from '@/constants/auth';
import { FAQ_PATIENTS, FAQ_PROFESSIONALS } from '@/lib/help-data';

export default function HelpScreen() {
  const professional = useProfessionalStore((s) => s.professional);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const colorScheme = useColorScheme();
  const c = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const isExpert = !!professional;
  const faqs = isExpert ? FAQ_PROFESSIONALS : FAQ_PATIENTS;

  const siteUrl = API_BASE_URL.replace(/\/$/, '');
  const helpUrl = `${siteUrl}/help`;
  const privacyUrl = `${siteUrl}/privacy`;
  const termsUrl = `${siteUrl}/terms`;
  const contactUrl = `${siteUrl}/contact`;
  const companiesUrl = `${siteUrl}/companies`;
  const historyUrl = `${siteUrl}/history`;

  const openWebHelp = () => Linking.openURL(helpUrl);
  const openPrivacy = () => Linking.openURL(privacyUrl);
  const openTerms = () => Linking.openURL(termsUrl);
  const openContact = () => Linking.openURL(contactUrl);
  const openCompanies = () => Linking.openURL(companiesUrl);
  const openHistory = () => Linking.openURL(historyUrl);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.background }]}
      contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color={c.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: c.foreground }]}>Centro de ayuda</Text>
        <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
          {isExpert ? 'Preguntas frecuentes para profesionales' : 'Preguntas frecuentes para pacientes'}
        </Text>
      </View>

      <View style={[styles.section, { backgroundColor: c.card, borderColor: c.border }]}>
        <Text style={[styles.sectionTitle, { color: c.foreground }]}>Preguntas frecuentes</Text>
        {faqs.map((faq, idx) => {
          const id = `faq-${idx}`;
          const isExpanded = expandedId === id;
          return (
            <View key={id} style={[styles.faqItem, { borderColor: c.border }]}>
              <Pressable
                onPress={() => setExpandedId(isExpanded ? null : id)}
                style={styles.faqHeader}>
                <Text style={[styles.faqQuestion, { color: c.foreground }]} numberOfLines={isExpanded ? undefined : 2}>
                  {faq.question}
                </Text>
                <MaterialIcons
                  name={isExpanded ? 'expand-less' : 'expand-more'}
                  size={24}
                  color={c.mutedForeground}
                />
              </Pressable>
              {isExpanded && (
                <Text style={[styles.faqAnswer, { color: c.mutedForeground }]}>{faq.answer}</Text>
              )}
            </View>
          );
        })}
      </View>

      <View style={[styles.legalSection, { backgroundColor: c.card, borderColor: c.border }]}>
        <Text style={[styles.sectionTitle, { color: c.foreground }]}>Legal</Text>
        <Pressable onPress={openPrivacy} style={[styles.legalRow, { borderTopWidth: 0 }]}>
          <MaterialIcons name="policy" size={20} color={c.primary} />
          <Text style={[styles.legalLabel, { color: c.foreground }]}>Política de privacidad</Text>
          <MaterialIcons name="open-in-new" size={18} color={c.mutedForeground} />
        </Pressable>
        <Pressable onPress={openTerms} style={styles.legalRow}>
          <MaterialIcons name="description" size={20} color={c.primary} />
          <Text style={[styles.legalLabel, { color: c.foreground }]}>Términos y condiciones</Text>
          <MaterialIcons name="open-in-new" size={18} color={c.mutedForeground} />
        </Pressable>
        <Pressable onPress={openContact} style={styles.legalRow}>
          <MaterialIcons name="mail" size={20} color={c.primary} />
          <Text style={[styles.legalLabel, { color: c.foreground }]}>Contacto</Text>
          <MaterialIcons name="open-in-new" size={18} color={c.mutedForeground} />
        </Pressable>
        <Pressable onPress={openCompanies} style={styles.legalRow}>
          <MaterialIcons name="business" size={20} color={c.primary} />
          <Text style={[styles.legalLabel, { color: c.foreground }]}>Holistia para empresas</Text>
          <MaterialIcons name="open-in-new" size={18} color={c.mutedForeground} />
        </Pressable>
        <Pressable onPress={openHistory} style={styles.legalRow}>
          <MaterialIcons name="history-edu" size={20} color={c.primary} />
          <Text style={[styles.legalLabel, { color: c.foreground }]}>Historia</Text>
          <MaterialIcons name="open-in-new" size={18} color={c.mutedForeground} />
        </Pressable>
      </View>

      <View style={[styles.contactCard, { backgroundColor: c.primary + '15', borderColor: c.primary }]}>
        <MaterialIcons name="support-agent" size={32} color={c.primary} />
        <View style={styles.contactText}>
          <Text style={[styles.contactTitle, { color: c.foreground }]}>¿Necesitas más ayuda?</Text>
          <Text style={[styles.contactSubtitle, { color: c.mutedForeground }]}>
            Envía una solicitud desde la web y te responderemos en 24–48 h hábiles.
          </Text>
        </View>
        <Pressable
          onPress={openWebHelp}
          style={[styles.contactBtn, { backgroundColor: c.primary }]}>
          <Text style={styles.contactBtnText}>Abrir centro de ayuda</Text>
          <MaterialIcons name="open-in-new" size={18} color="#fff" />
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 40 },
  header: { padding: 20, paddingTop: 60 },
  backBtn: { marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 15, marginTop: 6 },
  section: { marginHorizontal: 20, marginTop: 24, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  sectionTitle: { fontSize: 17, fontWeight: '600', padding: 16, paddingBottom: 8 },
  legalSection: {
    marginHorizontal: 20,
    marginTop: 24,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.2)',
  },
  legalLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
  faqItem: { borderTopWidth: 1, padding: 16 },
  faqHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  faqQuestion: { flex: 1, fontSize: 15, fontWeight: '500' },
  faqAnswer: { fontSize: 14, lineHeight: 22, marginTop: 12 },
  contactCard: {
    marginHorizontal: 20,
    marginTop: 24,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  contactText: { marginTop: 12 },
  contactTitle: { fontSize: 17, fontWeight: '600' },
  contactSubtitle: { fontSize: 14, marginTop: 4, lineHeight: 20 },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 10,
    marginTop: 16,
  },
  contactBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
