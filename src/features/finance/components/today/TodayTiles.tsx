import Link from "next/link";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { BubbleCloud } from "@/components/charts/BubbleCloud";
import { DonutRing } from "@/components/charts/DonutRing";
import { Heatmap } from "@/components/charts/Heatmap";
import { MiniBars } from "@/components/charts/MiniBars";
import { PaceChart } from "@/components/charts/PaceChart";
import { Ring } from "@/components/charts/Ring";
import { StackedBar } from "@/components/charts/StackedBar";
import { WeekBars } from "@/components/charts/WeekBars";
import { CATEGORY_ICONS } from "@/features/finance/components/shared/CategoryIcon";
import { InstitutionMark } from "@/features/finance/components/shared/InstitutionMark";
import { daysInMonth, parseDateStr } from "@/features/finance/domain/dates";
import { monthName } from "@/features/finance/domain/labels";
import type { MonthPlan } from "@/features/finance/domain/plan";
import type { Cents, DateStr } from "@/features/finance/domain/types";
import { buttonVariants } from "@/components/ui/button";
import { Money } from "@/components/ui/Money";
import { cn } from "@/lib/utils";
import { formatCents } from "@/lib/utils/format";
import type { CategorySlice, cashflow, monthHeat, moneySnapshot, paceSeries, weekSpend } from "./todayCharts";

type TileProps = {
  title: React.ReactNode;
  aside?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
};

export function Tile({ title, aside, className, children }: TileProps) {
  return (
    <section className={cn("tile relative flex flex-col overflow-hidden p-5 md:p-6 animate-rise", className)}>
      <header className="mb-4 flex min-h-6 items-center justify-between gap-3">
        <h2 className="text-[0.8125rem] font-medium text-muted-foreground">{title}</h2>
        {aside}
      </header>
      {children}
    </section>
  );
}

function CategoryGlyph({ icon }: { icon: string | null }) {
  const Icon = (icon && CATEGORY_ICONS[icon]) || CATEGORY_ICONS.tag;
  return <Icon />;
}

// ——— Herói: quanto ainda dá para gastar ———

type Segment = { id: string; label: string; cents: Cents; operator: "+" | "−" | null };

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

export function HeroTile({
  plan,
  today,
  pace,
  className,
}: {
  plan: MonthPlan;
  today: DateStr;
  pace: ReturnType<typeof paceSeries>;
  className?: string;
}) {
  const negative = plan.freeCents < 0;
  const month = monthName(plan.month);
  const daysLeft = plan.daysLeft ?? 1;
  const monthProgress = (parseDateStr(today).day / daysInMonth(plan.month)) * 100;
  const noRoom = plan.availableCents <= 0;
  const spentShare = noRoom ? 100 : Math.max((plan.variableCents / plan.availableCents) * 100, 0);

  return (
    <section className={cn("tile relative overflow-hidden p-6 md:p-8 animate-rise", className)}>
      <div aria-hidden className="pointer-events-none absolute -top-32 -right-20 size-96 rounded-full bg-[radial-gradient(circle,var(--glow-1),transparent_62%)] blur-2xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-40 -left-24 size-96 rounded-full bg-[radial-gradient(circle,var(--glow-2),transparent_62%)] blur-2xl" />

      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            {negative ? `Passou do limite de ${month}` : `Ainda pode gastar em ${month}`}
            <span className="num rounded-full bg-foreground/[0.07] px-2 py-0.5 text-xs font-semibold text-foreground sm:hidden">
              {Math.min(Math.round(spentShare), 999)}% usado
            </span>
          </p>
          <Money
            cents={plan.freeCents}
            signed={negative}
            className={cn("display mt-2 block text-[3rem] md:text-7xl", !negative && "text-foreground")}
          />
          <p className={cn("mt-3 text-[0.9375rem]", negative ? "text-negative" : "text-muted-foreground")}>
            {negative ? (
              `Você passou ${formatCents(-plan.freeCents)} do que tinha para ${month}.`
            ) : daysLeft <= 1 ? (
              `Hoje é o último dia de ${month}.`
            ) : (
              <>
                Dá <Money cents={plan.perDayCents ?? 0} className="font-semibold text-foreground" /> por dia nos
                próximos <span className="num font-semibold text-foreground">{daysLeft}</span> dias.
              </>
            )}
          </p>
        </div>
        <Ring value={spentShare} className="hidden size-32 shrink-0 self-center sm:block md:size-40">
          <div>
            <p className="display text-3xl md:text-4xl">{Math.min(Math.round(spentShare), 999)}%</p>
            <p className="mt-1 text-[0.6875rem] text-muted-foreground">do dia a dia</p>
          </div>
        </Ring>
      </div>

      <div className="relative mt-6 flex flex-wrap items-center gap-1.5">
        {buildSegments(plan).map((segment) => (
          <span key={segment.id} className="contents">
            {segment.operator ? (
              <span aria-hidden className="num px-0.5 text-sm text-muted-foreground">
                {segment.operator}
              </span>
            ) : null}
            <Link
              href={`/month#${segment.id}`}
              className="flex items-baseline gap-1.5 rounded-full bg-foreground/[0.06] px-3 py-1.5 text-[0.8125rem] transition-colors hover:bg-foreground/[0.1]"
            >
              <span className="text-muted-foreground">
                {segment.operator ? <span className="sr-only">{segment.operator === "+" ? "mais " : "menos "}</span> : null}
                {segment.label}
              </span>
              <Money cents={segment.cents} compact className="font-semibold" />
            </Link>
          </span>
        ))}
      </div>

      <div className="relative mt-6">
        <div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded-full bg-primary" />
              gasto do dia a dia
            </span>
            {pace.budget > 0 ? (
              <span className="flex items-center gap-1.5">
                <span className="h-0 w-4 border-t border-dashed border-foreground/40" />
                ritmo ideal
              </span>
            ) : null}
          </span>
          <span>
            <span className="num">{Math.round(monthProgress)}%</span> do mês
          </span>
        </div>
        <PaceChart cumulative={pace.cumulative} daysInMonth={pace.days} budget={pace.budget} />
        <div className="mt-1.5 flex justify-between text-[0.625rem] text-muted-foreground/70">
          {[1, 8, 15, 22, pace.days].map((day) => (
            <span key={day} className="num">
              {day}
            </span>
          ))}
        </div>
        <PaceVerdict pace={pace} month={month} />
      </div>
    </section>
  );
}

