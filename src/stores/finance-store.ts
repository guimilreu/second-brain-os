"use client";

import { create } from "zustand";

export type FinanceTab = "hoje" | "movimentos" | "patrimonio" | "mais";
export type FinanceMovimentosSubTab = "transactions" | "recurring" | "timeline";
export type FinancePatrimonioSubTab = "accounts" | "cards" | "portfolio";
export type FinanceMaisSubTab = "budgets" | "objectives" | "scenarios" | "categories";

type FinanceStore = {
  activeTab: FinanceTab;
  movimentosSubTab: FinanceMovimentosSubTab;
  patrimonioSubTab: FinancePatrimonioSubTab;
  maisSubTab: FinanceMaisSubTab;
  selectedMonth: string;
  setActiveTab: (tab: FinanceTab) => void;
  setMovimentosSubTab: (tab: FinanceMovimentosSubTab) => void;
  setPatrimonioSubTab: (tab: FinancePatrimonioSubTab) => void;
  setMaisSubTab: (tab: FinanceMaisSubTab) => void;
  setSelectedMonth: (month: string) => void;
};

export const useFinanceStore = create<FinanceStore>((set) => ({
  activeTab: "hoje",
  movimentosSubTab: "transactions",
  patrimonioSubTab: "accounts",
  maisSubTab: "objectives",
  selectedMonth: new Date().toISOString().slice(0, 7),
  setActiveTab: (activeTab) => set({ activeTab }),
  setMovimentosSubTab: (movimentosSubTab) => set({ movimentosSubTab }),
  setPatrimonioSubTab: (patrimonioSubTab) => set({ patrimonioSubTab }),
  setMaisSubTab: (maisSubTab) => set({ maisSubTab }),
  setSelectedMonth: (selectedMonth) => set({ selectedMonth }),
}));
