import { supabase } from '@/lib/supabase';

const PROFESSIONAL_SHARE = 0.85;

export type AppointmentForDashboard = {
  id: string;
  date: string;
  time: string;
  duration: number;
  type: string;
  status: string;
  patient: { name: string; email: string; phone: string };
  location?: string;
  notes?: string;
};

export type DashboardStats = {
  upcomingCount: number;
  upcomingChange: number;
  activePatients: number;
  weeklyChange: number;
  totalRevenue: number;
  servicesCount: number;
  challengesCount: number;
  digitalProductsCount: number;
  eventsCount: number;
};

export type MonthlyMetrics = {
  profileViews: number;
  bookings: number;
  income: number;
};

export async function fetchDashboardData(professionalId: string, userId: string) {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().split('T')[0];
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString();
  const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999).toISOString();

  const [
    appointmentsRes,
    allAppointmentsRes,
    profileViewsRes,
    bookingsRes,
    incomeRes,
    servicesRes,
    challengesRes,
    digitalRes,
    eventsRes,
  ] = await Promise.all([
    supabase
      .from('appointments')
      .select('id, appointment_date, appointment_time, duration_minutes, appointment_type, status, location, notes, patient_id')
      .eq('professional_id', professionalId)
      .gte('appointment_date', today)
      .in('status', ['pending', 'confirmed', 'completed'])
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true })
      .limit(10),
    supabase
      .from('appointments')
      .select('id, appointment_date, patient_id')
      .eq('professional_id', professionalId)
      .in('status', ['pending', 'confirmed', 'completed']),
    supabase
      .from('professional_profile_views')
      .select('id', { count: 'exact', head: true })
      .eq('professional_id', professionalId)
      .gte('viewed_at', startOfMonth)
      .lte('viewed_at', endOfMonth),
    supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('professional_id', professionalId)
      .gte('created_at', startOfMonth)
      .lte('created_at', endOfMonth),
    supabase
      .from('payments')
      .select('transfer_amount, amount')
      .eq('professional_id', professionalId)
      .eq('status', 'succeeded')
      .gte('created_at', startOfMonth)
      .lte('created_at', endOfMonth),
    supabase
      .from('professional_services')
      .select('id', { count: 'exact', head: true })
      .eq('professional_id', professionalId),
    supabase
      .from('challenges')
      .select('id', { count: 'exact', head: true })
      .eq('created_by_user_id', userId)
      .eq('created_by_type', 'professional'),
    supabase
      .from('digital_products')
      .select('id', { count: 'exact', head: true })
      .eq('professional_id', professionalId),
    supabase
      .from('events_workshops')
      .select('id', { count: 'exact', head: true })
      .eq('professional_id', professionalId),
  ]);

  const appointmentsData = appointmentsRes.data || [];
  const allAppointments = allAppointmentsRes.data || [];

  let formattedAppointments: AppointmentForDashboard[] = [];
  if (appointmentsData.length > 0) {
    const patientIds = [...new Set(appointmentsData.map((a) => a.patient_id))];
    const { data: patients } = await supabase
      .from('professional_patient_info')
      .select('patient_id, full_name, phone, email')
      .eq('professional_id', professionalId)
      .in('patient_id', patientIds);

    const patientsMap = new Map((patients || []).map((p) => [p.patient_id, p]));
    formattedAppointments = appointmentsData.map((apt) => {
      const p = patientsMap.get(apt.patient_id);
      return {
        id: apt.id,
        date: apt.appointment_date,
        time: String(apt.appointment_time).slice(0, 5),
        duration: apt.duration_minutes || 60,
        type: apt.appointment_type === 'presencial' ? 'Presencial' : 'Online',
        status: apt.status,
        patient: {
          name: p?.full_name || 'Paciente',
          email: p?.email || 'No disponible',
          phone: p?.phone || 'No disponible',
        },
        location: apt.location || undefined,
        notes: apt.notes || undefined,
      };
    });
  }

  const upcomingCount = allAppointments.filter((a) => a.appointment_date >= today).length;
  const lastWeekUpcoming = allAppointments.filter(
    (a) => a.appointment_date >= weekAgoStr && a.appointment_date < today
  ).length;
  const upcomingChange = upcomingCount - lastWeekUpcoming;

  const uniquePatients = new Set(
    allAppointments.filter((a) => a.appointment_date >= today).map((a) => a.patient_id)
  );
  const activePatients = uniquePatients.size;
  const lastWeekPatients = new Set(
    allAppointments
      .filter((a) => a.appointment_date >= weekAgoStr && a.appointment_date < today)
      .map((a) => a.patient_id)
  );
  const weeklyChange = activePatients - lastWeekPatients.size;

  const { data: allPayments } = await supabase
    .from('payments')
    .select('amount, status')
    .eq('professional_id', professionalId);
  const succeeded = (allPayments || []).filter((p) => p.status === 'succeeded');
  const totalRevenue = succeeded.reduce(
    (sum, p) => sum + Number(p.amount || 0) * PROFESSIONAL_SHARE,
    0
  );

  const incomeData = incomeRes.data || [];
  const incomeThisMonth = incomeData.reduce((sum: number, p: any) => {
    const t = Number(p.transfer_amount);
    if (t > 0) return sum + t;
    return sum + Number(p.amount || 0) * PROFESSIONAL_SHARE;
  }, 0);

  return {
    appointments: formattedAppointments,
    stats: {
      upcomingCount,
      upcomingChange,
      activePatients,
      weeklyChange,
      totalRevenue,
      servicesCount: servicesRes.count ?? 0,
      challengesCount: challengesRes.count ?? 0,
      digitalProductsCount: digitalRes.count ?? 0,
      eventsCount: eventsRes.count ?? 0,
    } as DashboardStats,
    monthlyMetrics: {
      profileViews: profileViewsRes.count ?? 0,
      bookings: bookingsRes.count ?? 0,
      income: incomeThisMonth,
    } as MonthlyMetrics,
  };
}
