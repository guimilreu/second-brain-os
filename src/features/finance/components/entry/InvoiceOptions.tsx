"use client";

import { useState } from "react";
import { invoiceDates } from "@/features/finance/domain/card";
import { addMonths } from "@/features/finance/domain/dates";
import { dayMonth, monthLabel } from "@/features/finance/domain/labels";
import type { CardConfig, MonthKey } from "@/features/finance/domain/types";
import { Segmented } from "@/components/ui/Segmented";
import { cn } from "@/lib/utils";
import { capitalize, type AmountMode } from "./entryLogic";

const INSTALLMENT_OPTIONS = Array.from({ length: 24 }, (_, index) => index + 1);

const AMOUNT_MODES: { value: AmountMode; label: string }[] = [
  { value: "total", label: "Valor total" },
  { value: "installment", label: "Valor da parcela" },
];

type InvoiceChipsProps = {
  card: CardConfig;
  months: MonthKey[];
  value: MonthKey | null;
  onChange: (month: MonthKey | null) => void;
  currentYear: number;
  /** Opção "automática" (valor null) com o rótulo dado. */
  automaticLabel?: string;
  /** Mês que corresponde ao automático (marcado quando value é null). */
  automaticMonth?: MonthKey;
  dateKind: "due" | "closing-or-due";
  today?: string;
};

function InvoiceChips({
  card,
  months,
  value,
  onChange,
  currentYear,
  automaticLabel,
  automaticMonth,
  dateKind,
  today,
}: InvoiceChipsProps) {
  const chips: { key: string; month: MonthKey | null; title: string; detail: string | null }[] = [];
  if (automaticLabel) {
    chips.push({ key: "auto", month: null, title: automaticLabel, detail: null });
  }
  for (const month of months) {
    const { closingDate, dueDate } = invoiceDates(card, month);
    const closed = today ? closingDate <= today : false;
    chips.push({
      key: month,
      month,
      title: capitalize(monthLabel(month, currentYear)),
      detail:
        dateKind === "closing-or-due" && !closed ? `fecha ${dayMonth(closingDate)}` : `vence ${dayMonth(dueDate)}`,
    });
  }
  const selected = value ?? (automaticLabel ? null : automaticMonth ?? null);

  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((chip) => {
        const active = chip.month === selected;
        return (
          <button
            key={chip.key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(chip.month === automaticMonth && !automaticLabel ? null : chip.month)}
            className={cn(
              "flex flex-col items-start rounded-lg border px-2.5 py-1.5 text-left transition-colors",
              active
                ? "border-primary bg-primary/10 ring-1 ring-primary/40"
                : "border-border bg-card hover:bg-muted",
            )}
          >
            <span className="text-[0.8125rem] font-semibold">{chip.title}</span>
            {chip.detail ? <span className="text-[0.6875rem] text-muted-foreground">{chip.detail}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

type CardPurchaseOptionsProps = {
  id: string;
  card: CardConfig;
  allowInstallments: boolean;
  installments: number;
  onInstallments: (count: number) => void;
  amountMode: AmountMode;
  onAmountMode: (mode: AmountMode) => void;
  /** Fatura automática da compra (pela data). */
  autoInvoice: MonthKey;
  chosenInvoice: MonthKey | null;
  onInvoice: (month: MonthKey | null) => void;
  currentYear: number;
};

/** Parcelas, "valor total ou da parcela" e a troca de fatura de uma compra no cartão. */
export function CardPurchaseOptions({
  id,
  card,
  allowInstallments,
  installments,
  onInstallments,
  amountMode,
  onAmountMode,
  autoInvoice,
  chosenInvoice,
  onInvoice,
  currentYear,
}: CardPurchaseOptionsProps) {
  const [choosing, setChoosing] = useState(chosenInvoice !== null);

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
      {allowInstallments ? (
        <div className="flex flex-wrap items-center gap-2">
          <label
            htmlFor={`${id}-installments`}
            className="text-[0.8125rem] font-semibold"
          >
            Parcelas
          </label>
          <select
            id={`${id}-installments`}
            value={installments}
            onChange={(event) => onInstallments(Number(event.target.value))}
            className="num h-9 cursor-pointer rounded-lg border border-input bg-card px-2.5 text-base font-semibold shadow-xs focus:border-ring focus:ring-3 focus:ring-ring/20 focus:outline-none sm:text-sm"
          >
            {INSTALLMENT_OPTIONS.map((count) => (
              <option
                key={count}
                value={count}
              >
                {count === 1 ? "À vista" : `${count}×`}
              </option>
            ))}
          </select>
          {installments > 1 ? (
            <Segmented
              size="sm"
              options={AMOUNT_MODES}
              value={amountMode}
              onChange={onAmountMode}
            />
          ) : null}
        </div>
      ) : null}

      {choosing ? (
        <div className="space-y-1.5">
          <p className="text-[0.8125rem] font-semibold">
            {installments > 1 ? "Primeira parcela na fatura de" : "Cai na fatura de"}
          </p>
          <InvoiceChips
            card={card}
            months={[autoInvoice, addMonths(autoInvoice, 1), addMonths(autoInvoice, 2)]}
            value={chosenInvoice}
            onChange={onInvoice}
            currentYear={currentYear}
            automaticMonth={autoInvoice}
            dateKind="due"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setChoosing(true)}
          className="text-[0.8125rem] font-semibold text-primary hover:underline"
        >
          Escolher outra fatura
        </button>
      )}
    </div>
  );
}

type PaymentInvoiceOptionsProps = {
  card: CardConfig;
  months: MonthKey[];
  value: MonthKey | null;
  onChange: (month: MonthKey | null) => void;
  currentYear: number;
  today: string;
};

/** Transferência para o cartão: qual fatura está sendo paga. */
export function PaymentInvoiceOptions({ card, months, value, onChange, currentYear, today }: PaymentInvoiceOptionsProps) {
  return (
    <div className="space-y-1.5">
      <p className="text-[0.8125rem] font-semibold">Qual fatura?</p>
      <InvoiceChips
        card={card}
        months={months}
        value={value}
        onChange={onChange}
        currentYear={currentYear}
        automaticLabel="A mais antiga em aberto"
        dateKind="closing-or-due"
        today={today}
      />
    </div>
  );
}
