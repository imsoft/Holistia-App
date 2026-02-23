import type { Session } from '@supabase/supabase-js';
import { API_BASE_URL } from '@/constants/auth';

/**
 * Llama a una API de la web (admin) con el token de sesión.
 * Útil para endpoints que requieren auth y lógica server-side.
 */
export async function adminApiFetch(
  path: string,
  session: Session | null,
  options: RequestInit = {}
): Promise<Response> {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (session?.access_token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${session.access_token}`;
  }
  return fetch(url, { ...options, headers });
}

export async function adminApiJson<T>(
  path: string,
  session: Session | null,
  options: RequestInit = {}
): Promise<T> {
  const res = await adminApiFetch(path, session, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}
