"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MiniBars } from "@/components/charts/MiniBars";
import { Ring } from "@/components/charts/Ring";
import { diffDays } from "@/features/finance/domain/dates";
import { dayMonth, invoiceLabel, relativeDays } from "@/features/finance/domain/labels";
import type { Cents, DateStr, MonthKey } from "@/features/finance/domain/types";
import { InstitutionMark } from "@/features/finance/components/shared/InstitutionMark";
import { Button, buttonVariants } from "@/components/ui/button";
import { Meter } from "@/components/ui/Meter";
import { Money } from "@/components/ui/Money";
import { Pill } from "@/components/ui/Pill";
import { cn } from "@/lib/utils";
import { formatCents } from "@/lib/utils/format";
import { useEntryStore } from "@/stores/entry-store";
import type { CardOverview } from "./todayView";

export type CardSpotlightItem = {
  overview: CardOverview;
  upcoming: { month: MonthKey; label: string; cents: Cents; isOpen: boolean }[];
  usedCents: Cents;
};

/** O cartão em destaque: fatura aberta, limite usado, próximas faturas e a reserva para pagar. */
export function CardSpotlight({ items, today, className }: { items: CardSpotlightItem[]; today: DateStr; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {items.map((item) => (
        <CardBlock key={item.overview.card.id} item={item} today={today} />
      ))}
    </div>
  );
}

function CardBlock({ item, today }: { item: CardSpotlightItem; today: DateStr }) {
  const openNew = useEntryStore((state) => state.openNew);
  const { overview, upcoming, usedCents } = item;
  const { card, open, due, reserve, reserveBalanceCents, neededCents, operatingAccountId } = overview;
  const currentYear = Number(today.slice(0, 4));
  const limit = card.card?.limitCents ?? null;
  const usage = limit ? (usedCents / limit) * 100 : null;
  const gap = neededCents - reserveBalanceCents;
  const coverage = neededCents > 0 ? (reserveBalanceCents / neededCents) * 100 : 100;
  const closingIn = open ? diffDays(today, open.closingDate) : null;

  return (
    <section className="tile relative overflow-hidden p-5 md:p-6 animate-rise">
      <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-[radial-gradient(circle,color-mix(in_oklch,#820ad1_45%,transparent),transparent_65%)] blur-2xl" />

      <header className="relative flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <InstitutionMark institution={card.institution} name={card.name} size="md" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{card.name}</p>
            {closingIn !== null ? (
              <p className="text-xs text-muted-foreground">fatura fecha {relativeDays(closingIn)}</p>
            ) : null}
          </div>
        </div>
        <Link href={`/cards/${card.id}`} className={cn(buttonVariants({ variant: "ghost", size: "xs" }), "-mr-2 shrink-0")}>
          Faturas
          <ArrowRight />
        </Link>
      </header>

      <div className="relative mt-5 grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="min-w-0">
          {open ? (
            <>
              <div className="flex items-center gap-2">
                <p className="text-[0.8125rem] text-muted-foreground">{invoiceLabel(open.month, currentYear)}</p>
                <Pill tone="primary">aberta</Pill>
              </div>
              <Money cents={open.totalCents} className="display mt-2 block text-5xl" />
              <p className="mt-2 text-xs text-muted-foreground">
                fecha {dayMonth(open.closingDate)} · vence {dayMonth(open.dueDate)}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma fatura aberta.</p>
          )}
        </div>
        {usage !== null && limit ? (
          <Ring value={usage} className="size-28 justify-self-center" from="#9b87ff" to="#00d0ff">
            <div>
              <p className="display text-xl">{Math.round(usage)}%</p>
              <p className="mt-0.5 text-[0.625rem] leading-tight text-muted-foreground">
                do limite
                <br />
                <Money cents={limit - usedCents} compact /> livre
              </p>
            </div>
          </Ring>
        ) : null}
      </div>

      {due.length ? (
        <div className="relative mt-5 space-y-2">
          {due.map((invoice) => {
            const overdue = invoice.state === "overdue";
            return (
              <div
                key={invoice.month}
                className={cn("flex items-center gap-3 rounded-2xl px-3.5 py-2.5", overdue ? "bg-negative/12" : "bg-warning/10")}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[0.8125rem] font-semibold">{invoiceLabel(invoice.month, currentYear)}</p>
                  <p className={cn("text-xs", overdue ? "text-negative" : "text-muted-foreground")}>
                    {overdue ? "venceu" : "vence"} {dayMonth(invoice.dueDate)} · {relativeDays(diffDays(today, invoice.dueDate))}
                  </p>
                </div>
                <Money cents={invoice.remainingCents} className="text-sm font-semibold" />
                <Button
                  size="xs"
                  onClick={() =>
                    openNew({
                      type: "transfer",
                      accountId: reserve?.id,
                      toAccountId: card.id,
                      amountCents: invoice.remainingCents,
                      invoiceMonth: invoice.month,
                      description: `Pagamento da ${invoiceLabel(invoice.month, currentYear).toLowerCase()}`,
                      title: `Pagar ${invoiceLabel(invoice.month, currentYear).toLowerCase()}`,
                    })
                  }
                >
                  Pagar
                </Button>
              </div>
            );
          })}
        </div>
      ) : null}

      {upcoming.length > 1 ? (
        <div className="relative mt-6">
          <p className="text-xs text-muted-foreground">Próximas faturas</p>
          <MiniBars
            className="mt-3"
            height="h-24"
            groups={upcoming.map((invoice) => ({
              key: invoice.month,
              label: invoice.label,
              highlight: invoice.isOpen,
              values: [
                {
                  value: invoice.cents,
                  color: invoice.isOpen ? "var(--primary)" : "#9b87ff",
                  title: `${invoice.label}: ${formatCents(invoice.cents)}`,
                },
              ],
            }))}
          />
        </div>
      ) : null}

      {reserve ? (
        <div className="relative mt-6 rounded-2xl bg-foreground/[0.04] p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Guardado em {reserve.name}</p>
              <p className="mt-1 text-sm">
                <Money cents={reserveBalanceCents} className="font-semibold" />
                <span className="text-muted-foreground">
                  {" "}
                  de <Money cents={neededCents} />
                </span>
              </p>
            </div>
            {gap >= 100 ? (
              <Button
                size="sm"
                className="shrink-0"
                onClick={() =>
                  openNew({
                    type: "transfer",
                    accountId: operatingAccountId ?? undefined,
                    toAccountId: reserve.id,
                    amountCents: gap,
                    description: "Guardar para a fatura",
                    title: `Guardar em ${reserve.name}`,
                  })
                }
              >
                Guardar <Money cents={gap} compact />
              </Button>
            ) : null}
          </div>
          <Meter value={coverage} tone={gap >= 100 ? "warning" : "positive"} className="mt-3" />
        </div>
      ) : null}
    </section>
  );
}
