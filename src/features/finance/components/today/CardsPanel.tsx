"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { diffDays } from "@/features/finance/domain/dates";
import { dayMonth, invoiceLabel, relativeDays } from "@/features/finance/domain/labels";
import type { DateStr } from "@/features/finance/domain/types";
import { InstitutionMark } from "@/features/finance/components/shared/InstitutionMark";
import { Button, buttonVariants } from "@/components/ui/button";
import { Meter } from "@/components/ui/Meter";
import { Money } from "@/components/ui/Money";
import { Panel } from "@/components/ui/Panel";
import { Pill } from "@/components/ui/Pill";
import { cn } from "@/lib/utils";
import { useEntryStore } from "@/stores/entry-store";
import type { CardOverview } from "./todayView";

type CardsPanelProps = {
  cards: CardOverview[];
  today: DateStr;
};

/** Fatura aberta, fatura a pagar e quanto já está guardado para ela — por cartão. */
export function CardsPanel({ cards, today }: CardsPanelProps) {
  return (
    <Panel
      title={cards.length > 1 ? "Cartões" : "Cartão"}
      padded={false}
    >
      <div className="divide-y divide-border">
        {cards.map((overview) => (
          <CardBlock
            key={overview.card.id}
            overview={overview}
            today={today}
          />
        ))}
      </div>
    </Panel>
  );
}

function CardBlock({ overview, today }: { overview: CardOverview; today: DateStr }) {
  const openNew = useEntryStore((state) => state.openNew);
  const { card, open, due, reserve, reserveBalanceCents, neededCents, operatingAccountId } = overview;
  const currentYear = Number(today.slice(0, 4));
  const gap = neededCents - reserveBalanceCents;
  const coverage = neededCents > 0 ? (reserveBalanceCents / neededCents) * 100 : 100;

  return (
    <div className="space-y-4 px-5 py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <InstitutionMark
            institution={card.institution}
            name={card.name}
            size="sm"
          />
          <p className="truncate text-sm font-semibold">{card.name}</p>
        </div>
        <Link
          href={`/cards/${card.id}`}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-mr-2.5 shrink-0")}
        >
          Ver faturas
          <ArrowRight />
        </Link>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
        {open ? (
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-xs font-medium text-muted-foreground">{invoiceLabel(open.month, currentYear)}</p>
              <Pill tone="primary">aberta</Pill>
            </div>
            <Money
              cents={open.totalCents}
              className="mt-1 block text-lg font-semibold"
            />
            <p className="mt-0.5 text-xs text-muted-foreground">
              fecha {dayMonth(open.closingDate)} · vence {dayMonth(open.dueDate)}
            </p>
          </div>
        ) : null}

        {due.map((invoice) => {
          const days = diffDays(today, invoice.dueDate);
          const overdue = invoice.state === "overdue";
          return (
            <div
              key={invoice.month}
              className={cn("rounded-lg p-3", overdue ? "bg-negative/8" : "bg-muted/50")}
            >
              <div className="flex items-center gap-1.5">
                <p className="truncate text-xs font-medium text-muted-foreground">
                  {invoiceLabel(invoice.month, currentYear)}
                </p>
                <Pill tone={overdue ? "negative" : "warning"}>{overdue ? "vencida" : "a pagar"}</Pill>
              </div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <Money
                  cents={invoice.remainingCents}
                  className="text-lg font-semibold"
                />
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
              <p className={cn("mt-0.5 text-xs", overdue ? "text-negative" : "text-muted-foreground")}>
                {overdue ? "venceu" : "vence"} {dayMonth(invoice.dueDate)} · {relativeDays(days)}
              </p>
            </div>
          );
        })}
      </div>

      {reserve ? (
        <div className="space-y-2">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-muted-foreground">Guardado em {reserve.name}</p>
              <p className="mt-0.5 text-sm">
                <Money
                  cents={reserveBalanceCents}
                  className="font-semibold"
                />
                <span className="text-muted-foreground">
                  {" "}
                  de{" "}
                  <Money cents={neededCents} />
                </span>
              </p>
            </div>
            {gap >= 100 ? (
              <Button
                size="xs"
                variant="outline"
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
                Guardar
              </Button>
            ) : null}
          </div>
          <Meter
            value={coverage}
            tone={gap >= 100 ? "warning" : "positive"}
          />
          <p className="text-xs text-muted-foreground">
            {gap >= 100 ? (
              <>
                Faltam{" "}
                <Money
                  cents={gap}
                  className="font-semibold text-foreground"
                />{" "}
                para cobrir o que você ainda vai pagar.
              </>
            ) : gap <= -100 ? (
              <>
                Tudo coberto, e sobram <Money cents={-gap} /> na reserva.
              </>
            ) : (
              "Tudo coberto: o que você ainda vai pagar já está guardado."
            )}
          </p>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Sem cofre de reserva ligado a este cartão.{" "}
          <Link
            href="/accounts"
            className="font-semibold text-primary-ink hover:underline"
          >
            Ligar um cofre
          </Link>
        </p>
      )}
    </div>
  );
}
