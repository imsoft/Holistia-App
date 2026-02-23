import { API_BASE_URL } from '@/constants/auth';

export type Specialty = { name: string; count: number; slug: string };

export async function fetchSpecialties(): Promise<{ specialties: Specialty[]; total: number }> {
  const base = API_BASE_URL.replace(/\/$/, '');
  const res = await fetch(`${base}/api/specialties`);
  if (!res.ok) throw new Error('Error al cargar especialidades');
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return { specialties: data.specialties || [], total: data.total ?? 0 };
}

export type SpecialtyProfessional = {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  profession: string | null;
  biography: string | null;
  profile_photo: string | null;
  city: string | null;
  state: string | null;
};

export async function fetchSpecialtyBySlug(
  slug: string
): Promise<{ profession: string; professionals: SpecialtyProfessional[]; count: number }> {
  const base = API_BASE_URL.replace(/\/$/, '');
  const res = await fetch(`${base}/api/specialties/${encodeURIComponent(slug)}`);
  if (!res.ok) throw new Error('Error al cargar la especialidad');
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return {
    profession: data.profession ?? slug,
    count: data.count ?? 0,
    professionals: data.professionals ?? [],
  };
}
