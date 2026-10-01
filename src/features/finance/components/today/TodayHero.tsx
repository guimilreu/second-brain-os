import Link from "next/link";
import { daysInMonth, parseDateStr } from "@/features/finance/domain/dates";
import { monthName } from "@/features/finance/domain/labels";
import type { MonthPlan } from "@/features/finance/domain/plan";
import type { Cents, DateStr } from "@/features/finance/domain/types";
import { Meter } from "@/components/ui/Meter";
import { Money } from "@/components/ui/Money";
import { cn } from "@/lib/utils";
import { formatCents } from "@/lib/utils/format";

type TodayHeroProps = {
  plan: MonthPlan;
  today: DateStr;
};

type Segment = { id: string; label: string; cents: Cents; operator: "+" | "−" | null };

/** Cada parcela da conta do mês, na ordem em que ela é feita; zeros somem para a linha caber. */
function buildSegments(plan: MonthPlan): Segment[] {
  const subtract = (id: string, label: string, positiveLabel: string, cents: Cents): Segment =>
    cents < 0 ? { id, label: positiveLabel, cents: -cents, operator: "+" } : { id, label, cents, operator: "−" };
  return [
    { id: "entradas", label: "Entradas", cents: plan.income.totalCents, operator: null },
    subtract("fixas", "Fixas", "Fixas", plan.fixed.totalCents),
    subtract("parcelas", "Parcelas", "Parcelas", plan.installmentsCents),
    subtract("guardar", "Guardar", "Resgatado", plan.savings.totalCents),
    subtract("gasto", "Gasto", "Estornos", plan.variableCents),
  ].filter((segment) => segment.operator === null || segment.cents !== 0);
}

/** "Ainda pode gastar": o número que responde "como estou?" no mês atual. */
export function TodayHero({ plan, today }: TodayHeroProps) {
  const negative = plan.freeCents < 0;
  const month = monthName(plan.month);
  const daysLeft = plan.daysLeft ?? 1;
  const monthProgress = (parseDateStr(today).day / daysInMonth(plan.month)) * 100;
  const noRoom = plan.availableCents <= 0;
  const spentShare = noRoom ? 100 : Math.max((plan.variableCents / plan.availableCents) * 100, 0);
  const paceTone = noRoom || spentShare > 100 ? "negative" : spentShare > monthProgress + 10 ? "warning" : "primary";

  let sentence: React.ReactNode;
  if (negative) {
    sentence = `Você passou ${formatCents(-plan.freeCents)} do que tinha para ${month}. Os próximos gastos do dia a dia saem da reserva ou do mês que vem.`;
  } else if (daysLeft <= 1) {
    sentence = `Hoje é o último dia de ${month}.`;
  } else {
    sentence = (
      <>
        <Money
          cents={plan.perDayCents ?? 0}
          className="font-semibold text-foreground"
        />{" "}
        por dia pelos próximos <span className="num font-semibold text-foreground">{daysLeft}</span> dias.
      </>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-xs md:p-6">
      <p className="text-[0.8125rem] font-medium text-muted-foreground">
        {negative ? `Passou do limite de ${month}` : `Ainda pode gastar em ${month}`}
      </p>
      <p className="mt-1">
        <Money
          cents={plan.freeCents}
          signed={negative}
          className={cn("text-4xl font-semibold tracking-tight md:text-5xl", !negative && "text-foreground")}
        />
      </p>
      <p className={cn("mt-2 text-sm", negative ? "text-negative" : "text-muted-foreground")}>{sentence}</p>

      <div className="mt-5 flex flex-wrap items-center gap-1.5">
        {buildSegments(plan).map((segment) => (
          <span
            key={segment.id}
            className="contents"
          >
            {segment.operator ? (
              <span
                aria-hidden
                className="num text-sm font-semibold text-muted-foreground"
              >
                {segment.operator}
              </span>
            ) : null}
            <Link
              href={`/month#${segment.id}`}
              className="flex flex-col rounded-lg bg-muted/70 px-2.5 py-1.5 transition-colors hover:bg-muted"
            >
              <span className="text-[0.6875rem] font-medium text-muted-foreground">
                {segment.operator ? <span className="sr-only">{segment.operator === "+" ? "mais " : "menos "}</span> : null}
                {segment.label}
              </span>
              <Money
                cents={segment.cents}
                compact
                className="text-[0.8125rem] font-semibold"
              />
            </Link>
          </span>
        ))}
        <span
          aria-hidden
          className="num text-sm font-semibold text-muted-foreground"
        >
          =
        </span>
        <Link
          href="/month"
          className={cn(
            "flex flex-col rounded-lg px-2.5 py-1.5 transition-colors",
            negative ? "bg-negative/12 hover:bg-negative/18" : "bg-primary/10 hover:bg-primary/15",
          )}
        >
          <span className="text-[0.6875rem] font-medium text-muted-foreground">
            <span className="sr-only">igual a </span>
            Ainda pode gastar
          </span>
          <Money
            cents={plan.freeCents}
            compact
            className={cn("text-[0.8125rem] font-semibold", negative && "text-negative")}
          />
        </Link>
      </div>

      <div className="mt-5 space-y-2">
        <div className="flex items-baseline justify-between gap-3 text-xs text-muted-foreground">
          <span>
            {noRoom ? (
              "Não sobrou nada para o dia a dia depois das contas do mês."
            ) : (
              <>
                Gastou <span className="num font-semibold text-foreground">{Math.round(spentShare)}%</span> do dia a dia
              </>
            )}
          </span>
          <span className="shrink-0">
            <span className="num">{Math.round(monthProgress)}%</span> do mês
          </span>
        </div>
        <div className="relative">
          <Meter
            value={spentShare}
            tone={paceTone}
          />
          <span
            aria-hidden
            className="absolute top-1/2 h-3 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/60"
            style={{ left: `${Math.min(monthProgress, 100)}%` }}
          />
        </div>
      </div>
    </section>
  );
}
