"use client";

import { ChevronDown } from "lucide-react";
import { invoiceMonthFor } from "@/features/finance/domain/card";
import { monthName } from "@/features/finance/domain/labels";
import type { Account, Cents, DateStr } from "@/features/finance/domain/types";
import { InstitutionMark } from "@/features/finance/components/shared/InstitutionMark";
import { Select } from "@/components/ui/FormField";
import { formatCents } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { accountLabel, type AccountContext } from "./entryLogic";

type AccountPickerProps = {
  id: string;
  label: string;
  accounts: Account[];
  primary: Account[];
  others: Account[];
  value: string | null;
  onChange: (accountId: string) => void;
  balances: Record<string, Cents>;
  context: AccountContext;
  /** Data do lançamento: o atalho do cartão mostra em qual fatura cairia. */
  date: DateStr;
  error?: string;
};

/** Atalhos das contas do dia a dia (com saldo) + "Outra conta" para cofres e arquivadas. */
export function AccountPicker({
  id,
  label,
  accounts,
  primary,
  others,
  value,
  onChange,
  balances,
  context,
  date,
  error,
}: AccountPickerProps) {
  const selectedOther = others.find((account) => account.id === value);

  return (
    <div
      id={id}
      role="group"
      aria-labelledby={`${id}-label`}
      className="space-y-2"
    >
      <p
        id={`${id}-label`}
        className="text-[0.8125rem] font-semibold"
      >
        {label}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {primary.map((account) => {
          const selected = account.id === value;
          const balance = balances[account.id];
          return (
            <button
              key={account.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(account.id)}
              className={cn(
                "flex min-h-12 items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left transition-colors",
                selected
                  ? "border-primary bg-primary/10 ring-1 ring-primary/40"
                  : "border-border bg-card hover:bg-muted",
              )}
            >
              <InstitutionMark
                institution={account.institution}
                name={account.name}
                size="sm"
              />
              <span className="min-w-0">
                <span className="line-clamp-2 block text-[0.8125rem] leading-tight font-semibold">
                  {accountLabel(account, accounts, context)}
                </span>
                {account.card ? (
                  <span className="block truncate text-[0.6875rem] text-muted-foreground">
                    Fatura de {monthName(invoiceMonthFor(account.card, date))}
                  </span>
                ) : balance !== undefined ? (
                  <span className="num block truncate text-[0.6875rem] text-muted-foreground">
                    {formatCents(balance)}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
      {others.length ? (
        <Select
          id={`${id}-other`}
          aria-label="Outra conta"
          value={selectedOther?.id ?? ""}
          onChange={(event) => {
            if (event.target.value) onChange(event.target.value);
          }}
          className={selectedOther ? "ring-2 ring-primary/40" : undefined}
        >
          <option value="">Outra conta…</option>
          {others.map((account) => (
            <option
              key={account.id}
              value={account.id}
            >
              {accountLabel(account, accounts, context)}
              {account.archived ? " (arquivada)" : ""}
              {!account.card && balances[account.id] !== undefined ? ` · ${formatCents(balances[account.id])}` : ""}
            </option>
          ))}
        </Select>
      ) : null}
      {error ? <p className="text-xs text-negative">{error}</p> : null}
    </div>
  );
}

type AccountSelectProps = {
  id: string;
  label: string;
  accounts: Account[];
  options: Account[];
  value: string | null;
  onChange: (accountId: string) => void;
  balances: Record<string, Cents>;
  /** Variação do saldo depois do lançamento (−valor na origem, +valor no destino). */
  deltaCents: Cents | null;
  error?: string;
};

/** Seletor nativo (rápido no celular) com a cara de um cartão de conta: selo, nome e saldo. */
export function AccountSelect({
  id,
  label,
  accounts,
  options,
  value,
  onChange,
  balances,
  deltaCents,
  error,
}: AccountSelectProps) {
  const account = accounts.find((item) => item.id === value);
  const balance = account && !account.card ? balances[account.id] : undefined;
  const after = balance !== undefined && deltaCents ? balance + deltaCents : null;
  const active = options.filter((item) => !item.archived);
  const archived = options.filter((item) => item.archived);

  return (
    <div className="space-y-1.5">
      <div
        className={cn(
          "relative flex h-14 items-center gap-3 rounded-lg border bg-card px-3 shadow-xs transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20",
          error ? "border-negative" : "border-input",
        )}
      >
        {account ? (
          <InstitutionMark
            institution={account.institution}
            name={account.name}
          />
        ) : (
          <span className="size-8 shrink-0 rounded-lg border border-dashed border-border" />
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-[0.6875rem] font-semibold text-muted-foreground">{label}</span>
          <span className={cn("block truncate text-sm font-semibold", !account && "text-muted-foreground")}>
            {account ? accountLabel(account, accounts) : "Escolha a conta"}
          </span>
        </span>
        {balance !== undefined ? (
          <span className="shrink-0 text-right">
            <span className="num block text-[0.8125rem] font-semibold">{formatCents(balance)}</span>
            {after !== null ? (
              <span className={cn("num block text-[0.6875rem]", after < 0 ? "text-negative" : "text-muted-foreground")}>
                fica {formatCents(after)}
              </span>
            ) : null}
          </span>
        ) : null}
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        <select
          id={id}
          aria-label={label}
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          className="absolute inset-0 size-full cursor-pointer appearance-none text-base opacity-0"
        >
          <option
            value=""
            disabled
          >
            Escolha a conta
          </option>
          {active.map((item) => (
            <option
              key={item.id}
              value={item.id}
            >
              {accountLabel(item, accounts)}
              {!item.card && balances[item.id] !== undefined ? ` · ${formatCents(balances[item.id])}` : ""}
            </option>
          ))}
          {archived.length ? (
            <optgroup label="Arquivadas">
              {archived.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {accountLabel(item, accounts)}
                </option>
              ))}
            </optgroup>
          ) : null}
        </select>
      </div>
      {error ? <p className="text-xs text-negative">{error}</p> : null}
    </div>
  );
}