/** No ritmo de hoje, quanto o dia a dia fecha o mês (só a partir do 5º dia: antes é ruído). */
function PaceVerdict({ pace, month }: { pace: ReturnType<typeof paceSeries>; month: string }) {
  const elapsed = pace.cumulative.length;
  if (elapsed < 5 || pace.budget <= 0) return null;
  const spent = pace.cumulative[elapsed - 1];
  const projected = Math.round((spent / elapsed) * pace.days);
  const over = projected - pace.budget;
  return (
    <p className="mt-3 text-[0.8125rem] text-muted-foreground">
      No ritmo de hoje, o dia a dia fecha {month} em{" "}
      <Money cents={projected} compact className="font-semibold text-foreground" />
      {over > 0 ? (
        <>
          {" "}
          — <Money cents={over} compact className="font-semibold text-negative" /> acima do que dá.
        </>
      ) : (
        <>
          {" "}
          — sobram <Money cents={-over} compact className="font-semibold text-positive" />.
        </>
      )}
    </p>
  );
}

// ——— Dinheiro em cada conta ———

export function MoneyTile({ snapshot, className }: { snapshot: ReturnType<typeof moneySnapshot>; className?: string }) {
  return (
    <Tile
      title="Seu dinheiro"
      className={className}
      aside={
        <Link href="/accounts" className={cn(buttonVariants({ variant: "ghost", size: "xs" }), "-mr-2")}>
          Contas
          <ArrowRight />
        </Link>
      }
    >
      <Money cents={snapshot.total} className="display block text-4xl" />
      <p className="mt-2 text-xs text-muted-foreground">
        Patrimônio <Money cents={snapshot.netWorth} className="font-semibold text-foreground" /> já com o cartão
      </p>
      <StackedBar parts={snapshot.parts} className="mt-5" />
      <ul className="mt-5 space-y-3">
        {snapshot.rows.slice(0, 5).map(({ account, cents }) => (
          <li key={account.id} className="flex items-center gap-3">
            <InstitutionMark institution={account.institution} name={account.name} size="sm" />
            <span className="min-w-0 flex-1 truncate text-[0.8125rem]">{account.name}</span>
            <Money cents={cents} className="text-[0.8125rem] font-semibold" />
          </li>
        ))}
      </ul>
    </Tile>
  );
}

// ——— Gastos do mês por categoria (rosca) ———

