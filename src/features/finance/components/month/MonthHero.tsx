import { Ring } from "@/components/charts/Ring";
import { StackedBar } from "@/components/charts/StackedBar";
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
  const noRoom = plan.availableCents <= 0;
  const spentShare = noRoom ? 100 : Math.max((plan.variableCents / plan.availableCents) * 100, 0);

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
          <Money cents={plan.perDayCents ?? 0} className="font-semibold text-foreground" /> por dia pelos próximos{" "}
          <span className="num font-semibold text-foreground">{daysLeft}</span> dias.
        </>
      );
    }
  } else {
    label = `Livre previsto para ${month}`;
    sentence = negative
      ? `Do jeito que está, ${month} fecha ${missing} no vermelho.`
      : "Se as entradas e fixas vierem como previsto, já contando parcelas e metas.";
  }

  // Para onde vai cada real que entra no mês.
  const parts = [
    { key: "fixas", label: "Fixas", value: Math.max(plan.fixed.totalCents, 0), color: "var(--chart-2)" },
    { key: "parcelas", label: "Parcelas", value: Math.max(plan.installmentsCents, 0), color: "var(--chart-3)" },
    { key: "guardar", label: "Guardar", value: Math.max(plan.savings.totalCents, 0), color: "var(--chart-7)" },
    { key: "gasto", label: "Dia a dia", value: Math.max(plan.variableCents, 0), color: "var(--chart-4)" },
    { key: "livre", label: "Livre", value: Math.max(plan.freeCents, 0), color: "var(--chart-1)" },
  ].filter((part) => part.value > 0);

  return (
    <section className="tile relative overflow-hidden p-6 md:p-8 animate-rise">
      <div aria-hidden className="pointer-events-none absolute -top-32 -right-24 size-96 rounded-full bg-[radial-gradient(circle,var(--glow-1),transparent_62%)] blur-2xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-40 -left-24 size-96 rounded-full bg-[radial-gradient(circle,var(--glow-2),transparent_62%)] blur-2xl" />
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <Money
            cents={plan.freeCents}
            signed={negative}
            className={cn("display mt-2 block text-[3rem] md:text-6xl", !negative && (plan.isPast ? "text-positive" : "text-foreground"))}
          />
          <p className={cn("mt-3 text-[0.9375rem]", negative ? "text-negative" : "text-muted-foreground")}>{sentence}</p>
        </div>
        {!plan.isPast || plan.variableCents > 0 ? (
          <Ring value={spentShare} className="size-32 shrink-0 self-center">
            <div>
              <p className="display text-3xl">{Math.min(Math.round(spentShare), 999)}%</p>
              <p className="mt-1 text-[0.6875rem] text-muted-foreground">do dia a dia</p>
            </div>
          </Ring>
        ) : null}
      </div>
      {parts.length ? (
        <div className="relative mt-7">
          <StackedBar parts={parts.map((part) => ({ key: part.key, value: part.value, color: part.color, label: `${part.label} · ${formatCents(part.value)}` }))} className="h-3" />
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            {parts.map((part) => (
              <span key={part.key} className="flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ backgroundColor: part.color }} />
                {part.label}
                <Money cents={part.value} compact className="font-semibold text-foreground" />
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
