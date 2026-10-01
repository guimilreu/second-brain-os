import { institutionColor } from "@/features/finance/components/shared/InstitutionMark";
import {
  formatDecimal,
  parseDayInput,
  parseDecimalInput,
  suggestYieldCdiPct,
} from "@/features/finance/components/accounts/presets";
import { invoiceDates, invoiceMonthFor } from "@/features/finance/domain/card";
import { addMonths, isDateStr } from "@/features/finance/domain/dates";
import { parseMoneyInput } from "@/features/finance/domain/money";
import type {
  AccountKind,
  AccountPurpose,
  CardConfig,
  Category,
  Cents,
  DateStr,
  Institution,
} from "@/features/finance/domain/types";
import { estimatedMonthlyYieldCents } from "@/features/finance/domain/yield";
import type { SetupPayload } from "@/features/finance/server/schemas";

/** Rascunho do assistente: campos como o usuário digitou; vira `SetupPayload` só no fim. */
export type DraftCard = {
  closingDay: string;
  dueDay: string;
  limitText: string;
  reserveKey: string | null;
  closedUnpaidText: string;
  openText: string;
};

export type DraftGoal = {
  targetText: string;
  dateText: string;
  monthlyText: string;
};

export type DraftAccount = {
  key: string;
  name: string;
  institution: Institution;
  kind: AccountKind;
  purpose: AccountPurpose | null;
  color: string;
  yieldText: string;
  balanceText: string;
  card: DraftCard | null;
  goal: DraftGoal | null;
};

export type DraftInstallment = {
  id: string;
  cardKey: string;
  description: string;
  amountText: string;
  currentText: string;
  countText: string;
  categoryId: string;
};

export type DraftRecurring = {
  id: string;
  templateId: string | null;
  type: "expense" | "income";
  description: string;
  amountText: string;
  dayText: string;
  accountKey: string;
  categoryId: string;
  isEstimate: boolean;
  autoPost: boolean;
};

export type SetupDraft = {
  accounts: DraftAccount[];
  installments: DraftInstallment[];
  recurrings: DraftRecurring[];
  cdiText: string;
};

export function newDraftId() {
  return Math.random().toString(36).slice(2, 10);
}

export function newDraftCard(accounts: DraftAccount[]): DraftCard {
  return {
    closingDay: "28",
    dueDay: "5",
    limitText: "",
    reserveKey: accounts.find((account) => account.purpose === "card_reserve")?.key ?? null,
    closedUnpaidText: "",
    openText: "",
  };
}

export function newDraftAccount(
  key: string,
  name: string,
  institution: Institution,
  kind: AccountKind,
  purpose: AccountPurpose | null,
  card: DraftCard | null = null,
): DraftAccount {
  return {
    key,
    name,
    institution,
    kind,
    purpose,
    color: institutionColor(institution),
    yieldText: formatDecimal(suggestYieldCdiPct(kind, institution)),
    balanceText: "",
    card,
    goal: purpose === "goal" ? { targetText: "", dateText: "", monthlyText: "" } : null,
  };
}

/**
 * O cenário do GM: tudo cai no Mercado Pago (saldo rende 105% do CDI, cofrinhos 120%),
 * o dia a dia sai do Cofre Saldo, a fatura do Nubank é guardada no Cofre Fatura e o Inter fica de reserva.
 */
export function initialDraft(cdiAnnualPct: number | null): SetupDraft {
  return {
    accounts: [
      newDraftAccount("mp-conta", "Saldo em conta", "mercadopago", "checking", null),
      newDraftAccount("mp-saldo", "Cofre Saldo", "mercadopago", "pocket", "operating"),
      newDraftAccount("mp-fatura", "Cofre Fatura", "mercadopago", "pocket", "card_reserve"),
      newDraftAccount("nu-conta", "Conta Nubank", "nubank", "checking", null),
      newDraftAccount("nu-cartao", "Cartão Nubank", "nubank", "credit_card", null, {
        closingDay: "28",
        dueDay: "5",
        limitText: "",
        reserveKey: "mp-fatura",
        closedUnpaidText: "",
        openText: "",
      }),
      newDraftAccount("inter-conta", "Conta Inter", "inter", "checking", null),
    ],
    installments: [],
    recurrings: [],
    cdiText: formatDecimal(cdiAnnualPct),
  };
}

