/**
 * Lógica de disponibilidad para slots de citas (app móvil).
 * Versión simplificada de la web.
 */

function parseLocalDate(dateString: string): Date {
  const datePart = dateString.split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function timeToMinutes(time: string): number {
  const [h, m] = time.substring(0, 5).split(':').map(Number);
  return h * 60 + (m || 0);
}

/** Día de semana: 1=Lun ... 7=Dom */
function getDayOfWeekFromDate(dateString: string): number {
  const d = parseLocalDate(dateString);
  return d.getDay() === 0 ? 7 : d.getDay();
}

export interface BlockData {
  block_type: string;
  start_date: string;
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  day_of_week?: number | null;
  is_recurring?: boolean;
}

interface WorkingHoursData {
  working_start_time: string;
  working_end_time: string;
  working_days: number[];
  per_day_schedule?: Record<string, { start: string; end: string }> | null;
}

function getWorkingHoursForDay(dayOfWeek: number, wh: WorkingHoursData): { start: string; end: string } {
  if (wh.per_day_schedule) {
    const dayStr = String(dayOfWeek);
    const s = wh.per_day_schedule[dayStr];
    if (s?.start && s?.end) return s;
  }
  return { start: wh.working_start_time, end: wh.working_end_time };
}

function doesBlockApplyToDate(date: string, block: BlockData): boolean {
  const currentDate = parseLocalDate(date);
  currentDate.setHours(0, 0, 0, 0);
  const dayOfWeek = getDayOfWeekFromDate(date);

  const blockStart = parseLocalDate(block.start_date);
  const blockEnd = block.end_date ? parseLocalDate(block.end_date) : blockStart;
  blockStart.setHours(0, 0, 0, 0);
  blockEnd.setHours(0, 0, 0, 0);
  const isInDateRange = currentDate >= blockStart && currentDate <= blockEnd;

  if (block.block_type === 'full_day' && !block.start_time && !block.end_time) {
    return isInDateRange;
  }
  if (block.block_type === 'time_range' || (block.start_time && block.end_time)) {
    return isInDateRange;
  }
  return isInDateRange;
}

function doesBlockCoverTime(time: string, block: BlockData, slotDuration = 50): boolean {
  if ((block.block_type === 'full_day' || block.block_type === 'weekly_day') && !block.start_time && !block.end_time) {
    return true;
  }
  if (block.start_time && block.end_time) {
    const blockStart = timeToMinutes(block.start_time);
    const blockEnd = timeToMinutes(block.end_time);
    const slotStart = timeToMinutes(time);
    const slotEnd = slotStart + slotDuration;
    return slotStart < blockEnd && slotEnd > blockStart;
  }
  return false;
}

export function isSlotBlocked(date: string, time: string, blocks: BlockData[], slotDuration = 50): boolean {
  return blocks.some((b) => doesBlockApplyToDate(date, b) && doesBlockCoverTime(time, b, slotDuration));
}

function isFullDayBlocked(date: string, blocks: BlockData[]): boolean {
  return blocks.some((b) => {
    if (!doesBlockApplyToDate(date, b)) return false;
    return (b.block_type === 'full_day' || b.block_type === 'weekly_day') && !b.start_time && !b.end_time;
  });
}

export interface TimeSlot {
  time: string;
  display: string;
  status: 'available' | 'occupied' | 'blocked' | 'not_offered';
}

export async function getTimeSlotsForDate(
  supabase: any,
  professionalId: string,
  date: string,
  slotDuration: number
): Promise<TimeSlot[]> {
  const [profRes, aptRes, blocksRes] = await Promise.all([
    supabase.from('professional_applications').select('working_start_time, working_end_time, working_days, per_day_schedule').eq('id', professionalId).single(),
    supabase.from('appointments').select('appointment_time, duration_minutes').eq('professional_id', professionalId).eq('appointment_date', date).not('status', 'eq', 'cancelled'),
    supabase.from('availability_blocks').select('*').eq('professional_id', professionalId),
  ]);

  const wh = profRes.data;
  if (!wh) return [];

  const workingDays = wh.working_days?.length ? wh.working_days : [1, 2, 3, 4, 5];
  const dayOfWeek = getDayOfWeekFromDate(date);
  if (!workingDays.includes(dayOfWeek)) return [];

  const dayHours = getWorkingHoursForDay(dayOfWeek, {
    ...wh,
    working_days: workingDays,
    working_start_time: wh.working_start_time || '09:00',
    working_end_time: wh.working_end_time || '18:00',
  });
  const [startH, startM] = dayHours.start.split(':').map(Number);
  const [endH, endM] = dayHours.end.split(':').map(Number);
  const startMinutes = startH * 60 + (startM || 0);
  const endMinutes = endH * 60 + (endM || 0);

  const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
  const isToday = date === todayStr;
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();

  const blocks = (blocksRes.data || []) as BlockData[];
  const appointments = aptRes.data || [];

  const slots: TimeSlot[] = [];
  for (let mins = startMinutes; mins < endMinutes; mins += 30) {
    if (isToday && mins <= nowMinutes) continue;

    const hour = Math.floor(mins / 60);
    const minute = mins % 60;
    const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

    let status: TimeSlot['status'] = 'available';
    if (isFullDayBlocked(date, blocks)) status = 'blocked';
    else if (
      appointments.some((a: any) => {
        const aptTime = String(a.appointment_time).substring(0, 5);
        const aptStart = timeToMinutes(aptTime);
        const aptDuration = a.duration_minutes ?? 50;
        const aptEnd = aptStart + aptDuration;
        const slotEnd = mins + slotDuration;
        return mins < aptEnd && slotEnd > aptStart;
      })
    ) {
      status = 'occupied';
    } else if (isSlotBlocked(date, timeStr, blocks, slotDuration)) {
      status = 'blocked';
    }

    slots.push({ time: timeStr, display: timeStr.substring(0, 5), status });
  }
  return slots;
}
