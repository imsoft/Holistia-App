import type { Session } from '@supabase/supabase-js';
import { API_BASE_URL } from '@/constants/auth';

/**
 * Llama a una API de la web con el token de sesión.
 * Usado por expert, admin, paciente para endpoints que requieren auth.
 */
export async function webApiFetch(
  path: string,
  session: Session | null,
  options: RequestInit = {}
): Promise<Response> {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
  const headers: HeadersInit = {
    'X-Holistia-Mobile': '1',
    ...(options.headers as Record<string, string>),
  };
  if (!(options.body instanceof FormData)) {
    (headers as Record<string, string>)['Content-Type'] = 'application/json';
  }
  if (session?.access_token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${session.access_token}`;
  }
  return fetch(url, { ...options, headers });
}