/** Valor digitado: vazio = 0; inválido = null. */
function moneyOrZero(text: string): Cents | null {
  return text.trim() ? parseMoneyInput(text) : 0;
}

export function draftCardConfig(card: DraftCard): CardConfig | null {
  const closingDay = parseDayInput(card.closingDay);
  const dueDay = parseDayInput(card.dueDay);
  if (!closingDay || !dueDay) return null;
  return { closingDay, dueDay, limitCents: null, reserveAccountId: null, cycleOverrides: [] };
}

/** Fatura aberta hoje e a anterior (já fechada): as duas que o passo do cartão pergunta. */
export function draftCardCycle(card: DraftCard, today: DateStr) {
  const config = draftCardConfig(card);
  if (!config) return null;
  const openMonth = invoiceMonthFor(config, today);
  const closedMonth = addMonths(openMonth, -1);
  return {
    openMonth,
    open: invoiceDates(config, openMonth),
    closedMonth,
    closed: invoiceDates(config, closedMonth),
  };
}

/** Tira a conta e conserta quem apontava para ela (cofre da fatura, parcelamentos, fixas). */
export function removeDraftAccount(draft: SetupDraft, key: string): SetupDraft {
  const accounts = draft.accounts
    .filter((account) => account.key !== key)
    .map((account) =>
      account.card && account.card.reserveKey === key ? { ...account, card: { ...account.card, reserveKey: null } } : account,
    );
  const otherCard = accounts.find((account) => account.kind === "credit_card")?.key;
  return {
    ...draft,
    accounts,
    installments: draft.installments.flatMap((item) => {
      if (item.cardKey !== key) return [item];
      return otherCard ? [{ ...item, cardKey: otherCard }] : [];
    }),
    recurrings: draft.recurrings.map((item) =>
      item.accountKey === key ? { ...item, accountKey: defaultAccountKey(accounts, "operating") } : item,
    ),
  };
}

/** Conta padrão de uma fixa: entradas e PIX no cofre do dia a dia; assinaturas no cartão. */
export function defaultAccountKey(accounts: DraftAccount[], target: "operating" | "card"): string {
  const operating =
    accounts.find((account) => account.purpose === "operating") ??
    accounts.find((account) => account.kind === "checking") ??
    accounts.find((account) => account.kind !== "credit_card");
  const card = accounts.find((account) => account.kind === "credit_card");
  return (target === "card" ? (card ?? operating) : (operating ?? card))?.key ?? "";
}

export type RecurringTemplate = {
  id: string;
  label: string;
  type: "expense" | "income";
  day: number;
  target: "operating" | "card";
  /** Nome da categoria inicial correspondente. */
  category: string;
  isEstimate?: boolean;
};

export const RECURRING_TEMPLATES: RecurringTemplate[] = [
  { id: "salary", label: "Salário", type: "income", day: 5, target: "operating", category: "Salário" },
  { id: "rent", label: "Aluguel", type: "expense", day: 10, target: "operating", category: "Moradia" },
  { id: "condo", label: "Condomínio", type: "expense", day: 10, target: "operating", category: "Moradia" },
  { id: "internet", label: "Internet", type: "expense", day: 15, target: "operating", category: "Moradia" },
  { id: "phone", label: "Celular", type: "expense", day: 15, target: "operating", category: "Assinaturas" },
  { id: "power", label: "Luz", type: "expense", day: 20, target: "operating", category: "Moradia", isEstimate: true },
  { id: "water", label: "Água", type: "expense", day: 20, target: "operating", category: "Moradia", isEstimate: true },
  { id: "gym", label: "Academia", type: "expense", day: 5, target: "card", category: "Saúde" },
  { id: "spotify", label: "Spotify", type: "expense", day: 10, target: "card", category: "Assinaturas" },
  { id: "netflix", label: "Netflix", type: "expense", day: 10, target: "card", category: "Assinaturas" },
  { id: "youtube", label: "YouTube Premium", type: "expense", day: 10, target: "card", category: "Assinaturas" },
  { id: "icloud", label: "iCloud", type: "expense", day: 10, target: "card", category: "Assinaturas" },
];

