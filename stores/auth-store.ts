import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type AuthStore = {
  session: Session | null;
  isLoading: boolean;
  setSession: (session: Session | null) => void;
  setIsLoading: (loading: boolean) => void;
  signOut: () => Promise<void>;
  initialize: () => () => void;
};

export const useAuthStore = create<AuthStore>((set) => ({
  session: null,
  isLoading: true,

  setSession: (session) => set({ session }),
  setIsLoading: (isLoading) => set({ isLoading }),

  signOut: async () => {
    await supabase.auth.signOut();
  },

  initialize: () => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({ session, isLoading: false });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      set({ session });
    });

    return () => subscription.unsubscribe();
  },
}));
