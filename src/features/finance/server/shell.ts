import { addDays, monthOf } from "@/features/finance/domain/dates";
import { balancesByAccount } from "@/features/finance/domain/ledger";
import { computeMonthPlans } from "@/features/finance/domain/plan";
import { buildSuggestions, rankAccountsByUse, type EntrySuggestion } from "@/features/finance/domain/suggestions";
import type { Account, Category, Cents, DateStr, MonthKey } from "@/features/finance/domain/types";
import type { FinanceContext } from "./data";

/** O que o lançamento rápido e a busca precisam em qualquer página (serializável). */
export type ShellData = {
  today: DateStr;
  accounts: Account[];
  categories: Category[];
  suggestions: EntrySuggestion[];
  /** Quantas vezes cada conta foi usada em gastos nos últimos 60 dias (ordem dos atalhos). */
  accountUsage: Record<string, number>;
  balances: Record<string, Cents>;
  /** "Ainda pode gastar" do mês atual e dos 12 seguintes — prévia do impacto de uma compra. */
  monthFree: { month: MonthKey; freeCents: Cents }[];
};

export function buildShellData(context: FinanceContext): ShellData {
  const balances = balancesByAccount(context.accounts, context.transactions);
  return {
    today: context.today,
    accounts: context.accounts,
    categories: context.categories,
    suggestions: buildSuggestions(context.transactions),
    accountUsage: Object.fromEntries(rankAccountsByUse(context.transactions, addDays(context.today, -60))),
    balances: Object.fromEntries(balances),
    monthFree: computeMonthPlans(context, monthOf(context.today), 13).map((plan) => ({
      month: plan.month,
      freeCents: plan.freeCents,
    })),
  };
}
