import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/stores/auth-store';
import { adminApiJson } from '@/lib/admin-api';

type Message = { id: string; role: 'user' | 'assistant'; content: string };

export default function AdminAIAgentScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const session = useAuthStore((s) => s.session);
  const c = useColorScheme() === 'dark' ? Colors.dark : Colors.light;

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    try {
      const data = await adminApiJson<{ message: string }>('/api/ai-agent/chat', session, {
        method: 'POST',
        body: JSON.stringify({
          query: text,
          conversationHistory: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message ?? 'Sin respuesta',
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'assistant', content: `Error: ${(e as Error).message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 0 && (
          <Text style={[styles.placeholder, { color: c.mutedForeground }]}>
            Escribe un mensaje para el asistente IA de Holistia.
          </Text>
        )}
        {messages.map((m) => (
          <View
            key={m.id}
            style={[
              styles.bubble,
              m.role === 'user' ? [styles.userBubble, { backgroundColor: c.primary }] : [styles.assistantBubble, { backgroundColor: c.card }],
            ]}
          >
            <Text
              style={[
                styles.bubbleText,
                { color: m.role === 'user' ? c.primaryForeground : c.foreground },
              ]}
            >
              {m.content}
            </Text>
          </View>
        ))}
        {loading && (
          <View style={[styles.bubble, styles.assistantBubble, { backgroundColor: c.card }]}>
            <ActivityIndicator size="small" color={c.primary} />
          </View>
        )}
        <View style={styles.bottomPad} />
      </ScrollView>
      <View style={[styles.footer, { backgroundColor: c.background, borderTopColor: c.border }]}>
        <TextInput
          style={[styles.input, { backgroundColor: c.card, color: c.foreground, borderColor: c.border }]}
          placeholder="Mensaje..."
          placeholderTextColor={c.mutedForeground}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={2000}
          editable={!loading}
        />
        <Pressable
          style={[styles.sendBtn, { backgroundColor: c.primary }]}
          onPress={send}
          disabled={loading || !input.trim()}
        >
          <Text style={[styles.sendBtnText, { color: c.primaryForeground }]}>Enviar</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 24 },
  placeholder: { textAlign: 'center', padding: 24, fontSize: 14 },
  bubble: { maxWidth: '85%', padding: 12, borderRadius: 16, marginBottom: 8 },
  userBubble: { alignSelf: 'flex-end' },
  assistantBubble: { alignSelf: 'flex-start' },
  bubbleText: { fontSize: 15 },
  bottomPad: { height: 16 },
  footer: { borderTopWidth: 1, padding: 12, gap: 8 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 16, minHeight: 44 },
  sendBtn: { padding: 14, borderRadius: 12, alignItems: 'center' },
  sendBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
