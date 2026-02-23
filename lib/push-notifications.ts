import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

// Comportamiento al recibir una notificación con la app en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Solicita permiso, obtiene el token Expo Push y lo guarda en Supabase (user_push_tokens).
 * Debe llamarse con el usuario ya autenticado.
 */
export async function registerForPushNotifications(
  userId: string
): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
    if (finalStatus !== 'granted') return null;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? undefined,
  });
  const token = tokenData?.data;
  if (!token) return null;

  const platform = Platform.OS === 'ios' ? 'ios' : 'android';

  try {
    await supabase.from('user_push_tokens').upsert(
      {
        user_id: userId,
        expo_push_token: token,
        platform,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,expo_push_token',
      }
    );
  } catch (e) {
    console.warn('Push token save failed:', e);
  }

  return token;
}

/**
 * Elimina el token actual del usuario (cuando desactiva notificaciones push en privacidad).
 */
export async function removePushToken(userId: string): Promise<void> {
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? undefined,
    }).catch(() => null);
    const token = tokenData?.data;
    if (token) {
      await supabase
        .from('user_push_tokens')
        .delete()
        .eq('user_id', userId)
        .eq('expo_push_token', token);
    }
  } catch (e) {
    console.warn('Push token remove failed:', e);
  }
}
