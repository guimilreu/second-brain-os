"use client";

import Link from "next/link";
import { CalendarCheck, CalendarClock, CreditCard, Repeat, type LucideIcon } from "lucide-react";
import { relativeDays, weekdayDayMonth } from "@/features/finance/domain/labels";
import { Money } from "@/components/ui/Money";
import { Panel } from "@/components/ui/Panel";
import { useEntryStore } from "@/stores/entry-store";
import type { UpcomingDay, UpcomingItem } from "./todayView";

const ICONS: Record<UpcomingItem["kind"], LucideIcon> = {
  recurring: Repeat,
  "invoice-due": CreditCard,
  "invoice-closing": CalendarCheck,
  scheduled: CalendarClock,
};

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

type UpcomingPanelProps = {
  days: UpcomingDay[];
  horizonDays: number;
};

/** Linha do tempo dos próximos dias: fixas, faturas e lançamentos agendados. */
export function UpcomingPanel({ days, horizonDays }: UpcomingPanelProps) {
  return (
    <Panel
      title="Próximos dias"
      description={`O que vem nos próximos ${horizonDays} dias.`}
      padded={false}
      className="overflow-hidden"
    >
      {days.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted-foreground">Nada previsto para os próximos {horizonDays} dias.</p>
      ) : (
        <ol className="divide-y divide-border">
          {days.map((day) => (
            <li
              key={day.date}
              className="py-2"
            >
              <p className="px-5 pt-1 pb-1.5 text-xs font-semibold text-muted-foreground">
                {capitalize(relativeDays(day.days))} · {weekdayDayMonth(day.date)}
              </p>
              <ul>
                {day.items.map((item) => (
                  <UpcomingRow
                    key={item.key}
                    item={item}
                  />
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

function UpcomingRow({ item }: { item: UpcomingItem }) {
  const openEdit = useEntryStore((state) => state.openEdit);
  const Icon = ICONS[item.kind];
  const transaction = item.transaction;

  const content = (
    <>
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.8125rem] font-semibold">{item.title}</span>
        <span className="block truncate text-xs text-muted-foreground">{item.meta}</span>
      </span>
      {item.signed ? (
        <Money
          cents={item.amountCents}
          signed
          className="shrink-0 text-[0.8125rem] font-semibold"
        />
      ) : (
        <Money
          cents={item.amountCents}
          className="shrink-0 text-[0.8125rem] font-semibold text-muted-foreground"
        />
      )}
    </>
  );
  const rowClass = "flex items-center gap-3 px-5 py-2";
  const interactiveClass = `${rowClass} w-full text-left transition-colors hover:bg-muted/50`;

  return (
    <li>
      {transaction ? (
        <button
          type="button"
          onClick={() => openEdit(transaction)}
          className={interactiveClass}
        >
          {content}
        </button>
      ) : item.href ? (
        <Link
          href={item.href}
          className={interactiveClass}
        >
          {content}
        </Link>
      ) : (
        <div className={rowClass}>{content}</div>
      )}
    </li>
  );
}
