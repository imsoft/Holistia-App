import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/stores/auth-store';
import { useProfessionalStore } from '@/stores/professional-store';
import { supabase } from '@/lib/supabase';
import { getProfessionalForUser } from '@/lib/professional-auth';
import { getProfileType } from '@/lib/admin-auth';

export default function IndexScreen() {
  const { session, isLoading } = useAuthStore();
  const { professional, setProfessional } = useProfessionalStore();
  const [checkingRole, setCheckingRole] = useState(true);
  const [profileType, setProfileType] = useState<'admin' | 'professional' | 'patient' | null>(null);
  const colorScheme = useColorScheme();
  const c = Colors[colorScheme ?? 'light'];

  useEffect(() => {
    if (isLoading || !session) {
      if (!isLoading && !session) setCheckingRole(false);
      return;
    }
    (async () => {
      try {
        const type = await getProfileType(supabase, session.user.id);
        setProfileType(type);
        if (type === 'professional') {
          const prof = await getProfessionalForUser(supabase, session.user.id);
          setProfessional(prof);
        } else {
          setProfessional(null);
        }
      } catch (e) {
        console.error('Error checking role:', e);
        setProfileType(null);
        setProfessional(null);
      } finally {
        setCheckingRole(false);
      }
    })();
  }, [session?.user?.id, isLoading, session]);

  useEffect(() => {
    if (!checkingRole && !isLoading) {
      if (!session) {
        router.replace('/(auth)/login');
        return;
      }
      if (profileType === 'admin') {
        (router as any).replace('/(admin)/(tabs)');
        return;
      }
      if (professional) {
        (router as any).replace('/(expert)/(tabs)');
      } else {
        router.replace('/(tabs)');
      }
    }
  }, [session, checkingRole, isLoading, profileType, professional]);

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <ActivityIndicator size="large" color={c.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
