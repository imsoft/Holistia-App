export interface ProfessionalRankingData {
  admin_rating?: number;
  average_rating?: number;
  total_reviews?: number;
  completed_appointments?: number;
  created_at: string;
  is_active?: boolean;
}

export function sortProfessionalsByRanking<T extends ProfessionalRankingData>(professionals: T[]): T[] {
  const score = (p: ProfessionalRankingData) => {
    let s = 0;
    s += ((p.admin_rating ?? 0) / 10) * 30;
    s += p.average_rating ? ((p.average_rating - 1) / 4) * 20 : 0;
    s += Math.min((p.total_reviews ?? 0) / 10, 5);
    s += Math.min((p.completed_appointments ?? 0) / 5, 15);
    const daysSinceCreation = (Date.now() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24);
    s += daysSinceCreation < 90 ? 10 : 0;
    return s;
  };
  return [...professionals].sort((a, b) => score(b) - score(a));
}
