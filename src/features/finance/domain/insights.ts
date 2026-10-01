import { formatCurrency } from "@/lib/utils/format";
import { cardReserveNeededCents, invoiceMonthFor, summarizeInvoices } from "./card";
import { addMonths, dayInMonth, diffDays, monthOf, parseDateStr, daysInMonth } from "./dates";
import { invoiceLabel, monthName, relativeDays } from "./labels";
import { balancesByAccount, isMoneyAccount } from "./ledger";
import { categoryAverages, computeMonthPlan, type FinanceData } from "./plan";
import { normalizeDescription } from "./quickEntry";
import { overdueOccurrences } from "./recurring";
import type { Cents, MonthKey } from "./types";
import { estimatedMonthlyYieldCents } from "./yield";

export type InsightTone = "negative" | "warning" | "info" | "positive";

export type InsightAction =
  | { kind: "reserve"; cardId: string; fromAccountId: string | null; toAccountId: string; amountCents: Cents }
  | { kind: "pay-invoice"; cardId: string; month: MonthKey; fromAccountId: string | null; amountCents: Cents }
  | { kind: "confirm-recurring"; recurringId: string; month: MonthKey; amountCents: Cents }
  | { kind: "move-money"; fromAccountId: string; toAccountId: string; amountCents: Cents }
  | { kind: "reconcile" };

export type Insight = {
  id: string;
  tone: InsightTone;
  title: string;
  detail?: string;
  href?: string;
  action?: InsightAction;
};

const money = (cents: Cents) => formatCurrency(cents / 100);
const TONE_ORDER: Record<InsightTone, number> = { negative: 0, warning: 1, info: 2, positive: 3 };

/**
 * O "olho" do sistema: o que merece atenção hoje, em frases curtas.
 * Determinístico — tudo sai dos lançamentos, faturas, recorrências e saldos.
 */
