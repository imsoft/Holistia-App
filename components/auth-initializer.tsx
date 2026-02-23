import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useAuthStore } from '@/stores/auth-store';
import { registerForPushNotifications } from '@/lib/push-notifications';

export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((s) => s.initialize);
  const session = useAuthStore((s) => s.session);

  useEffect(() => {
    const unsubscribe = initialize();
    return unsubscribe;
  }, [initialize]);

  // Registrar token de push cuando hay sesión (solo en dispositivo nativo)
  useEffect(() => {
    if (Platform.OS === 'web' || !session?.user?.id) return;
    registerForPushNotifications(session.user.id).catch(() => {});
  }, [session?.user?.id]);

  return <>{children}</>;
}