export function recurringFromTemplate(
  template: RecurringTemplate,
  accounts: DraftAccount[],
  categories: Category[],
): DraftRecurring {
  const accountKey = defaultAccountKey(accounts, template.target);
  const onCard = accounts.find((account) => account.key === accountKey)?.kind === "credit_card";
  return {
    id: newDraftId(),
    templateId: template.id,
    type: template.type,
    description: template.label,
    amountText: "",
    dayText: String(template.day),
    accountKey,
    categoryId:
      categories.find((category) => category.kind === template.type && category.name === template.category)?.id ?? "",
    isEstimate: template.isEstimate ?? false,
    // Assinatura no cartão entra sozinha; o resto pede confirmação (valor e dia mudam).
    autoPost: template.type === "expense" && onCard,
  };
}

function isWholeNumber(text: string, min: number, max: number) {
  const value = Number(text);
  return text.trim() !== "" && Number.isInteger(value) && value >= min && value <= max;
}

function validateAccounts(draft: SetupDraft): string | null {
  if (!draft.accounts.length) return "Adicione pelo menos uma conta.";
  for (const account of draft.accounts) {
    const name = account.name.trim();
    if (!name) return "Dê um nome para todas as contas.";
    if (account.kind !== "credit_card" && moneyOrZero(account.balanceText) === null) {
      return `Saldo inválido em ${name}.`;
    }
    const yieldPct = parseDecimalInput(account.yieldText);
    if (yieldPct !== null && (Number.isNaN(yieldPct) || yieldPct < 0 || yieldPct > 300)) {
      return `Rendimento inválido em ${name}: use o % do CDI, entre 0 e 300.`;
    }
    if (account.goal) {
      const target = moneyOrZero(account.goal.targetText);
      if (target === null) return `Valor da meta inválido em ${name}.`;
      if (account.goal.dateText && !isDateStr(account.goal.dateText)) return `Data da meta inválida em ${name}.`;
      if (moneyOrZero(account.goal.monthlyText) === null) return `Valor mensal inválido em ${name}.`;
    }
  }
  return null;
}

function validateCards(draft: SetupDraft): string | null {
  for (const account of draft.accounts) {
    if (!account.card) continue;
    if (!draftCardConfig(account.card)) {
      return `Confira fechamento e vencimento do ${account.name}: dias de 1 a 31.`;
    }
    for (const text of [account.card.limitText, account.card.closedUnpaidText, account.card.openText]) {
      const cents = moneyOrZero(text);
      if (cents === null || cents < 0) return `Valor inválido no ${account.name}.`;
    }
  }
  return null;
}

function validateInstallments(draft: SetupDraft): string | null {
  for (const item of draft.installments) {
    const name = item.description.trim();
    if (!name) return "Descreva cada parcelamento (ex.: Notebook).";
    const amount = parseMoneyInput(item.amountText);
    if (!amount || amount <= 0) return `Informe o valor da parcela de ${name}.`;
    if (!isWholeNumber(item.countText, 2, 48) || !isWholeNumber(item.currentText, 1, Number(item.countText))) {
      return `Confira as parcelas de ${name}: a atual vai de 1 até o total, e o total de 2 a 48.`;
    }
    if (!draft.accounts.some((account) => account.key === item.cardKey && account.card)) {
      return `Escolha o cartão de ${name}.`;
    }
  }
  return null;
}

function validateRecurrings(draft: SetupDraft): string | null {
  for (const item of draft.recurrings) {
    const name = item.description.trim();
    if (!name) return "Dê um nome para cada fixa.";
    const amount = parseMoneyInput(item.amountText);
    if (!amount || amount <= 0) return `Informe o valor de ${name}.`;
    if (!isWholeNumber(item.dayText, 1, 31)) return `Dia inválido em ${name}: use de 1 a 31.`;
    if (!draft.accounts.some((account) => account.key === item.accountKey)) return `Escolha a conta de ${name}.`;
  }
  return null;
}

function validateCdi(draft: SetupDraft): string | null {
  const cdi = parseDecimalInput(draft.cdiText);
  if (cdi !== null && (Number.isNaN(cdi) || cdi < 0 || cdi > 100)) return "CDI inválido: use a taxa ao ano em %, entre 0 e 100.";
  return null;
}

const VALIDATORS = [validateAccounts, validateCards, validateInstallments, validateRecurrings, validateCdi];

/** Mensagem do primeiro problema do passo (ou null se está tudo certo). */
export function validateStep(step: number, draft: SetupDraft): string | null {
  return VALIDATORS[step]?.(draft) ?? null;
}

export const STEP_COUNT = VALIDATORS.length;

