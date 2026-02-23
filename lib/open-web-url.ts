import { Linking } from 'react-native';
import { API_BASE_URL } from '@/constants/auth';

/**
 * Abre una URL de la web de Holistia en el navegador.
 * Se usa para: checkout Stripe, registro en eventos/retos/programas,
 * editar perfil completo, volverme profesional, etc.
 */
export async function openWebUrl(path: string): Promise<void> {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
  const can = await Linking.canOpenURL(url);
  if (can) {
    await Linking.openURL(url);
  } else {
    console.warn('No se puede abrir:', url);
  }
}

export function eventDetailUrl(eventId: string): string {
  return `/explore/event/${eventId}`;
}

export function challengeDetailUrl(challengeIdOrSlug: string): string {
  return `/explore/challenge/${challengeIdOrSlug}`;
}

export function programDetailUrl(slugOrId: string): string {
  return `/explore/program/${slugOrId}`;
}

export function becomeProfessionalUrl(userId: string): string {
  return `/patient/${userId}/explore/become-professional`;
}
