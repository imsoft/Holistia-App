/**
 * Estado del pago de inscripción (paridad con web).
 */
export function getRegistrationFeeStatus(
  paid: boolean | undefined,
  expiresAt: string | undefined | null
): {
  isActive: boolean;
  isExpired: boolean;
  isNearExpiration: boolean;
  daysRemaining: number | null;
  message: string;
  color: 'green' | 'yellow' | 'red' | 'gray';
} {
  if (!paid) {
    return {
      isActive: false,
      isExpired: false,
      isNearExpiration: false,
      daysRemaining: null,
      message: 'Pago pendiente',
      color: 'gray',
    };
  }
  const days = daysUntilExpiration(expiresAt);
  const expired = isExpired(expiresAt);
  const nearExpiration = isExpirationNear(expiresAt);
  if (expired) {
    return {
      isActive: false,
      isExpired: true,
      isNearExpiration: false,
      daysRemaining: days,
      message: 'Pago expirado - Requiere renovación',
      color: 'red',
    };
  }
  if (nearExpiration) {
    return {
      isActive: true,
      isExpired: false,
      isNearExpiration: true,
      daysRemaining: days,
      message: `Expira en ${days} día${days !== 1 ? 's' : ''}`,
      color: 'yellow',
    };
  }
  return {
    isActive: true,
    isExpired: false,
    isNearExpiration: false,
    daysRemaining: days,
    message: 'Pago vigente',
    color: 'green',
  };
}

function daysUntilExpiration(expiresAt: string | undefined | null): number | null {
  if (!expiresAt) return null;
  const expirationDate = new Date(expiresAt);
  const now = new Date();
  return Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function isExpired(expiresAt: string | undefined | null): boolean {
  const days = daysUntilExpiration(expiresAt);
  return days !== null && days < 0;
}

function isExpirationNear(expiresAt: string | undefined | null): boolean {
  const days = daysUntilExpiration(expiresAt);
  return days !== null && days > 0 && days <= 30;
}

export function formatExpirationDate(expiresAt: string | undefined | null): string {
  if (!expiresAt) return 'No disponible';
  return new Date(expiresAt).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
