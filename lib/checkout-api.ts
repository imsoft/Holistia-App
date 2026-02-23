import { supabase } from '@/lib/supabase';
import { API_BASE_URL } from '@/constants/auth';

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  return {
    'Content-Type': 'application/json',
    'X-Holistia-Mobile': '1',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export type EventCheckoutResult = { url: string } | { error: string };
export type FreeRegisterResult = { success: true; message: string } | { error: string };
export type ChallengeCheckoutResult = { url?: string; success?: true; message?: string; error?: string };
export type ProductCheckoutResult = { url?: string; success?: true; message?: string; purchase_id?: string; free?: true; error?: string };

export async function createEventCheckout(eventId: string, serviceAmount: number, extra?: {
  notes?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  special_requirements?: string;
}): Promise<EventCheckoutResult> {
  const res = await fetch(`${API_BASE_URL}/api/stripe/event-checkout`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({
      event_id: eventId,
      service_amount: serviceAmount,
      ...extra,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error ?? 'Error al crear sesión de pago' };
  if (!data.url) return { error: 'No se recibió URL de pago' };
  return { url: data.url };
}

export async function freeRegisterEvent(eventId: string): Promise<FreeRegisterResult> {
  const res = await fetch(`${API_BASE_URL}/api/events/free-register`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ event_id: eventId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error ?? 'Error al registrarse' };
  return { success: true, message: data.message ?? 'Registro confirmado' };
}

export async function createChallengeCheckout(challengeId: string): Promise<ChallengeCheckoutResult> {
  const res = await fetch(`${API_BASE_URL}/api/stripe/challenge-checkout`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ challenge_id: challengeId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error ?? 'Error al unirse al reto' };
  if (data.free || data.success) return { success: true, message: data.message ?? 'Te has unido al reto' };
  if (!data.url) return { error: 'No se recibió URL de pago' };
  return { url: data.url };
}

export async function createProductCheckout(productId: string): Promise<ProductCheckoutResult> {
  const res = await fetch(`${API_BASE_URL}/api/stripe/digital-product-checkout`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ product_id: productId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data.error ?? 'Error al procesar la compra' };
  if (data.free || data.success) return { success: true, message: data.message ?? 'Acceso otorgado', purchase_id: data.purchase_id };
  if (!data.url) return { error: 'No se recibió URL de pago' };
  return { url: data.url };
}
