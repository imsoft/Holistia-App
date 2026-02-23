import type { SupabaseClient } from '@supabase/supabase-js';

export interface AdminDashboardStat {
  title: string;
  value: string;
  tertiaryText?: string;
  trend?: { value: string; positive: boolean };
  secondaryText?: string;
  route?: string;
}

export interface AdminDashboardData {
  coreStats: AdminDashboardStat[];
  contentStats: AdminDashboardStat[];
  businessStats: AdminDashboardStat[];
}

function percentageChange(current: number, previous: number): string {
  if (previous === 0) return current > 0 ? '+100%' : '0%';
  const change = ((current - previous) / previous) * 100;
  const sign = change >= 0 ? '+' : '';
  return `${sign}${Math.round(change)}%`;
}

export async function fetchAdminDashboardData(
  supabase: SupabaseClient
): Promise<AdminDashboardData> {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const [
    professionalsResult,
    pendingApplicationsResult,
    appointmentsResult,
    usersResult,
    challengesResult,
    activeChallengesResult,
    digitalProductsResult,
    activeProductsResult,
    eventsResult,
    activeEventsResult,
    blogPostsResult,
    publishedPostsResult,
    holisticCentersResult,
    activeHolisticCentersResult,
    restaurantsResult,
    activeRestaurantsResult,
    shopsResult,
    activeShopsResult,
    companiesResult,
    lastMonthProfessionalsResult,
    lastMonthAppointmentsResult,
  ] = await Promise.all([
    supabase.from('professional_applications').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('professional_applications').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('appointments').select('*', { count: 'exact', head: true }).gte('appointment_date', currentMonthStart.toISOString()),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('type', 'patient'),
    supabase.from('challenges').select('*', { count: 'exact', head: true }),
    supabase.from('challenges').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('digital_products').select('*', { count: 'exact', head: true }),
    supabase.from('digital_products').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('events_workshops').select('*', { count: 'exact', head: true }),
    supabase.from('events_workshops').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('blog_posts').select('*', { count: 'exact', head: true }),
    supabase.from('blog_posts').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('holistic_centers').select('*', { count: 'exact', head: true }),
    supabase.from('holistic_centers').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('restaurants').select('*', { count: 'exact', head: true }),
    supabase.from('restaurants').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('shops').select('*', { count: 'exact', head: true }),
    supabase.from('shops').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('company_leads').select('*', { count: 'exact', head: true }),
    supabase.from('professional_applications').select('*', { count: 'exact', head: true }).eq('status', 'approved').gte('reviewed_at', lastMonthStart.toISOString()).lte('reviewed_at', lastMonthEnd.toISOString()),
    supabase.from('appointments').select('*', { count: 'exact', head: true }).gte('appointment_date', lastMonthStart.toISOString()).lte('appointment_date', lastMonthEnd.toISOString()),
  ]);

  const totalUsers = usersResult.count ?? 0;
  const activeProfessionals = professionalsResult.count ?? 0;
  const pendingApplications = pendingApplicationsResult.count ?? 0;
  const monthlyAppointments = appointmentsResult.count ?? 0;
  const totalChallenges = challengesResult.count ?? 0;
  const activeChallenges = activeChallengesResult.count ?? 0;
  const totalProducts = digitalProductsResult.count ?? 0;
  const activeProducts = activeProductsResult.count ?? 0;
  const totalEvents = eventsResult.count ?? 0;
  const activeEvents = activeEventsResult.count ?? 0;
  const totalPosts = blogPostsResult.count ?? 0;
  const publishedPosts = publishedPostsResult.count ?? 0;
  const totalCenters = holisticCentersResult.count ?? 0;
  const activeCenters = activeHolisticCentersResult.count ?? 0;
  const totalRestaurants = restaurantsResult.count ?? 0;
  const activeRestaurants = activeRestaurantsResult.count ?? 0;
  const totalShops = shopsResult.count ?? 0;
  const activeShops = activeShopsResult.count ?? 0;
  const totalCompanies = companiesResult.count ?? 0;
  const lastMonthProfessionals = lastMonthProfessionalsResult.count ?? 0;
  const lastMonthAppointments = lastMonthAppointmentsResult.count ?? 0;

  const profChange = percentageChange(activeProfessionals, lastMonthProfessionals);
  const appointmentsChange = percentageChange(monthlyAppointments, lastMonthAppointments);

  const coreStats: AdminDashboardStat[] = [
    { title: 'Usuarios Registrados', value: String(totalUsers), tertiaryText: 'Pacientes en la plataforma', route: '/(admin)/users' },
    { title: 'Profesionales Activos', value: String(activeProfessionals), trend: { value: profChange, positive: !profChange.startsWith('-') }, secondaryText: 'vs mes anterior', tertiaryText: 'Profesionales aprobados', route: '/(admin)/professionals' },
    { title: 'Solicitudes Pendientes', value: String(pendingApplications), tertiaryText: pendingApplications > 0 ? 'Requieren revisión' : 'Sin pendientes', route: '/(admin)/applications' },
    { title: 'Citas del Mes', value: String(monthlyAppointments), trend: { value: appointmentsChange, positive: !appointmentsChange.startsWith('-') }, secondaryText: 'vs mes anterior', tertiaryText: 'Citas agendadas este mes', route: '/(admin)/appointments' },
  ];

  const contentStats: AdminDashboardStat[] = [
    { title: 'Retos', value: String(totalChallenges), tertiaryText: `${activeChallenges} activos`, route: '/(admin)/challenges' },
    { title: 'Programas Digitales', value: String(totalProducts), tertiaryText: `${activeProducts} activos`, route: '/(admin)/digital-products' },
    { title: 'Eventos', value: String(totalEvents), tertiaryText: `${activeEvents} activos`, route: '/(admin)/events' },
    { title: 'Blog Posts', value: String(totalPosts), tertiaryText: `${publishedPosts} publicados`, route: '/(admin)/blog' },
  ];

  const businessStats: AdminDashboardStat[] = [
    { title: 'Centros Holísticos', value: String(totalCenters), tertiaryText: `${activeCenters} activos`, route: '/(admin)/holistic-centers' },
    { title: 'Restaurantes', value: String(totalRestaurants), tertiaryText: `${activeRestaurants} activos`, route: '/(admin)/restaurants' },
    { title: 'Comercios', value: String(totalShops), tertiaryText: `${activeShops} activos`, route: '/(admin)/shops' },
    { title: 'Empresas (Leads)', value: String(totalCompanies), tertiaryText: 'Contactos B2B', route: '/(admin)/companies' },
  ];

  return { coreStats, contentStats, businessStats };
}
