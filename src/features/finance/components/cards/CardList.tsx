import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { diffDays } from "@/features/finance/domain/dates";
import { invoiceLabel, relativeDays } from "@/features/finance/domain/labels";
import type { DateStr } from "@/features/finance/domain/types";
import { InstitutionMark } from "@/features/finance/components/shared/InstitutionMark";
import { Money } from "@/components/ui/Money";
import { Pill } from "@/components/ui/Pill";
import { cycleRule } from "./cardLabels";
import type { CardListItem } from "./cardView";

type CardListProps = {
  items: CardListItem[];
  today: DateStr;
};

/** Vários cartões ativos: um bloco por cartão com a fatura aberta e a que vence. */
export function CardList({ items, today }: CardListProps) {
  const currentYear = Number(today.slice(0, 4));

  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map(({ card, open, due }) => (
        <li key={card.id}>
          <Link
            href={`/cards/${card.id}`}
            className="tile flex h-full flex-col gap-4 p-5 transition-transform duration-300 hover:-translate-y-0.5"
          >
            <div className="flex items-center gap-3">
              <InstitutionMark
                institution={card.institution}
                name={card.name}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">
                  {card.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {cycleRule(card.card)}
                </p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {invoiceLabel(open.month, currentYear)} · aberta
              </p>
              <Money
                cents={open.totalCents}
                className="mt-0.5 block text-xl font-semibold"
              />
            </div>
            {due ? (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Pill tone={due.state === "overdue" ? "negative" : "warning"}>
                  {due.state === "overdue" ? "Atrasada" : "Fechada"}
                </Pill>
                <span className="text-muted-foreground">
                  {invoiceLabel(due.month, currentYear)}{" "}
                  {due.state === "overdue" ? "venceu" : "vence"} {relativeDays(diffDays(today, due.dueDate))}:
                </span>
                <Money
                  cents={due.remainingCents}
                  className="font-semibold"
                />
              </div>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
