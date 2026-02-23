import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const BENEFITS = [
  {
    title: 'Llega a más personas',
    description:
      'Los eventos aparecen en la plataforma y pueden ser descubiertos por miles de usuarios interesados en bienestar.',
    icon: 'people' as const,
  },
  {
    title: 'Genera ingresos extra',
    description:
      'Cobra por talleres, retiros o sesiones grupales. Recibe los pagos de forma segura con Stripe.',
    icon: 'attach-money' as const,
  },
  {
    title: 'Visibilidad y promoción',
    description:
      'Tu evento se muestra en el explorador de Holistia y puede incluirse en comunicaciones de la plataforma.',
    icon: 'campaign' as const,
  },
  {
    title: 'Gestiona inscripciones',
    description: 'Controla el cupo, revisa asistentes y confirma registros desde un solo lugar.',
    icon: 'assessment' as const,
  },
];

const FEATURES = [
  'Página pública del evento con toda la información',
  'Pagos seguros y cobro de inscripciones',
  'Confirmaciones y recordatorios por email',
  'Códigos de confirmación para el check-in',
];

const MAILTO_CREATE = 'mailto:hola@holistia.io?subject=Quiero crear un evento en Holistia';
const MAILTO_PROPOSAL = 'mailto:hola@holistia.io?subject=Propuesta de evento para Holistia';

export default function ExpertMyEventsScreen() {
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  const openMail = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: c.background }]}
      contentContainerStyle={styles.content}>
      <View style={[styles.ctaCard, { backgroundColor: `${c.primary}12`, borderColor: `${c.primary}40` }]}>
        <MaterialIcons name="auto-awesome" size={48} color={c.primary} style={styles.ctaIcon} />
        <Text style={[styles.ctaTitle, { color: c.foreground }]}>¿Quieres crear un evento o taller?</Text>
        <Text style={[styles.ctaDesc, { color: c.mutedForeground }]}>
          Talleres, retiros, círculos y sesiones grupales tienen cabida en Holistia. Cuéntanos tu idea y te
          ayudamos a publicarlo y vender entradas.
        </Text>
        <Pressable
          onPress={() => openMail(MAILTO_CREATE)}
          style={[styles.primaryBtn, { backgroundColor: c.primary }]}>
          <MaterialIcons name="email" size={20} color={c.primaryForeground} />
          <Text style={[styles.primaryBtnText, { color: c.primaryForeground }]}>Contactar a Holistia</Text>
        </Pressable>
        <Text style={[styles.ctaHint, { color: c.mutedForeground }]}>
          Escríbenos a{' '}
          <Text style={[styles.link, { color: c.primary }]} onPress={() => openMail('mailto:hola@holistia.io')}>
            hola@holistia.io
          </Text>
        </Text>
      </View>

      <Text style={[styles.sectionTitle, { color: c.foreground }]}>Beneficios de crear eventos en Holistia</Text>
      {BENEFITS.map((item) => (
        <View key={item.title} style={[styles.benefitCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={[styles.benefitIconWrap, { backgroundColor: `${c.primary}20` }]}>
            <MaterialIcons name={item.icon} size={24} color={c.primary} />
          </View>
          <View style={styles.benefitText}>
            <Text style={[styles.benefitTitle, { color: c.foreground }]}>{item.title}</Text>
            <Text style={[styles.benefitDesc, { color: c.mutedForeground }]}>{item.description}</Text>
          </View>
        </View>
      ))}

      <Text style={[styles.sectionTitle, { color: c.foreground }]}>Qué incluye cuando publicas un evento</Text>
      <View style={[styles.featuresCard, { backgroundColor: c.card, borderColor: c.border }]}>
        {FEATURES.map((line) => (
          <View key={line} style={styles.featureRow}>
            <MaterialIcons name="check-circle" size={20} color={c.primary} />
            <Text style={[styles.featureText, { color: c.mutedForeground }]}>{line}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.finalCard, { backgroundColor: c.muted + '40', borderColor: c.border }]}>
        <Text style={[styles.finalText, { color: c.mutedForeground }]}>
          ¿Tienes una idea de taller, retiro o evento? El equipo de Holistia te acompaña en todo el proceso.
        </Text>
        <Pressable
          onPress={() => openMail(MAILTO_PROPOSAL)}
          style={[styles.outlineBtn, { borderColor: c.border }]}>
          <MaterialIcons name="email" size={20} color={c.foreground} />
          <Text style={[styles.outlineBtnText, { color: c.foreground }]}>Enviar propuesta</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  ctaCard: {
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 28,
  },
  ctaIcon: { marginBottom: 12 },
  ctaTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  ctaDesc: { fontSize: 14, textAlign: 'center', marginBottom: 20, lineHeight: 22 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '600' },
  ctaHint: { fontSize: 12, marginTop: 16 },
  link: { fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  benefitCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  benefitIconWrap: { width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  benefitText: { flex: 1 },
  benefitTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  benefitDesc: { fontSize: 13, lineHeight: 20 },
  featuresCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  featureText: { fontSize: 14, flex: 1 },
  finalCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  finalText: { fontSize: 14, textAlign: 'center', marginBottom: 16 },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
  },
  outlineBtnText: { fontSize: 15, fontWeight: '600' },
});
