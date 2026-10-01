import Link from "next/link";
import { ChevronLeft, ChevronRight, Undo2 } from "lucide-react";
import { addMonths } from "@/features/finance/domain/dates";
import { monthLabel, monthName } from "@/features/finance/domain/labels";
import type { MonthKey } from "@/features/finance/domain/types";
import { buttonVariants } from "@/components/ui/button";

type MonthNavProps = {
  month: MonthKey;
  currentMonth: MonthKey;
};

export function MonthNav({ month, currentMonth }: MonthNavProps) {
  const currentYear = Number(currentMonth.slice(0, 4));
  const previous = addMonths(month, -1);
  const next = addMonths(month, 1);

  return (
    <nav
      aria-label="Trocar de mês"
      className="flex items-center gap-1.5"
    >
      {month !== currentMonth ? (
        <Link
          href="/month"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <Undo2 />
          Voltar para {monthName(currentMonth)}
        </Link>
      ) : null}
      <Link
        href={`/month?month=${previous}`}
        aria-label={`Mês anterior: ${monthLabel(previous, currentYear)}`}
        className={buttonVariants({ variant: "outline", size: "icon-sm" })}
      >
        <ChevronLeft />
      </Link>
      <Link
        href={`/month?month=${next}`}
        aria-label={`Próximo mês: ${monthLabel(next, currentYear)}`}
        className={buttonVariants({ variant: "outline", size: "icon-sm" })}
      >
        <ChevronRight />
      </Link>
    </nav>
  );
}
