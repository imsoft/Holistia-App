import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API_BASE_URL } from "@/constants/auth";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Image } from "expo-image";
import { Link } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const LOGO_URL = "https://www.holistia.io/logos/holistia-black.png";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const colorScheme = useColorScheme();

  const isDark = colorScheme === "dark";
  const c = isDark ? Colors.dark : Colors.light;
  const bgColor = c.background;
  const textColor = c.foreground;

  const handleSubmit = async () => {
    setError(null);
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError("Ingresa tu correo electrónico");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError("Ingresa un correo electrónico válido");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al enviar el correo");
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError("Ocurrió un error inesperado. Por favor, intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View style={[styles.container, { backgroundColor: bgColor }]}>
        <ScrollView contentContainerStyle={styles.successScroll}>
          <View style={styles.header}>
            <Image
              source={{ uri: LOGO_URL }}
              style={styles.logo}
              contentFit="contain"
            />
            <Text style={[styles.title, { color: textColor }]}>
              Email enviado
            </Text>
          </View>

          <View
            style={[
              styles.card,
              { backgroundColor: c.card, borderColor: c.border },
            ]}
          >
            <View style={[styles.successIcon, { backgroundColor: c.accent }]}>
              <Text style={[styles.checkmark, { color: c.primary }]}>✓</Text>
            </View>
            <Text style={[styles.successTitle, { color: textColor }]}>
              ¡Email enviado exitosamente!
            </Text>
            <Text style={[styles.successText, { color: textColor }]}>
              Te hemos enviado un enlace para restablecer tu contraseña. Revisa
              tu correo electrónico y haz clic en el enlace para continuar.
            </Text>
            <Link href="/(auth)/reset-password" asChild>
              <Pressable style={styles.backLinkWrapper}>
                <Text style={[styles.backLink, { color: c.primary }]}>
                  Ya tengo el enlace → Restablecer contraseña
                </Text>
              </Pressable>
            </Link>
            <Link href="/(auth)/login">
              <Text style={[styles.backLink, { color: c.primary }]}>
                ← Volver al inicio de sesión
              </Text>
            </Link>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: bgColor }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Image
            source={{ uri: LOGO_URL }}
            style={styles.logo}
            contentFit="contain"
          />
          <Text style={[styles.title, { color: textColor }]}>
            ¿Olvidaste tu contraseña?
          </Text>
          <Text style={[styles.subtitle, { color: textColor }]}>
            Ingresa tu correo electrónico y te enviaremos un enlace para
            restablecer tu contraseña.
          </Text>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: c.card, borderColor: c.border },
          ]}
        >
          {error ? (
            <View
              style={[styles.errorBox, { backgroundColor: c.destructiveMuted }]}
            >
              <Text style={[styles.errorText, { color: c.destructive }]}>
                {error}
              </Text>
            </View>
          ) : null}

          <Input
            label="Correo electrónico"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Button
            title={loading ? "Enviando..." : "Enviar enlace"}
            onPress={handleSubmit}
            loading={loading}
          />
        </View>

        <View style={styles.backLinkWrapper}>
          <Link href="/(auth)/login">
            <Text style={[styles.backLink, { color: c.primary }]}>
              ← Volver al inicio de sesión
            </Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  successScroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  logo: {
    width: 48,
    height: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    opacity: 0.8,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
  },
  errorBox: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  checkmark: {
    fontSize: 32,
    fontWeight: "bold",
  },
  successTitle: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
  },
  successText: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
    opacity: 0.9,
  },
  backLinkWrapper: {
    marginTop: 10,
    paddingTop: 10,
    alignSelf: "stretch",
    alignItems: "center",
  },
  backLink: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
});
