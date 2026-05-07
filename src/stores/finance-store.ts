"use client";

import { create } from "zustand";

type FinanceView = "overview" | "transactions" | "recurring" | "goals";

type FinanceStore = {
  activeView: FinanceView;
  selectedMonth: string;
  setActiveView: (view: FinanceView) => void;
  setSelectedMonth: (month: string) => void;
};

export const useFinanceStore = create<FinanceStore>((set) => ({
  activeView: "overview",
  selectedMonth: new Date().toISOString().slice(0, 7),
  setActiveView: (activeView) => set({ activeView }),
  setSelectedMonth: (selectedMonth) => set({ selectedMonth }),
}));
