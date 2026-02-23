/**
 * Utilidades para evitar doble reserva: mismo profesional no puede tener
 * dos citas que se solapen en fecha y hora.
 */

export type AppointmentSlot = {
  appointment_time: string;
  duration_minutes: number;
};

function timeToMinutes(time: string): number {
  const normalized = typeof time === 'string' ? time.trim() : '';
  const [h, m] = normalized.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function slotsOverlap(
  newSlot: { appointment_time: string; duration_minutes: number },
  existing: AppointmentSlot[]
): boolean {
  const newStart = timeToMinutes(newSlot.appointment_time);
  const newEnd = newStart + (newSlot.duration_minutes ?? 0);

  for (const app of existing) {
    const start = timeToMinutes(app.appointment_time);
    const end = start + (app.duration_minutes ?? 0);
    if (newStart < end && newEnd > start) return true;
  }
  return false;
}
