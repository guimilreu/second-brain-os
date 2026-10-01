import { competenceOf } from "./ledger";
import type { Account, CardConfig, Category, Recurring, Transaction } from "./types";

export const NUBANK_CARD: CardConfig = {
  closingDay: 28,
  dueDay: 5,
  limitCents: 1_000_000,
  reserveAccountId: "mp-fatura",
  cycleOverrides: [],
};

function account(partial: Partial<Account> & Pick<Account, "id" | "name" | "kind">): Account {
  return {
    institution: "mercadopago",
    purpose: null,
    color: "#6366f1",
    yieldCdiPct: null,
    openingBalanceCents: 0,
    openingDate: "2026-09-01",
    archived: false,
    sortOrder: 0,
    card: null,
    goal: null,
    lastReconciledAt: null,
    ...partial,
  };
}

/** O cenário do GM: Mercado Pago com cofres Saldo e Fatura, cartão Nubank, Inter quase parado. */
export function scenarioAccounts(): Account[] {
  return [
    account({ id: "mp-conta", name: "Saldo em conta", kind: "checking", yieldCdiPct: 105 }),
    account({
      id: "mp-saldo",
      name: "Cofre Saldo",
      kind: "pocket",
      purpose: "operating",
      yieldCdiPct: 120,
      openingBalanceCents: 800_000,
    }),
    account({
      id: "mp-fatura",
      name: "Cofre Fatura",
      kind: "pocket",
      purpose: "card_reserve",
      yieldCdiPct: 120,
      openingBalanceCents: 150_000,
    }),
    account({
      id: "mp-viagem",
      name: "Viagem",
      kind: "pocket",
      purpose: "goal",
      yieldCdiPct: 120,
      goal: { targetCents: 500_000, targetDate: "2027-06-30", monthlyCents: 50_000 },
    }),
    account({ id: "nu-conta", name: "Conta Nubank", kind: "checking", institution: "nubank" }),
    account({ id: "nu-card", name: "Cartão Nubank", kind: "credit_card", institution: "nubank", card: NUBANK_CARD }),
    account({ id: "inter", name: "Conta Inter", kind: "checking", institution: "inter" }),
  ];
}

export const CATEGORIES: Category[] = [
  { id: "food", name: "Alimentação", kind: "expense", color: "#f97316", icon: "utensils", limitCents: 100_000, archived: false, sortOrder: 0, systemKey: null },
  { id: "shop", name: "Compras", kind: "expense", color: "#8b5cf6", icon: "shopping-bag", limitCents: null, archived: false, sortOrder: 1, systemKey: null },
  { id: "home", name: "Moradia", kind: "expense", color: "#0ea5e9", icon: "home", limitCents: null, archived: false, sortOrder: 2, systemKey: null },
  { id: "subs", name: "Assinaturas", kind: "expense", color: "#ec4899", icon: "repeat", limitCents: null, archived: false, sortOrder: 3, systemKey: null },
  { id: "salary", name: "Salário", kind: "income", color: "#10b981", icon: "briefcase", limitCents: null, archived: false, sortOrder: 0, systemKey: null },
];

let seq = 0;
export function tx(partial: Partial<Transaction> & Pick<Transaction, "type" | "amountCents" | "accountId" | "date">): Transaction {
  seq += 1;
  const base: Transaction = {
    id: `tx-${seq}`,
    description: "lançamento",
    categoryId: null,
    toAccountId: null,
    competence: "",
    method: null,
    invoiceMonth: null,
    installment: null,
    recurringId: null,
    recurringMonth: null,
    notes: "",
    ...partial,
  };
  return { ...base, competence: partial.competence ?? competenceOf(base) };
}

export function recurring(partial: Partial<Recurring> & Pick<Recurring, "id" | "type" | "amountCents" | "accountId" | "dayOfMonth">): Recurring {
  return {
    description: partial.id,
    isEstimate: false,
    categoryId: null,
    method: null,
    frequency: "monthly",
    monthOfYear: null,
    startMonth: "2026-01",
    endMonth: null,
    autoPost: false,
    active: true,
    skippedMonths: [],
    ...partial,
  };
}