export function SpendDonutTile({ slices, month, className }: { slices: CategorySlice[]; month: string; className?: string }) {
  const total = slices.reduce((sum, slice) => sum + slice.cents, 0);
  return (
    <Tile title={`Gastos de ${monthName(month)}`} className={className}>
      {slices.length ? (
        <div className="flex flex-1 flex-col items-center gap-5">
          <DonutRing
            segments={slices.map((slice) => ({ key: slice.key, value: slice.cents, color: slice.color, label: `${slice.label} · ${formatCents(slice.cents)}` }))}
            className="w-44"
          >
            <div>
              <Money cents={total} compact className="display block text-2xl" />
              <p className="mt-1 text-[0.6875rem] text-muted-foreground">no mês</p>
            </div>
          </DonutRing>
          <ul className="w-full space-y-2.5">
            {slices.slice(0, 5).map((slice) => (
              <li key={slice.key} className="flex items-center gap-2.5 text-[0.8125rem]">
                <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: slice.color }} />
                <span className="min-w-0 flex-1 truncate">{slice.label}</span>
                <span className="num text-muted-foreground">{Math.round(slice.pct)}%</span>
                <Money cents={slice.cents} compact className="w-16 text-right font-semibold" />
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Nenhum gasto neste mês ainda.</p>
      )}
    </Tile>
  );
}

// ——— Semana ———

export function WeekTile({ week, className }: { week: ReturnType<typeof weekSpend>; className?: string }) {
  const delta = week.lastWeek > 0 ? ((week.thisWeek - week.lastWeek) / week.lastWeek) * 100 : null;
  const up = delta !== null && delta > 0;
  return (
    <Tile
      title="Gastos essa semana"
      className={className}
      aside={
        delta !== null ? (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold",
              up ? "bg-negative/14 text-negative" : "bg-positive/14 text-positive",
            )}
            title="Comparado com a semana passada até o mesmo dia"
          >
            {up ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
            {Math.abs(Math.round(delta))}%
          </span>
        ) : null
      }
    >
      <Money cents={week.thisWeek} className="display block text-4xl" />
      <p className="mt-2 text-xs text-muted-foreground">
        Semana passada até hoje: <Money cents={week.lastWeek} className="font-semibold text-foreground" />
      </p>
      <WeekBars bars={week.bars} className="mt-auto pt-5" />
    </Tile>
  );
}

// ——— Calendário de calor ———

export function HeatTile({ heat, className }: { heat: ReturnType<typeof monthHeat>; className?: string }) {
  return (
    <Tile
      title="Seu mês em dias"
      className={className}
      aside={
        <span className="flex items-center gap-1 text-[0.625rem] text-muted-foreground">
          menos
          {[0.15, 0.4, 0.7, 1].map((level) => (
            <span
              key={level}
              className="size-2.5 rounded-[3px]"
              style={{ backgroundColor: `color-mix(in oklch, var(--lime) ${Math.round(28 + level * 72)}%, transparent)` }}
            />
          ))}
          mais
        </span>
      }
    >
      <Heatmap days={heat.days} leadingBlanks={heat.leadingBlanks} />
      <p className="mt-4 text-xs text-muted-foreground">
        <span className="num font-semibold text-foreground">{heat.quietDays}</span>{" "}
        {heat.quietDays === 1 ? "dia" : "dias"} sem gastar ·{" "}
        <span className="num font-semibold text-foreground">{heat.activeDays}</span> com gasto
      </p>
    </Tile>
  );
}

// ——— Bolhas: para onde foi o dinheiro ———

export function BubblesTile({ slices, className }: { slices: CategorySlice[]; className?: string }) {
  const leader = slices[0];
  return (
    <Tile title="Para onde foi o dinheiro" aside={<span className="text-xs text-muted-foreground">últimos 3 meses</span>} className={className}>
      {slices.length ? (
        <>
          <BubbleCloud
            bubbles={slices.map((slice) => ({
              key: slice.key,
              value: slice.cents,
              color: slice.color,
              label: `${slice.label} · ${formatCents(slice.cents)}`,
              caption: `${Math.round(slice.pct)}%`,
              icon: <CategoryGlyph icon={slice.icon} />,
            }))}
            aspect={1.55}
          />
          {leader ? (
            <p className="mt-4 text-[0.8125rem] text-muted-foreground">
              <span className="font-semibold text-foreground">{leader.label}</span> lidera com{" "}
              <span className="num font-semibold text-foreground">{Math.round(leader.pct)}%</span> do que saiu.
            </p>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Sem gastos nos últimos meses.</p>
      )}
    </Tile>
  );
}

// ——— Entradas × saídas ———

export function CashflowTile({ months, className }: { months: ReturnType<typeof cashflow>; className?: string }) {
  const current = months[months.length - 1];
  const net = current ? current.income - current.spent : 0;
  return (
    <Tile
      title="Entradas e saídas"
      className={className}
      aside={
        <span className="flex items-center gap-3 text-[0.6875rem] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-positive" />
            entrou
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-chart-3" />
            saiu
          </span>
        </span>
      }
    >
      <div className="flex items-baseline gap-2">
        <Money cents={net} signed className="display text-4xl" />
        <span className="text-xs text-muted-foreground">em {current ? monthName(current.month) : ""} até agora</span>
      </div>
      <MiniBars
        className="mt-auto pt-6"
        height="h-40"
        groups={months.map((month) => ({
          key: month.month,
          label: month.label,
          highlight: month.isCurrent,
          values: [
            { value: month.income, color: "var(--positive)", title: `Entrou ${formatCents(month.income)}` },
            { value: month.spent, color: "var(--chart-3)", title: `Saiu ${formatCents(month.spent)}` },
          ],
        }))}
      />
    </Tile>
  );
}
