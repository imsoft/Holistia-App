import { useEffect } from 'react';
import { Linking, Alert } from 'react-native';
import { useRouter } from 'expo-router';

/**
 * Maneja deep links: checkout-success/cancel, google-calendar-success/error.
 */
export function CheckoutDeepLinkHandler() {
  const router = useRouter();

  useEffect(() => {
    const handleUrl = (url: string) => {
      if (url === 'holistia://google-calendar-success') {
        router.replace('/(expert)/schedule' as any);
        return;
      }
      if (url.startsWith('holistia://google-calendar-error')) {
        try {
          const parsed = new URL(url);
          const message = parsed.searchParams.get('message') || 'No se pudo conectar Google Calendar.';
          router.replace('/(expert)/schedule' as any);
          setTimeout(() => {
            Alert.alert('Error al conectar Google Calendar', decodeURIComponent(message), [
              { text: 'Entendido' },
            ]);
          }, 300);
        } catch {
          router.replace('/(expert)/schedule' as any);
          Alert.alert('Error', 'No se pudo conectar Google Calendar. Puedes intentar de nuevo en Horarios.');
        }
        return;
      }
      if (!url.startsWith('holistia://checkout-')) return;
      const parsed = new URL(url);
      const path = parsed.pathname || parsed.hostname || '';
      const result = path.replace('checkout-', '') || parsed.searchParams.get('result') || 'success';
      const type = parsed.searchParams.get('type');
      const appointmentId = parsed.searchParams.get('appointment_id');
      const purchaseId = parsed.searchParams.get('purchase_id');

      if (result === 'cancel') {
        if (type === 'registration') {
          router.replace('/(patient)/become-professional' as any);
        } else {
          router.replace('/(patient)/appointments' as any);
        }
        return;
      }

      if (result === 'success') {
        if (type === 'appointment' && appointmentId) {
          router.replace(`/(patient)/appointments/confirmation?appointment_id=${appointmentId}` as any);
        } else if (type === 'product' && purchaseId) {
          router.replace(`/(patient)/product-confirmation?purchase_id=${purchaseId}` as any);
        } else if (type === 'registration') {
          router.replace('/(patient)/become-professional' as any);
        } else {
          router.replace('/(patient)/appointments' as any);
        }
      }
    };

    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));

    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    return () => sub.remove();
  }, [router]);

  return null;
}
