export type WishlistOverviewItem = {
  id: string;
  userId: string;
  title: string;
  notes?: string;
  url?: string;
  category: string;
  lane: string;
  plannedMonthKey?: string | null;
  sortOrder: number;
  status: string;
  estimatedPrice: number;
  actualPrice?: number;
  purchasedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type WishlistOverview = {
  monthKeys: string[];
  items: WishlistOverviewItem[];
  monthBudgets: Array<{ id: string; monthKey: string; capAmount: number }>;
  totalsByMonth: Record<string, number>;
  categoryTotalsByMonth: Record<string, Record<string, number>>;
  overCapByMonth: Record<string, boolean>;
  financeHints: Array<{ monthKey: string; freeToSpend: number }>;
  accounts: Array<{ id: string; name: string }>;
};
