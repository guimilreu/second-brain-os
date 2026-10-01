"use client";

import { useEffect, useEffectEvent, useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, ReceiptText, SearchX } from "lucide-react";
import { monthOf } from "@/features/finance/domain/dates";
import { dayMonth, monthLabel, monthShort } from "@/features/finance/domain/labels";
import type { Account, Category, DateStr, Transaction } from "@/features/finance/domain/types";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Money } from "@/components/ui/Money";
import { formatCents } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { useEntryStore } from "@/stores/entry-store";
import { accountLabel } from "../entry/entryLogic";
import { TransactionFiltersBar } from "./TransactionFiltersBar";
import { TransactionList } from "./TransactionList";
import {
  hasActiveFilters,
  PAGE_SIZE,
  transactionsHref,
  type InstallmentGroup,
  type TransactionFilters,
  type TransactionsSummary,
  type TypeFilter,
} from "./transactionFilters";

/** Ação do topo: já abre no tipo que está sendo filtrado. */
export function LaunchButton({ type }: { type: TypeFilter | null }) {
  const openNew = useEntryStore((state) => state.openNew);
  return (
    <Button onClick={() => openNew(type ? { type } : undefined)}>
      <Plus />
      Lançar
    </Button>
  );
}

function SummaryItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 px-2.5 py-3 sm:px-4">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-[0.8125rem] font-semibold sm:text-base">{children}</dd>
    </div>
  );
}

type TransactionsViewProps = {
  filters: TransactionFilters;
  /** Já filtrados e limitados no servidor. */
  transactions: Transaction[];
  /** Quantos lançamentos batem com os filtros (pode ser mais que os listados). */
  total: number;
  summary: TransactionsSummary;
  group: InstallmentGroup | null;
  accounts: Account[];
  categories: Category[];
  today: DateStr;
};