export function buildInsights(data: FinanceData, options: { cdiAnnualPct: number | null }): Insight[] {
  const { accounts, categories, transactions, recurrings, today } = data;
  const insights: Insight[] = [];
  const balances = balancesByAccount(accounts, transactions);
  const accountsById = new Map(accounts.map((account) => [account.id, account]));
  const month = monthOf(today);
  const currentYear = Number(today.slice(0, 4));
  const operating = accounts.find((account) => account.purpose === "operating" && !account.archived) ?? null;

  // Cartões: fatura vencendo/atrasada e reserva.
  for (const card of accounts.filter((account) => account.card && !account.archived)) {
    const invoices = summarizeInvoices(card, transactions, today);
    const reserveId = card.card?.reserveAccountId ?? null;
    const reserveBalance = reserveId ? (balances.get(reserveId) ?? 0) : 0;

    for (const invoice of invoices) {
      if (invoice.remainingCents <= 0) continue;
      const days = diffDays(today, invoice.dueDate);
      if (invoice.state === "overdue") {
        insights.push({
          id: `overdue-${card.id}-${invoice.month}`,
          tone: "negative",
          title: `${invoiceLabel(invoice.month, currentYear)} do ${card.name} venceu ${relativeDays(days)}`,
          detail: `Faltam ${money(invoice.remainingCents)}. Pague para evitar juros.`,
          href: `/cards/${card.id}?month=${invoice.month}`,
          action: {
            kind: "pay-invoice",
            cardId: card.id,
            month: invoice.month,
            fromAccountId: reserveId,
            amountCents: invoice.remainingCents,
          },
        });
      } else if (invoice.state === "closed" && days <= 7) {
        const covered = reserveBalance >= invoice.remainingCents;
        insights.push({
          id: `due-${card.id}-${invoice.month}`,
          tone: days <= 2 ? "warning" : "info",
          title: `${invoiceLabel(invoice.month, currentYear)} vence ${relativeDays(days)}: ${money(invoice.remainingCents)}`,
          detail: reserveId
            ? covered
              ? `O valor já está guardado em ${accountsById.get(reserveId)?.name ?? "reserva"}.`
              : `Na reserva tem ${money(reserveBalance)}.`
            : undefined,
          href: `/cards/${card.id}?month=${invoice.month}`,
          action: {
            kind: "pay-invoice",
            cardId: card.id,
            month: invoice.month,
            fromAccountId: reserveId,
            amountCents: invoice.remainingCents,
          },
        });
      }
    }

    // Fatura aberta correndo acima da média das últimas fechadas.
    const open = invoices.find((invoice) => invoice.state === "open");
    const previous = invoices
      .filter((invoice) => open && invoice.month < open.month && invoice.totalCents > 0)
      .slice(-3);
    if (open && previous.length >= 2) {
      const average = Math.round(previous.reduce((total, invoice) => total + invoice.totalCents, 0) / previous.length);
      const daysToClose = diffDays(today, open.closingDate);
      if (open.totalCents > average * 1.15 && open.totalCents - average >= 10_000) {
        insights.push({
          id: `invoice-high-${card.id}-${open.month}`,
          tone: "warning",
          title: `${invoiceLabel(open.month, currentYear)} já passou ${money(open.totalCents - average)} da sua média`,
          detail: `Está em ${money(open.totalCents)} e ainda fecha ${relativeDays(daysToClose)}. A média das últimas é ${money(average)}.`,
          href: `/cards/${card.id}?month=${open.month}`,
        });
      }
    }

    // Próxima fatura já nasce com parcelas — bom saber antes de parcelar mais.
    if (open) {
      const next = invoices.find((invoice) => invoice.month === addMonths(open.month, 1));
      const nextInstallments = transactions
        .filter(
          (tx) =>
            tx.accountId === card.id &&
            tx.type === "expense" &&
            tx.installment &&
            tx.installment.count > 1 &&
            tx.invoiceMonth === next?.month,
        )
        .reduce((total, tx) => total + tx.amountCents, 0);
      if (next && nextInstallments >= 10_000) {
        insights.push({
          id: `next-installments-${card.id}-${next.month}`,
          tone: "info",
          title: `${invoiceLabel(next.month, currentYear)} já começa com ${money(nextInstallments)} em parcelas`,
          detail: "Conte com isso antes de parcelar algo novo.",
          href: `/cards/${card.id}?month=${next.month}`,
        });
      }
    }

    if (reserveId) {
      const gap = cardReserveNeededCents(invoices) - reserveBalance;
      if (gap >= 100) {
        insights.push({
          id: `reserve-${card.id}`,
          tone: "warning",
          title: `Guarde ${money(gap)} em ${accountsById.get(reserveId)?.name ?? "reserva da fatura"}`,
          detail: `É o que falta para cobrir as compras do ${card.name} que você ainda vai pagar.`,
          href: `/cards/${card.id}`,
          action: {
            kind: "reserve",
            cardId: card.id,
            fromAccountId: operating?.id ?? null,
            toAccountId: reserveId,
            amountCents: gap,
          },
        });
      }
    }
  }

  // Recorrências que venceram e não foram confirmadas.
  for (const occurrence of overdueOccurrences(recurrings, accounts, transactions, today)) {
    if (occurrence.recurring.autoPost) continue;
    const days = diffDays(today, occurrence.date);
    const isIncome = occurrence.recurring.type === "income";
    insights.push({
      id: `recurring-${occurrence.recurring.id}-${occurrence.month}`,
      tone: "warning",
      title: isIncome
        ? `${occurrence.recurring.description} era para ter entrado ${relativeDays(days)}`
        : `${occurrence.recurring.description} venceu ${relativeDays(days)}`,
      detail: `${money(occurrence.amountCents)}${occurrence.recurring.isEstimate ? " (estimado)" : ""}. Confirme quando ${isIncome ? "cair" : "pagar"}.`,
      href: "/recurring",
      action: {
        kind: "confirm-recurring",
        recurringId: occurrence.recurring.id,
        month: occurrence.month,
        amountCents: occurrence.amountCents,
      },
    });
  }

  // Mês e categorias.
  const plan = computeMonthPlan(data, month);
  if (plan.freeCents < 0) {
    insights.push({
      id: `month-negative-${month}`,
      tone: "negative",
      title: `Você passou ${money(-plan.freeCents)} do que tinha para ${monthName(month)}`,
      detail: "Os próximos gastos do dia a dia saem de reserva ou do mês que vem.",
      href: `/month?month=${month}`,
    });
  }

  const { day } = parseDateStr(today);
  const monthProgress = day / daysInMonth(month);
  const averages = categoryAverages(data, month, 3, { variableOnly: true });
  for (const lineItem of plan.categories) {
    const category = categories.find((item) => item.id === lineItem.categoryId);
    if (!category || category.systemKey) continue;
    const committed = lineItem.spentCents + lineItem.expectedCents;
    if (lineItem.limitCents) {
      if (committed > lineItem.limitCents) {
        insights.push({
          id: `limit-${category.id}`,
          tone: "negative",
          title: `${category.name} passou do limite`,
          detail: `${money(committed)} de ${money(lineItem.limitCents)} em ${monthName(month)}.`,
          href: `/month?month=${month}`,
        });
        continue;
      }
      const share = committed / lineItem.limitCents;
      if (share >= 0.5 && share > monthProgress + 0.15) {
        insights.push({
          id: `pace-${category.id}`,
          tone: "warning",
          title: `${category.name} está acelerado`,
          detail: `${Math.round(share * 100)}% do limite com ${Math.round(monthProgress * 100)}% do mês.`,
          href: `/month?month=${month}`,
        });
        continue;
      }
    }
    const average = averages.get(category.id) ?? 0;
    if (average >= 10_000 && lineItem.variableCents > average * 1.4) {
      insights.push({
        id: `unusual-${category.id}`,
        tone: "info",
        title: `${category.name} está ${Math.round((lineItem.variableCents / average - 1) * 100)}% acima da sua média`,
        detail: `${money(lineItem.variableCents)} este mês; a média dos últimos meses é ${money(average)}.`,
        href: `/transactions?month=${month}&category=${category.id}`,
      });
    }
  }

  // Parcelas que terminam nesta competência.
  const groups = new Map<string, { last: MonthKey; amount: Cents; description: string; count: number }>();
  for (const tx of transactions) {
    if (!tx.installment || tx.installment.count < 2) continue;
    const current = groups.get(tx.installment.groupId);
    if (!current || tx.competence > current.last) {
      groups.set(tx.installment.groupId, {
        last: tx.competence,
        amount: tx.amountCents,
        description: tx.description,
        count: tx.installment.count,
      });
    }
  }
  for (const [groupId, group] of groups) {
    if (group.last !== month) continue;
    insights.push({
      id: `installment-end-${groupId}`,
      tone: "positive",
      title: `Última parcela de ${group.description} é deste mês`,
      detail: `A partir de ${monthName(addMonths(month, 1))} sobram ${money(group.amount)} por mês.`,
      href: `/transactions?group=${groupId}`,
    });
  }

  // Possível cobrança duplicada (mesmo valor e descrição, mesma conta, até 1 dia de diferença).
  const recent = transactions.filter(
    (tx) => tx.type === "expense" && !tx.installment && !tx.recurringId && diffDays(tx.date, today) <= 30,
  );
  const seen = new Set<string>();
  for (let i = 0; i < recent.length; i += 1) {
    for (let j = i + 1; j < recent.length; j += 1) {
      const a = recent[i];
      const b = recent[j];
      if (a.accountId !== b.accountId || a.amountCents !== b.amountCents || a.amountCents < 500) continue;
      if (Math.abs(diffDays(a.date, b.date)) > 1) continue;
      if (normalizeDescription(a.description) !== normalizeDescription(b.description)) continue;
      const key = [a.id, b.id].sort().join("-");
      if (seen.has(key)) continue;
      seen.add(key);
      insights.push({
        id: `duplicate-${key}`,
        tone: "info",
        title: `Possível cobrança duplicada: ${a.description}`,
        detail: `Dois lançamentos de ${money(a.amountCents)} em ${accountsById.get(a.accountId)?.name ?? "uma conta"}.`,
        href: `/transactions?q=${encodeURIComponent(a.description)}`,
      });
    }
  }

  // Assinatura que veio com valor diferente do cadastrado.
  for (const recurring of recurrings.filter((item) => item.active && !item.isEstimate)) {
    const last = transactions
      .filter((tx) => tx.recurringId === recurring.id && diffDays(tx.date, today) <= 45)
      .sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    if (last && last.amountCents !== recurring.amountCents) {
      insights.push({
        id: `price-${recurring.id}-${last.id}`,
        tone: "info",
        title: `${recurring.description} veio ${money(last.amountCents)}`,
        detail: `O cadastrado é ${money(recurring.amountCents)}. Atualize se o preço mudou.`,
        href: "/recurring",
      });
    }
  }

  // Dinheiro parado rendendo menos do que poderia na mesma instituição.
  for (const account of accounts.filter((item) => item.kind === "checking" && !item.archived)) {
    const balance = balances.get(account.id) ?? 0;
    if (balance < 10_000) continue;
    const better = accounts
      .filter(
        (item) =>
          item.institution === account.institution &&
          item.kind === "pocket" &&
          !item.archived &&
          (item.yieldCdiPct ?? 0) > (account.yieldCdiPct ?? 0),
      )
      .sort((a, b) => (a.purpose === "operating" ? -1 : b.purpose === "operating" ? 1 : 0))[0];
    if (!better) continue;
    const gain =
      estimatedMonthlyYieldCents(balance, options.cdiAnnualPct, better.yieldCdiPct) -
      estimatedMonthlyYieldCents(balance, options.cdiAnnualPct, account.yieldCdiPct);
    insights.push({
      id: `idle-${account.id}`,
      tone: "info",
      title: `${money(balance)} parados em ${account.name}`,
      detail:
        gain > 0
          ? `Em ${better.name} (${better.yieldCdiPct}% do CDI) renderiam cerca de ${money(gain)} a mais por mês.`
          : `Rendem ${account.yieldCdiPct ?? 0}% do CDI aí; em ${better.name}, ${better.yieldCdiPct}%.`,
      href: "/accounts",
      action: { kind: "move-money", fromAccountId: account.id, toAccountId: better.id, amountCents: balance },
    });
  }

  // Começo do mês: registrar quanto os cofres renderam no mês que passou.
  if (day <= 7) {
    const previous = addMonths(month, -1);
    const yieldCategory = categories.find((category) => category.systemKey === "yield");
    const yielding = accounts.filter(
      (account) =>
        !account.archived &&
        account.kind !== "credit_card" &&
        (account.yieldCdiPct ?? 0) > 0 &&
        (balances.get(account.id) ?? 0) > 0 &&
        account.openingDate <= dayInMonth(previous, 31),
    );
    const recorded = transactions.some(
      (tx) => tx.type === "income" && tx.competence === previous && tx.categoryId === yieldCategory?.id,
    );
    if (yielding.length && yieldCategory && !recorded) {
      insights.push({
        id: `yields-${previous}`,
        tone: "info",
        title: `Quanto seus cofres renderam em ${monthName(previous)}?`,
        detail: "Copie do app do banco: assim você acompanha o rendimento de verdade mês a mês.",
        href: `/accounts?yields=${previous}`,
      });
    }
  }

  // Conferência de saldos com os apps dos bancos.
  const moneyAccounts = accounts.filter((account) => isMoneyAccount(account) && !account.archived);
  const oldest = moneyAccounts
    .map((account) => (account.lastReconciledAt ? diffDays(account.lastReconciledAt, today) : Infinity))
    .reduce((max, value) => Math.max(max, value), 0);
  if (moneyAccounts.length && oldest > 14) {
    insights.push({
      id: "reconcile",
      tone: "info",
      title: "Confira os saldos com os apps dos bancos",
      detail: Number.isFinite(oldest) ? `A última conferência foi há ${oldest} dias.` : "Leva um minuto e mantém tudo batendo.",
      href: "/accounts?reconcile=1",
      action: { kind: "reconcile" },
    });
  }

  // Metas do mês atrasadas (a partir do dia 20).
  if (day >= 20) {
    for (const goal of accounts.filter((account) => account.purpose === "goal" && account.goal?.monthlyCents && !account.archived)) {
      const deposited = transactions
        .filter((tx) => tx.type === "transfer" && tx.toAccountId === goal.id && tx.competence === month)
        .reduce((total, tx) => total + tx.amountCents, 0);
      const missing = (goal.goal?.monthlyCents ?? 0) - deposited;
      const reached = (balances.get(goal.id) ?? 0) >= (goal.goal?.targetCents ?? Infinity);
      if (missing > 0 && !reached) {
        insights.push({
          id: `goal-${goal.id}-${month}`,
          tone: "info",
          title: `Faltam ${money(missing)} para a meta de ${monthName(month)} em ${goal.name}`,
          href: "/accounts",
          action: operating
            ? { kind: "move-money", fromAccountId: operating.id, toAccountId: goal.id, amountCents: missing }
            : undefined,
        });
      }
    }
  }

  return insights.sort((a, b) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone]);
}

/** Fatura em que uma compra no cartão feita hoje cairia. */
export function currentInvoiceMonth(data: FinanceData, cardId: string): MonthKey | null {
  const card = data.accounts.find((account) => account.id === cardId);
  return card?.card ? invoiceMonthFor(card.card, data.today) : null;
}
