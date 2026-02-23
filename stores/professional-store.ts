import { create } from 'zustand';

export type Professional = {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  profile_photo: string | null;
  status: string;
  stripe_account_id?: string | null;
  stripe_charges_enabled?: boolean | null;
  stripe_payouts_enabled?: boolean | null;
  [key: string]: unknown;
};

type ProfessionalStore = {
  professional: Professional | null;
  isLoading: boolean;
  setProfessional: (p: Professional | null) => void;
  setIsLoading: (v: boolean) => void;
  clear: () => void;
};

export const useProfessionalStore = create<ProfessionalStore>((set) => ({
  professional: null,
  isLoading: true,
  setProfessional: (p) => set({ professional: p }),
  setIsLoading: (v) => set({ isLoading: v }),
  clear: () => set({ professional: null }),
}));
