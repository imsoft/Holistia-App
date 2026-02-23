import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Alert,
  Linking,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useAuthStore } from '@/stores/auth-store';
import { useProfessionalStore } from '@/stores/professional-store';
import { fetchConversation, fetchMessages, sendMessage, markConversationAsRead } from '@/lib/chat';
import { supabase } from '@/lib/supabase';
import { webApiFetch } from '@/lib/web-api';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/** Detecta si el contenido es un mensaje de cotización con enlace de pago */
function parseQuotePaymentContent(content: string): { priceLine?: string; paymentUrl: string } | null {
  const urlMatch = content.match(/Puedes pagar aquí:\s*(https?:\/\/[^\s\n]+)/i);
  if (!urlMatch?.[1]) return null;
  const paymentUrl = urlMatch[1].trim();
  const cotizacionMatch = content.match(/💳\s*Cotización:\s*([^\n]+)/i) ?? content.match(/Cotización:\s*([^\n]+)/i);
  const priceLine = cotizacionMatch?.[1]?.trim();
  return { priceLine, paymentUrl };
}

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useAuthStore((s) => s.session);
  const professional = useProfessionalStore((s) => s.professional);
  const [conversation, setConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isProf, setIsProf] = useState(false);
  const [quoteServices, setQuoteServices] = useState<any[]>([]);
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [quoteService, setQuoteService] = useState<any>(null);
  const [quoteAmount, setQuoteAmount] = useState('');
  const [quoteOptionalMessage, setQuoteOptionalMessage] = useState('');
  const [quoteSending, setQuoteSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const colorScheme = useColorScheme();
  const c = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const checkProfessional = useCallback(async () => {
    if (!session?.user?.id) return false;
    const { data } = await supabase
      .from('professional_applications')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('status', 'approved')
      .maybeSingle();
    return !!data;
  }, [session?.user?.id]);

  const load = useCallback(async () => {
    if (!id || !session) return;
    setLoading(true);
    try {
      const prof = await checkProfessional();
      setIsProf(prof);
      const [conv, msgs] = await Promise.all([
        fetchConversation(id),
        fetchMessages(id),
      ]);
      setConversation(conv);
      setMessages(msgs);
      await markConversationAsRead(id, prof);

      if (prof && conv?.professional_id) {
        const { data } = await supabase
          .from('professional_services')
          .select('id, name')
          .eq('professional_id', conv.professional_id)
          .eq('pricing_type', 'quote');
        setQuoteServices(data || []);
      }
    } catch (e) {
      console.error('Conversation load error:', e);
    } finally {
      setLoading(false);
    }
  }, [id, session?.user?.id, checkProfessional]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`messages:${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `conversation_id=eq.${id}`,
        },
        () => fetchMessages(id).then(setMessages)
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || !id || sending) return;

    setSending(true);
    setInput('');
    try {
      const newMsg = await sendMessage(id, content, isProf ? 'professional' : 'user');
      setMessages((prev) => [...prev, newMsg]);
      flatListRef.current?.scrollToEnd({ animated: true });
    } catch (e) {
      console.error('Send error:', e);
      setInput(content);
    } finally {
      setSending(false);
    }
  };

  const handleSendQuote = async () => {
    if (!id || !session || !conversation || !quoteService || quoteSending) return;
    const amount = parseFloat(quoteAmount.replace(/[^0-9.]/g, ''));
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Ingresa un monto válido.');
      return;
    }
    const patientId = conversation.user_id;
    if (!patientId) {
      Alert.alert('Error', 'No se pudo identificar al paciente.');
      return;
    }

    setQuoteSending(true);
    try {
      const res = await webApiFetch('/api/stripe/quote-payment-link', session, {
        method: 'POST',
        body: JSON.stringify({
          service_id: quoteService.id,
          amount,
          conversation_id: id,
          patient_id: patientId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Error al crear enlace');

      const priceText = `$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`;
      const parts: string[] = [];
      if (quoteOptionalMessage.trim()) parts.push(quoteOptionalMessage.trim());
      parts.push(`💳 Cotización: ${priceText}`);
      parts.push(`Puedes pagar aquí: ${data.url}`);

      const content = parts.join('\n\n');
      const metadata = data.payment_id ? { quote_payment_id: data.payment_id } : undefined;

      const newMsg = await sendMessage(id, content, 'professional', metadata);
      setMessages((prev) => [...prev, newMsg]);
      flatListRef.current?.scrollToEnd({ animated: true });

      setQuoteModalOpen(false);
      setQuoteService(null);
      setQuoteAmount('');
      setQuoteOptionalMessage('');
    } catch (e: unknown) {
      Alert.alert('Error', (e as Error)?.message ?? 'No se pudo enviar la cotización.');
    } finally {
      setQuoteSending(false);
    }
  };

  const handlePayQuote = (url: string) => {
    WebBrowser.openBrowserAsync(url);
  };

  const renderItem = ({ item }: { item: any }) => {
    const isMe = item.sender_id === session?.user?.id;
    const parsed = parseQuotePaymentContent(item.content);
    const isQuoteMessage = !!parsed;

    if (isQuoteMessage && !isMe) {
      return (
        <View style={[styles.bubbleRow, styles.bubbleRowThem]}>
          <View style={[styles.quoteBubble, { backgroundColor: c.card, borderColor: c.primary }]}>
            <View style={styles.quoteHeader}>
              <MaterialIcons name="credit-card" size={20} color={c.primary} />
              <Text style={[styles.quoteTitle, { color: c.foreground }]}>Cotización</Text>
            </View>
            {parsed.priceLine && (
              <Text style={[styles.quotePrice, { color: c.primary }]}>{parsed.priceLine}</Text>
            )}
            <Text style={[styles.quoteHint, { color: c.mutedForeground }]}>
              Toca el botón para pagar de forma segura
            </Text>
            <Pressable
              onPress={() => handlePayQuote(parsed.paymentUrl)}
              style={[styles.payBtn, { backgroundColor: c.primary }]}>
              <Text style={[styles.payBtnText, { color: c.primaryForeground }]}>Pagar cotización</Text>
            </Pressable>
            <Text style={[styles.bubbleTime, { color: c.mutedForeground }]}>
              {new Date(item.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>
      );
    }

    if (isQuoteMessage && isMe) {
      return (
        <View style={[styles.bubbleRow, styles.bubbleRowMe]}>
          <View style={[styles.bubble, styles.bubbleMe, { backgroundColor: c.primary }]}>
            <Text style={[styles.bubbleText, { color: c.primaryForeground }]}>{item.content}</Text>
            <Text style={[styles.bubbleTime, { color: 'rgba(255,255,255,0.7)' }]}>
              {new Date(item.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.bubbleRow, isMe ? styles.bubbleRowMe : styles.bubbleRowThem]}>
        <View
          style={[
            styles.bubble,
            isMe ? [styles.bubbleMe, { backgroundColor: c.primary }] : [styles.bubbleThem, { backgroundColor: c.muted }],
          ]}>
          <Text style={[styles.bubbleText, { color: isMe ? c.primaryForeground : c.foreground }]}>{item.content}</Text>
          <Text style={[styles.bubbleTime, { color: isMe ? 'rgba(255,255,255,0.7)' : c.mutedForeground }]}>
            {new Date(item.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  if (!conversation) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Text style={[styles.error, { color: c.foreground }]}>Conversación no encontrada</Text>
      </View>
    );
  }

  const other = conversation.other;
  const headerName = other?.name || 'Conversación';

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        {other?.avatar ? (
          <Image source={{ uri: other.avatar }} style={styles.headerAvatar} />
        ) : (
          <View style={[styles.headerAvatarPlaceholder, { backgroundColor: c.muted }]} />
        )}
        <Text style={[styles.headerName, { color: c.foreground }]}>{headerName}</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: c.mutedForeground }]}>
              Envía un mensaje para iniciar la conversación
            </Text>
          </View>
        }
      />

      <View style={[styles.inputRow, { backgroundColor: c.card, borderTopColor: c.border }]}>
        {isProf && quoteServices.length > 0 && (
          <Pressable
            onPress={() => setQuoteModalOpen(true)}
            style={[styles.quoteIconBtn, { backgroundColor: c.muted }]}>
            <MaterialIcons name="attach-money" size={24} color={c.foreground} />
          </Pressable>
        )}
        <TextInput
          style={[styles.input, { backgroundColor: c.muted, color: c.foreground }]}
          placeholder="Escribe un mensaje..."
          placeholderTextColor={c.mutedForeground}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={2000}
          editable={!sending}
        />
        <Pressable
          onPress={handleSend}
          disabled={!input.trim() || sending}
          style={[styles.sendBtn, { backgroundColor: c.primary }, (!input.trim() || sending) && styles.sendBtnDisabled]}>
          {sending ? (
            <ActivityIndicator size="small" color={c.primaryForeground} />
          ) : (
            <Text style={[styles.sendText, { color: c.primaryForeground }]}>Enviar</Text>
          )}
        </Pressable>
      </View>

      <Modal visible={quoteModalOpen} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setQuoteModalOpen(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: c.card }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: c.foreground }]}>Enviar cotización</Text>

            <Text style={[styles.modalLabel, { color: c.mutedForeground }]}>Servicio</Text>
            <View style={styles.serviceList}>
              {quoteServices.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => setQuoteService(s)}
                  style={[
                    styles.serviceItem,
                    { borderColor: c.border },
                    quoteService?.id === s.id && { borderColor: c.primary, backgroundColor: `${c.primary}15` },
                  ]}>
                  <Text style={[styles.serviceName, { color: c.foreground }]}>{s.name || 'Sin nombre'}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.modalLabel, { color: c.mutedForeground }]}>Monto (MXN)</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: c.background, color: c.foreground, borderColor: c.border }]}
              placeholder="Ej: 500"
              placeholderTextColor={c.mutedForeground}
              value={quoteAmount}
              onChangeText={setQuoteAmount}
              keyboardType="numeric"
            />

            <Text style={[styles.modalLabel, { color: c.mutedForeground }]}>Mensaje opcional</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea, { backgroundColor: c.background, color: c.foreground, borderColor: c.border }]}
              placeholder="Mensaje para el paciente"
              placeholderTextColor={c.mutedForeground}
              value={quoteOptionalMessage}
              onChangeText={setQuoteOptionalMessage}
              multiline
            />

            <View style={styles.modalActions}>
              <Pressable onPress={() => setQuoteModalOpen(false)} style={[styles.modalBtn, { borderColor: c.border }]}>
                <Text style={{ color: c.foreground }}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={handleSendQuote}
                disabled={!quoteService || !quoteAmount.trim() || quoteSending || isNaN(parseFloat(quoteAmount)) || parseFloat(quoteAmount) <= 0}
                style={[styles.modalBtn, styles.modalBtnPrimary, { backgroundColor: c.primary }]}>
                {quoteSending ? (
                  <ActivityIndicator size="small" color={c.primaryForeground} />
                ) : (
                  <Text style={{ color: c.primaryForeground, fontWeight: '600' }}>Enviar</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: { fontSize: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  headerAvatarPlaceholder: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  headerName: { fontSize: 17, fontWeight: '600' },
  list: { flexGrow: 1, padding: 16, paddingBottom: 8 },
  bubbleRow: { marginBottom: 12 },
  bubbleRowMe: { alignItems: 'flex-end' },
  bubbleRowThem: { alignItems: 'flex-start' },
  bubble: { maxWidth: '80%', padding: 12, borderRadius: 16, borderBottomRightRadius: 4 },
  bubbleMe: { borderBottomRightRadius: 16, borderBottomLeftRadius: 4 },
  bubbleThem: { borderBottomLeftRadius: 16, borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 15 },
  bubbleTime: { fontSize: 11, marginTop: 4 },
  quoteBubble: {
    maxWidth: '85%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderBottomLeftRadius: 4,
  },
  quoteHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  quoteTitle: { fontSize: 15, fontWeight: '600' },
  quotePrice: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  quoteHint: { fontSize: 13, marginBottom: 12 },
  payBtn: { paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginBottom: 8 },
  payBtnText: { fontSize: 16, fontWeight: '600' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 15 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
  },
  quoteIconBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
  },
  sendBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 22,
    justifyContent: 'center',
    minHeight: 44,
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendText: { fontSize: 16, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: { width: '100%', maxWidth: 400, borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  modalLabel: { fontSize: 14, marginBottom: 6 },
  serviceList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  serviceItem: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1 },
  serviceName: { fontSize: 14, fontWeight: '500' },
  modalInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 16, marginBottom: 16 },
  modalTextArea: { minHeight: 60 },
  modalActions: { flexDirection: 'row', gap: 12, justifyContent: 'flex-end', marginTop: 8 },
  modalBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, borderWidth: 1 },
  modalBtnPrimary: { borderWidth: 0 },
});
