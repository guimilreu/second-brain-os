import { monthName } from "@/features/finance/domain/labels";
import type { MonthPlan } from "@/features/finance/domain/plan";
import { Money } from "@/components/ui/Money";
import { cn } from "@/lib/utils";
import { formatCents } from "@/lib/utils/format";

/** O resultado do mês no tempo certo: fechamento (passado), quanto ainda dá (atual) ou previsão (futuro). */
export function MonthHero({ plan }: { plan: MonthPlan }) {
  const month = monthName(plan.month);
  const negative = plan.freeCents < 0;
  const missing = formatCents(-plan.freeCents);

  let label: string;
  let sentence: React.ReactNode;
  if (plan.isPast) {
    label = negative ? `Faltou em ${month}` : `Sobrou em ${month}`;
    sentence = negative
      ? `Os gastos passaram ${missing} do que entrou.`
      : "Depois das fixas, das parcelas, do que foi guardado e do dia a dia.";
  } else if (plan.isCurrent) {
    const daysLeft = plan.daysLeft ?? 1;
    label = negative ? `Passou do limite de ${month}` : `Ainda pode gastar em ${month}`;
    if (negative) {
      sentence = `Você passou ${missing} do que tinha para ${month}.`;
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
  } else {
    label = `Livre previsto para ${month}`;
    sentence = negative
      ? `Do jeito que está, ${month} fecha ${missing} no vermelho.`
      : "Se as entradas e fixas vierem como previsto, já contando parcelas e metas.";
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-xs md:p-6">
      <p className="text-[0.8125rem] font-medium text-muted-foreground">{label}</p>
      <p className="mt-1">
        <Money
          cents={plan.freeCents}
          signed={negative}
          className={cn(
            "text-4xl font-semibold tracking-tight md:text-5xl",
            !negative && (plan.isPast ? "text-positive" : "text-foreground"),
          )}
        />
      </p>
      <p className={cn("mt-2 text-sm", negative ? "text-negative" : "text-muted-foreground")}>{sentence}</p>
    </section>
  );
}
