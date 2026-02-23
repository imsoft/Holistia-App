import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

const EXPLORED_KEY = 'holistia_patient_onboarding_explored';

export type OnboardingStepId = 'explore' | 'favorites' | 'first_appointment';

export type OnboardingStep = {
  id: OnboardingStepId;
  label: string;
  route: string;
  done: boolean;
};

const STEPS: { id: OnboardingStepId; label: string; route: string }[] = [
  { id: 'explore', label: 'Explorar profesionales', route: '/(tabs)' },
  { id: 'favorites', label: 'Guardar favoritos', route: '/(patient)/favorites' },
  { id: 'first_appointment', label: 'Agendar primera cita', route: '/(patient)/appointments' },
];

export async function getOnboardingSteps(userId: string | undefined): Promise<OnboardingStep[]> {
  let explored = false;
  try {
    const v = await AsyncStorage.getItem(EXPLORED_KEY);
    explored = v === 'true';
  } catch {
    // ignore
  }

  let favoritesCount = 0;
  let appointmentsCount = 0;
  if (userId) {
    try {
      const [fav, apt] = await Promise.all([
        supabase.from('user_favorites').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .eq('patient_id', userId)
          .in('status', ['pending', 'confirmed', 'paid', 'completed']),
      ]);
      favoritesCount = fav.count ?? 0;
      appointmentsCount = apt.count ?? 0;
    } catch {
      // ignore
    }
  }

  return [
    { ...STEPS[0], done: explored },
    { ...STEPS[1], done: favoritesCount > 0 },
    { ...STEPS[2], done: appointmentsCount > 0 },
  ];
}

export async function markExplored(): Promise<void> {
  try {
    await AsyncStorage.setItem(EXPLORED_KEY, 'true');
  } catch {
    // ignore
  }
}