function draftGoalPayload(account: DraftAccount) {
  if (account.purpose !== "goal" || !account.goal) return null;
  const targetCents = moneyOrZero(account.goal.targetText) ?? 0;
  if (targetCents <= 0) return null;
  const monthlyCents = moneyOrZero(account.goal.monthlyText) ?? 0;
  return {
    targetCents,
    targetDate: account.goal.dateText || null,
    monthlyCents: monthlyCents > 0 ? monthlyCents : null,
  };
}

/** Converte o rascunho (já validado) no payload de `completeSetup`. */
export function buildSetupPayload(draft: SetupDraft): SetupPayload {
  const keys = new Set(draft.accounts.map((account) => account.key));
  return {
    cdiAnnualPct: parseDecimalInput(draft.cdiText),
    accounts: draft.accounts.map((account) => {
      const yields = account.kind === "checking" || account.kind === "pocket";
      const card = account.kind === "credit_card" ? (account.card ?? newDraftCard(draft.accounts)) : null;
      return {
        key: account.key,
        name: account.name.trim(),
        institution: account.institution,
        kind: account.kind,
        purpose: account.purpose,
        color: account.color,
        yieldCdiPct: yields ? parseDecimalInput(account.yieldText) : null,
        balanceCents: account.kind === "credit_card" ? 0 : (moneyOrZero(account.balanceText) ?? 0),
        card: card
          ? {
              closingDay: parseDayInput(card.closingDay) ?? 28,
              dueDay: parseDayInput(card.dueDay) ?? 5,
              limitCents: card.limitText.trim() ? moneyOrZero(card.limitText) : null,
              reserveKey: card.reserveKey && keys.has(card.reserveKey) ? card.reserveKey : null,
              closedUnpaidCents: moneyOrZero(card.closedUnpaidText) ?? 0,
              openCents: moneyOrZero(card.openText) ?? 0,
            }
          : null,
        goal: draftGoalPayload(account),
      };
    }),
    installments: draft.installments.map((item) => ({
      cardKey: item.cardKey,
      description: item.description.trim(),
      categoryId: item.categoryId || null,
      installmentCents: parseMoneyInput(item.amountText) ?? 0,
      currentIndex: Number(item.currentText),
      count: Number(item.countText),
    })),
    recurrings: draft.recurrings.map((item) => ({
      type: item.type,
      description: item.description.trim(),
      amountCents: parseMoneyInput(item.amountText) ?? 0,
      isEstimate: item.isEstimate,
      categoryId: item.categoryId || null,
      accountKey: item.accountKey,
      dayOfMonth: Number(item.dayText),
      autoPost: item.type === "expense" && item.autoPost,
    })),
  };
}

/** Números da revisão final. */
export function summarizeDraft(draft: SetupDraft, cdiAnnualPct: number | null) {
  const money = draft.accounts.filter((account) => account.kind !== "credit_card");
  const balanceOf = (account: DraftAccount) => moneyOrZero(account.balanceText) ?? 0;
  return {
    accountCount: draft.accounts.length,
    moneyCents: money.reduce((total, account) => total + balanceOf(account), 0),
    monthlyYieldCents: money.reduce(
      (total, account) =>
        total + estimatedMonthlyYieldCents(balanceOf(account), cdiAnnualPct, parseDecimalInput(account.yieldText)),
      0,
    ),
    cards: draft.accounts.flatMap((account) =>
      account.card
        ? [
            {
              key: account.key,
              name: account.name,
              closingDay: account.card.closingDay,
              dueDay: account.card.dueDay,
              owedCents: (moneyOrZero(account.card.closedUnpaidText) ?? 0) + (moneyOrZero(account.card.openText) ?? 0),
            },
          ]
        : [],
    ),
    installmentCount: draft.installments.length,
    installmentsRemainingCents: draft.installments.reduce((total, item) => {
      const remaining = Math.max(Number(item.countText) - Number(item.currentText), 0);
      return total + (parseMoneyInput(item.amountText) ?? 0) * remaining;
    }, 0),
    recurringCount: draft.recurrings.length,
    incomeCents: draft.recurrings
      .filter((item) => item.type === "income")
      .reduce((total, item) => total + (parseMoneyInput(item.amountText) ?? 0), 0),
    expenseCents: draft.recurrings
      .filter((item) => item.type === "expense")
      .reduce((total, item) => total + (parseMoneyInput(item.amountText) ?? 0), 0),
  };
}
