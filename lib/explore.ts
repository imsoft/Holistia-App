import { supabase } from '@/lib/supabase';
import { transformServicesFromDB, determineProfessionalModality } from './professional-utils';
import { sortProfessionalsByRanking } from './professional-ranking';

const todayStr = () => new Date().toISOString().split('T')[0];

export async function fetchExploreData() {
  const [
    professionalsRes,
    eventsRes,
    challengesRes,
    restaurantsRes,
    shopsRes,
    productsRes,
    holisticCentersRes,
  ] = await Promise.allSettled([
    supabase
      .from('professional_applications')
      .select('*')
      .eq('status', 'approved')
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('events_workshops')
      .select(
        `*, professional_applications(first_name, last_name, profession)`
      )
      .eq('is_active', true)
      .gte('event_date', todayStr())
      .order('event_date', { ascending: true }),
    supabase
      .from('challenges')
      .select('*')
      .eq('is_active', true)
      .eq('is_public', true)
      .in('created_by_type', ['professional', 'admin'])
      .order('created_at', { ascending: false })
      .limit(20),
    supabase.from('restaurants').select('*').eq('is_active', true),
    supabase.from('shops').select('*').eq('is_active', true),
    supabase
      .from('digital_products')
      .select(
        `*, professional_applications!digital_products_professional_id_fkey(first_name, last_name, profile_photo, is_verified, wellness_areas, status, is_active)`
      )
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
    supabase.from('holistic_centers').select('*').eq('is_active', true),
  ]);

  const professionalsData = professionalsRes.status === 'fulfilled' ? professionalsRes.value.data : [];
  const professionals: any[] = [];

  if (professionalsData && professionalsData.length > 0) {
    const ids = professionalsData.map((p: any) => p.id);
    const userIds = professionalsData.map((p: any) => p.user_id).filter(Boolean);

    const [servicesRes, reviewsRes, adminRes, aptRes] = await Promise.all([
      supabase
        .from('professional_services')
        .select('*')
        .in('professional_id', ids)
        .eq('isactive', true),
      supabase
        .from('professional_review_stats')
        .select('professional_id, average_rating, total_reviews')
        .in('professional_id', userIds as string[]),
      supabase
        .from('professional_admin_rating_stats')
        .select('professional_id, average_admin_rating')
        .in('professional_id', ids),
      supabase
        .from('appointments')
        .select('professional_id')
        .in('professional_id', ids)
        .eq('status', 'completed'),
    ]);

    const services = servicesRes.data || [];
    const reviews = reviewsRes.data || [];
    const adminRatings = adminRes.data || [];
    const apts = aptRes.data || [];

    const servicesMap = new Map<string, any[]>();
    services.forEach((s: any) => {
      if (!servicesMap.has(s.professional_id)) servicesMap.set(s.professional_id, []);
      servicesMap.get(s.professional_id)!.push(s);
    });
    const reviewMap = new Map(reviews.map((r: any) => [r.professional_id, r]));
    const adminMap = new Map(adminRatings.map((r: any) => [r.professional_id, r]));
    const aptCount = new Map<string, number>();
    apts.forEach((a: any) => aptCount.set(a.professional_id, (aptCount.get(a.professional_id) || 0) + 1));

    professionalsData.forEach((prof: any) => {
      const svc = transformServicesFromDB(servicesMap.get(prof.id) || []);
      const review = reviewMap.get(prof.user_id);
      const admin = adminMap.get(prof.id);
      professionals.push({
        ...prof,
        services: svc.length > 0 ? svc : prof.services || [],
        modality: determineProfessionalModality(svc),
        average_rating: review?.average_rating,
        total_reviews: review?.total_reviews,
        admin_rating: admin?.average_admin_rating,
        completed_appointments: aptCount.get(prof.id) || 0,
        is_verified: prof.is_verified || false,
      });
    });
  }

  const events = eventsRes.status === 'fulfilled' ? eventsRes.value.data || [] : [];
  const challenges = challengesRes.status === 'fulfilled' ? challengesRes.value.data || [] : [];
  const restaurants = restaurantsRes.status === 'fulfilled' ? restaurantsRes.value.data || [] : [];
  const shops = shopsRes.status === 'fulfilled' ? shopsRes.value.data || [] : [];
  const holisticCenters = holisticCentersRes.status === 'fulfilled' ? holisticCentersRes.value.data || [] : [];
  let digitalProducts = productsRes.status === 'fulfilled' ? productsRes.value.data || [] : [];
  digitalProducts = digitalProducts.filter((p: any) => {
    const prof = p.professional_applications;
    if (Array.isArray(prof)) return prof[0]?.status === 'approved' && prof[0]?.is_active !== false;
    return prof?.status === 'approved' && prof?.is_active !== false;
  });

  return {
    professionals: sortProfessionalsByRanking(professionals),
    events,
    challenges,
    restaurants,
    shops,
    digitalProducts,
    holisticCenters,
  };
}
