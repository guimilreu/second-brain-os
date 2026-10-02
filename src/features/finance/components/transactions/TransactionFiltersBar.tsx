"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from "lucide-react";
import { addMonths } from "@/features/finance/domain/dates";
import { monthLabel } from "@/features/finance/domain/labels";
import type { Account, Category, MonthKey } from "@/features/finance/domain/types";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/FormField";
import { Segmented } from "@/components/ui/Segmented";
import { cn } from "@/lib/utils";
import { accountLabel, capitalize } from "../entry/entryLogic";
import type { TransactionFilters, TypeFilter } from "./transactionFilters";

type TypeOption = TypeFilter | "all";

const TYPE_OPTIONS: { value: TypeOption; label: string }[] = [
  { value: "all", label: "Tudo" },
  { value: "expense", label: "Gastos" },
  { value: "income", label: "Entradas" },
  { value: "transfer", label: "Transferências" },
];

type TransactionFiltersBarProps = {
  filters: TransactionFilters;
  query: string;
  onQueryChange: (value: string) => void;
  onClearQuery: () => void;
  onApply: (patch: Partial<TransactionFilters>) => void;
  accounts: Account[];
  categories: Category[];
  currentMonth: MonthKey;
};

export function TransactionFiltersBar({
  filters,
  query,
  onQueryChange,
  onClearQuery,
  onApply,
  accounts,
  categories,
  currentMonth,
}: TransactionFiltersBarProps) {
  const [showSelects, setShowSelects] = useState(Boolean(filters.account || filters.category));
  const currentYear = Number(currentMonth.slice(0, 4));
  const baseMonth = filters.month === "all" ? currentMonth : filters.month;
  const account = accounts.find((item) => item.id === filters.account);
  const category = categories.find((item) => item.id === filters.category);
  const selectCount = Number(Boolean(filters.account)) + Number(Boolean(filters.category));

  const activeAccounts = accounts.filter((item) => !item.archived);
  const archivedAccounts = accounts.filter((item) => item.archived);
  const expenseCategories = categories.filter((item) => item.kind === "expense" && !item.archived);
  const incomeCategories = categories.filter((item) => item.kind === "income" && !item.archived);
  const archivedCategories = categories.filter((item) => item.archived);

  const chips: { key: string; label: string; onRemove: () => void }[] = [];
  if (account) {
    chips.push({ key: "account", label: accountLabel(account, accounts), onRemove: () => onApply({ account: null }) });
  }
  if (filters.category) {
    chips.push({
      key: "category",
      label: category?.name ?? "Sem categoria",
      onRemove: () => onApply({ category: null }),
    });
  }
  if (filters.q) chips.push({ key: "q", label: `“${filters.q}”`, onRemove: onClearQuery });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-full bg-foreground/[0.05] p-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Mês anterior"
            onClick={() => onApply({ month: addMonths(baseMonth, -1) })}
          >
            <ChevronLeft />
          </Button>
          <button
            type="button"
            onClick={() => onApply({ month: currentMonth })}
            title="Voltar para o mês atual"
            className="min-w-28 px-1.5 text-center text-sm font-bold tracking-tight"
          >
            {filters.month === "all" ? "Todos os meses" : capitalize(monthLabel(filters.month, currentYear))}
          </button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Próximo mês"
            onClick={() => onApply({ month: addMonths(baseMonth, 1) })}
          >
            <ChevronRight />
          </Button>
        </div>
        <Button
          variant={filters.month === "all" ? "secondary" : "outline"}
          size="sm"
          aria-pressed={filters.month === "all"}
          onClick={() => onApply({ month: filters.month === "all" ? currentMonth : "all" })}
        >
          Todos
        </Button>
        <Segmented
          options={TYPE_OPTIONS}
          value={filters.type ?? "all"}
          onChange={(value) => onApply({ type: value === "all" ? null : value })}
          className="order-last w-full sm:order-none sm:ml-auto sm:w-auto"
        />
        <Button
          variant="outline"
          size="sm"
          aria-expanded={showSelects}
          aria-controls="transactions-selects"
          onClick={() => setShowSelects((value) => !value)}
          className="ml-auto sm:hidden"
        >
          <SlidersHorizontal />
          Filtros
          {selectCount ? <span className="num text-primary-ink">{selectCount}</span> : null}
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative sm:flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            maxLength={80}
            aria-label="Buscar lançamentos"
            placeholder="Buscar por descrição ou valor"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onApply({ q: query.trim() });
              if (event.key === "Escape" && query) onClearQuery();
            }}
            className="h-9 w-full rounded-lg border border-input bg-card pr-9 pl-9 text-base shadow-xs transition-[border-color,box-shadow] placeholder:text-muted-foreground/70 hover:border-muted-foreground/40 focus:border-ring focus:ring-3 focus:ring-ring/20 focus:outline-none sm:text-sm"
          />
          {query ? (
            <button
              type="button"
              aria-label="Limpar busca"
              onClick={onClearQuery}
              className="absolute top-1/2 right-1.5 grid size-6 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>
        <div
          id="transactions-selects"
          className={cn("grid-cols-2 gap-2 sm:flex", showSelects ? "grid" : "hidden")}
        >
          <Select
            aria-label="Conta"
            value={filters.account ?? ""}
            onChange={(event) => onApply({ account: event.target.value || null })}
            className="sm:w-48"
          >
            <option value="">Todas as contas</option>
            {activeAccounts.map((item) => (
              <option
                key={item.id}
                value={item.id}
              >
                {accountLabel(item, accounts)}
              </option>
            ))}
            {archivedAccounts.length ? (
              <optgroup label="Arquivadas">
                {archivedAccounts.map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {accountLabel(item, accounts)}
                  </option>
                ))}
              </optgroup>
            ) : null}
          </Select>
          <Select
            aria-label="Categoria"
            value={filters.category ?? ""}
            onChange={(event) => onApply({ category: event.target.value || null })}
            className="sm:w-48"
          >
            <option value="">Todas as categorias</option>
            <option value="none">Sem categoria</option>
            <optgroup label="Gastos">
              {expenseCategories.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Entradas">
              {incomeCategories.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.name}
                </option>
              ))}
            </optgroup>
            {archivedCategories.length ? (
              <optgroup label="Arquivadas">
                {archivedCategories.map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.name}
                  </option>
                ))}
              </optgroup>
            ) : null}
          </Select>
        </div>
      </div>

      {chips.length ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.onRemove}
              aria-label={`Remover filtro ${chip.label}`}
              className="inline-flex h-7 max-w-full items-center gap-1 rounded-md bg-accent px-2 text-xs font-semibold text-accent-foreground transition-colors hover:bg-accent/70"
            >
              <span className="truncate">{chip.label}</span>
              <X className="size-3 shrink-0" />
            </button>
          ))}
          {chips.length > 1 ? (
            <button
              type="button"
              onClick={() => onApply({ account: null, category: null, q: "" })}
              className="h-7 px-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Limpar tudo
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
