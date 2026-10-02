import { DonutRing } from "@/components/charts/DonutRing";
import { institutionColor } from "@/features/finance/components/shared/InstitutionMark";
import { Money } from "@/components/ui/Money";
import { formatCents } from "@/lib/utils/format";
import type { AccountsOverview } from "./overview";

/** Onde o dinheiro está (rosca por conta) e o patrimônio dividido entre o que é seu e o que é dívida. */
export function MoneyMap({ overview }: { overview: AccountsOverview }) {
  const { stats } = overview;
  const shades = new Map<string, number>();
  const slices = overview.groups
    .flatMap((group) => group.items)
    .filter((item) => item.account.kind !== "credit_card" && item.balanceCents > 0)
    .sort((a, b) => b.balanceCents - a.balanceCents)
    .map((item) => {
      const index = shades.get(item.account.institution) ?? 0;
      shades.set(item.account.institution, index + 1);
      const base = institutionColor(item.account.institution);
      return {
        key: item.account.id,
        name: item.account.name,
        value: item.balanceCents,
        color: index === 0 ? base : `color-mix(in oklch, ${base} ${100 - index * 25}%, white)`,
      };
    });
  const money = slices.reduce((sum, slice) => sum + slice.value, 0);
  const scale = Math.max(money, stats.cardDebtCents, 1);

  return (
    <section className="tile grid gap-8 p-6 md:grid-cols-[auto_1fr] md:items-center md:p-8 animate-rise">
      <div className="flex items-center gap-6">
        <DonutRing
          segments={slices.map((slice) => ({ key: slice.key, value: slice.value, color: slice.color, label: `${slice.name} · ${formatCents(slice.value)}` }))}
          className="w-40 shrink-0"
        >
          <div>
            <Money cents={money} compact className="display block text-xl" />
            <p className="mt-1 text-[0.625rem] text-muted-foreground">em contas</p>
          </div>
        </DonutRing>
        <ul className="space-y-2.5">
          {slices.slice(0, 5).map((slice) => (
            <li key={slice.key} className="flex items-center gap-2 text-[0.8125rem]">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: slice.color }} />
              <span className="text-muted-foreground">{slice.name}</span>
              <span className="num font-semibold">{money ? Math.round((slice.value / money) * 100) : 0}%</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-5">
        <div>
          <p className="text-sm text-muted-foreground">Patrimônio</p>
          <Money cents={stats.netWorthCents} signed={stats.netWorthCents < 0} className="display mt-1 block text-4xl" />
        </div>
        <div className="space-y-3">
          <Bar label="Seu dinheiro" cents={money} scale={scale} color="var(--chart-1)" />
          <Bar label="Dívida do cartão" cents={stats.cardDebtCents} scale={scale} color="var(--chart-3)" />
          {stats.cardReserveCents > 0 ? (
            <Bar label="Guardado para a fatura" cents={stats.cardReserveCents} scale={scale} color="var(--chart-5)" />
          ) : null}
        </div>
      </div>
    </section>
  );
}

function Bar({ label, cents, scale, color }: { label: string; cents: number; scale: number; color: string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <Money cents={cents} className="font-semibold" />
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-foreground/[0.06]">
        <div
          className="h-full origin-left rounded-full animate-rise"
          style={{ width: `${Math.max((cents / scale) * 100, cents > 0 ? 2 : 0)}%`, backgroundColor: color, boxShadow: `0 0 16px -4px ${color}` }}
        />
      </div>
    </div>
  );
}