export function TransactionsView({
  filters,
  transactions,
  total,
  summary,
  group,
  accounts,
  categories,
  today,
}: TransactionsViewProps) {
  const router = useRouter();
  const openNew = useEntryStore((state) => state.openNew);
  const openEdit = useEntryStore((state) => state.openEdit);
  const [isPending, startTransition] = useTransition();
  // Os controles respondem na hora; a lista chega do servidor.
  const [view, setView] = useOptimistic(filters);
  const currentMonth = monthOf(today);
  const currentYear = Number(today.slice(0, 4));

  const [query, setQuery] = useState(filters.q);
  const [sentQuery, setSentQuery] = useState(filters.q);
  const [seenQuery, setSeenQuery] = useState(filters.q);
  if (filters.q !== seenQuery) {
    // Busca que chega pela URL (⌘K) atualiza o campo; o eco da própria digitação não.
    setSeenQuery(filters.q);
    if (filters.q !== sentQuery) {
      setQuery(filters.q);
      setSentQuery(filters.q);
    }
  }

  function navigate(next: TransactionFilters) {
    setSentQuery(next.q);
    startTransition(() => {
      setView(next);
      router.replace(transactionsHref(next, currentMonth), { scroll: false });
    });
  }

  function apply(patch: Partial<TransactionFilters>) {
    if (patch.q === "") setQuery("");
    navigate({ ...view, q: query.trim(), ...patch, limit: patch.limit ?? PAGE_SIZE });
  }

  const commitQuery = useEffectEvent((value: string) => apply({ q: value }));
  useEffect(() => {
    const value = query.trim();
    if (value === sentQuery) return;
    const handle = setTimeout(() => commitQuery(value), 300);
    return () => clearTimeout(handle);
  }, [query, sentQuery]);

  const accountsById = new Map(accounts.map((account) => [account.id, account]));
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const filtered = hasActiveFilters(filters);

  if (filters.group) {
    const groupAccount = group ? accountsById.get(group.accountId) : undefined;
    return (
      <div
        aria-busy={isPending}
        className={cn("space-y-4 transition-opacity", isPending && "opacity-60")}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => apply({ group: null, month: currentMonth })}
          className="-ml-2"
        >
          <ArrowLeft />
          Todos os lançamentos
        </Button>
        {group ? (
          <>
            <section className="rounded-xl border border-border bg-card p-4 shadow-xs">
              <p className="text-xs font-semibold text-muted-foreground">Compra parcelada</p>
              <div className="mt-1 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-bold tracking-tight">{group.description}</h2>
                  <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">
                    {[
                      groupAccount ? accountLabel(groupAccount, accounts) : null,
                      `comprada em ${dayMonth(group.date)}`,
                      group.firstInvoice && group.lastInvoice
                        ? `fatura de ${monthShort(group.firstInvoice)} até ${monthShort(group.lastInvoice)}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <Money
                    cents={group.totalCents}
                    className="text-lg font-semibold"
                  />
                  <p className="num text-xs text-muted-foreground">
                    {group.count}× de {formatCents(group.installmentCents)}
                  </p>
                </div>
              </div>
              {group.listed < group.count ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  {group.listed} de {group.count} parcelas continuam lançadas.
                </p>
              ) : null}
            </section>
            <TransactionList
              transactions={transactions}
              accountsById={accountsById}
              categoriesById={categoriesById}
              today={today}
              flat
              onEdit={openEdit}
            />
          </>
        ) : (
          <EmptyState
            icon={SearchX}
            title="Compra não encontrada"
            description="As parcelas dessa compra foram excluídas."
            actionLabel="Ver lançamentos"
            onAction={() => apply({ group: null, month: currentMonth })}
          />
        )}
      </div>
    );
  }

  const periodLabel = filters.month === "all" ? "" : monthLabel(filters.month, currentYear);

  return (
    <div className="space-y-4">
      <TransactionFiltersBar
        filters={view}
        query={query}
        onQueryChange={setQuery}
        onClearQuery={() => apply({ q: "" })}
        onApply={apply}
        accounts={accounts}
        categories={categories}
        currentMonth={currentMonth}
      />

      <div
        aria-busy={isPending}
        className={cn("space-y-4 transition-opacity", isPending && "opacity-60")}
      >
        {transactions.length ? (
          <>
            {filters.type === "transfer" ? (
              <p className="text-[0.8125rem] text-muted-foreground">
                <span className="num font-semibold text-foreground">{formatCents(summary.transferCents)}</span> em{" "}
                {summary.count} {summary.count === 1 ? "transferência" : "transferências"}. Transferência não é gasto
                nem entrada.
              </p>
            ) : (
              <div className="space-y-1.5">
                <dl className="grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-card shadow-xs">
                  <SummaryItem label="Entradas">
                    <Money
                      cents={summary.incomeCents}
                      className={summary.incomeCents > 0 ? "text-positive" : undefined}
                    />
                  </SummaryItem>
                  <SummaryItem label="Saídas">
                    <Money
                      cents={summary.outCents}
                      className={summary.outCents > 0 ? "text-negative" : undefined}
                    />
                  </SummaryItem>
                  <SummaryItem label="Resultado">
                    <Money
                      cents={summary.resultCents}
                      signed
                    />
                  </SummaryItem>
                </dl>
                <p className="text-xs text-muted-foreground">
                  {total} {total === 1 ? "lançamento" : "lançamentos"} · Compra no cartão conta no mês da fatura;
                  transferências ficam de fora.
                </p>
              </div>
            )}
            <TransactionList
              transactions={transactions}
              accountsById={accountsById}
              categoriesById={categoriesById}
              today={today}
              onEdit={openEdit}
            />
            {transactions.length < total ? (
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => apply({ limit: filters.limit + PAGE_SIZE })}
                >
                  Mostrar mais ({total - transactions.length})
                </Button>
              </div>
            ) : null}
          </>
        ) : filtered ? (
          <EmptyState
            icon={SearchX}
            title="Nada encontrado"
            description={
              filters.month === "all"
                ? "Nenhum lançamento bate com esses filtros."
                : `Nenhum lançamento em ${periodLabel} bate com esses filtros.`
            }
            actionLabel="Limpar filtros"
            onAction={() => apply({ type: null, account: null, category: null, q: "" })}
          />
        ) : (
          <EmptyState
            icon={ReceiptText}
            title={filters.month === "all" ? "Nenhum lançamento ainda" : `Nada lançado em ${periodLabel}`}
            description="Gastos, entradas e transferências aparecem aqui, separados por dia."
            actionLabel="Lançar"
            onAction={() => openNew()}
          />
        )}
      </div>
    </div>
  );
}
