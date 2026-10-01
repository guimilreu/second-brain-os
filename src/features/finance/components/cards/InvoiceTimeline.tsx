"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { dayMonth, monthShort } from "@/features/finance/domain/labels";
import type { MonthKey } from "@/features/finance/domain/types";
import { Money } from "@/components/ui/Money";
import { Pill } from "@/components/ui/Pill";
import { cn } from "@/lib/utils";
import { headlineCents, invoiceStatus, isEmptyInvoice } from "./cardLabels";
import type { InvoiceView } from "./cardView";

type InvoiceTimelineProps = {
  cardId: string;
  invoices: InvoiceView[];
  selectedMonth: MonthKey;
};

function dateHint(invoice: InvoiceView) {
  switch (invoice.state) {
    case "open":
      return `fecha ${dayMonth(invoice.closingDate)}`;
    case "overdue":
      return `venceu ${dayMonth(invoice.dueDate)}`;
    case "paid":
      if (invoice.lastPaymentDate) return `paga ${dayMonth(invoice.lastPaymentDate)}`;
      return isEmptyInvoice(invoice) ? `fechou ${dayMonth(invoice.closingDate)}` : `venceu ${dayMonth(invoice.dueDate)}`;
    default:
      return `vence ${dayMonth(invoice.dueDate)}`;
  }
}

/** Faixa das faturas (anteriores, fechada, aberta e futuras): arrasta no mobile, troca o ?month=. */
export function InvoiceTimeline({ cardId, invoices, selectedMonth }: InvoiceTimelineProps) {
  const listRef = useRef<HTMLOListElement>(null);
  const settled = useRef(false);

  useEffect(() => {
    const list = listRef.current;
    const chip = list?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!list || !chip) return;
    // A escolhida pode estar fora da tela no mobile; ao abrir a página, sem animação para não "deslizar".
    list.scrollTo({
      left: chip.offsetLeft - (list.clientWidth - chip.offsetWidth) / 2,
      behavior: settled.current ? "smooth" : "auto",
    });
    settled.current = true;
  }, [selectedMonth]);

  return (
    <nav aria-label="Faturas do cartão">
      <ol
        ref={listRef}
        className="relative -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-2 overflow-x-auto px-4 py-1 scrollbar-none sm:-mx-1 sm:scroll-px-1 sm:px-1"
      >
        {invoices.map((invoice) => {
          const selected = invoice.month === selectedMonth;
          const status = invoiceStatus(invoice);
          return (
            <li
              key={invoice.month}
              className="shrink-0 snap-start"
            >
              <Link
                href={`/cards/${cardId}?month=${invoice.month}`}
                scroll={false}
                replace
                aria-current={selected ? "true" : undefined}
                className={cn(
                  "flex w-38 flex-col gap-1 rounded-xl border p-3 transition-colors",
                  selected
                    ? "border-primary bg-accent shadow-xs"
                    : "border-border bg-card hover:bg-muted/60",
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">
                    {monthShort(invoice.month)}
                  </span>
                  <Pill tone={status.tone}>
                    {status.label}
                  </Pill>
                </span>
                <Money
                  cents={headlineCents(invoice)}
                  className="mt-1 text-base font-semibold"
                />
                <span className="text-[0.6875rem] text-muted-foreground">
                  {dateHint(invoice)}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
