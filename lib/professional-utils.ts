export type ServiceModality = 'presencial' | 'online' | 'both';

export interface Service {
  name: string;
  description?: string;
  presencialCost?: string | number;
  onlineCost?: string | number;
  modality?: ServiceModality;
}

interface DatabaseService {
  name: string;
  description?: string;
  modality?: 'presencial' | 'online' | 'both';
  cost?: number | null;
  presencial_cost?: number | null;
  online_cost?: number | null;
}

export function transformServicesFromDB(services: DatabaseService[]): Service[] {
  if (!services || services.length === 0) return [];
  return services.map((s) => ({
    name: s.name || '',
    description: s.description,
    presencialCost: (s.presencial_cost ?? s.cost) as string | number | undefined,
    onlineCost: (s.online_cost ?? s.cost) as string | number | undefined,
    modality: s.modality,
  }));
}

export function determineProfessionalModality(services: Service[]): ServiceModality {
  if (!services || services.length === 0) return 'presencial';
  const hasPresencial = services.some(
    (s) =>
      s.modality === 'presencial' ||
      s.modality === 'both' ||
      (s.presencialCost && Number(s.presencialCost) > 0)
  );
  const hasOnline = services.some(
    (s) =>
      s.modality === 'online' ||
      s.modality === 'both' ||
      (s.onlineCost && Number(s.onlineCost) > 0)
  );
  if (hasPresencial && hasOnline) return 'both';
  if (hasOnline) return 'online';
  return 'presencial';
}
