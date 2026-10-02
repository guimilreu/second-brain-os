import Link from "next/link";
import { DonutRing } from "@/components/charts/DonutRing";
import type { MonthKey } from "@/features/finance/domain/types";
import { CategoryIcon } from "@/features/finance/components/shared/CategoryIcon";
import { Meter } from "@/components/ui/Meter";
import { Money } from "@/components/ui/Money";
import { Panel } from "@/components/ui/Panel";
import { cn } from "@/lib/utils";
import type { CategoryRow } from "./monthView";

type Phase = "past" | "current" | "future";

type CategoryBreakdownProps = {
  rows: CategoryRow[];
  month: MonthKey;
  phase: Phase;
};

/** Gasto por categoria contra o limite e contra a média dos últimos meses. */
export function CategoryBreakdown({ rows, month, phase }: CategoryBreakdownProps) {
  return (
    <Panel
      title="Categorias"
      description={phase === "future" ? "O que já está marcado para o mês." : "Para onde foi o dinheiro do mês."}
      padded={false}
      className="overflow-hidden"
    >
      {rows.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted-foreground">Nenhum gasto neste mês ainda.</p>
      ) : (
        <>
          <CategoryDonut rows={rows} />
          <ul className="divide-y divide-border">
            {rows.map((row) => (
              <CategoryItem
                key={row.key}
                row={row}
                month={month}
                phase={phase}
                share={shareOf(row, rows)}
              />
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
}

function totalOf(rows: CategoryRow[]) {
  return rows.reduce((sum, row) => sum + Math.max(row.spentCents + row.expectedCents, 0), 0);
}

function shareOf(row: CategoryRow, rows: CategoryRow[]) {
  const total = totalOf(rows);
  return total > 0 ? (Math.max(row.spentCents + row.expectedCents, 0) / total) * 100 : 0;
}

/** Rosca do mês: cada categoria com a cor dela, total no meio. */
function CategoryDonut({ rows }: { rows: CategoryRow[] }) {
  const total = totalOf(rows);
  const segments = rows
    .filter((row) => row.spentCents + row.expectedCents > 0)
    .map((row) => ({ key: row.key, value: row.spentCents + row.expectedCents, color: row.color ?? "#94a3b8", label: row.name }));
  if (!segments.length) return null;
  return (
    <div className="flex justify-center px-5 pt-2 pb-5">
      <DonutRing segments={segments} className="w-48">
        <div>
          <Money cents={total} compact className="display block text-2xl" />
          <p className="mt-1 text-[0.6875rem] text-muted-foreground">no mês</p>
        </div>
      </DonutRing>
    </div>
  );
}

function CategoryItem({ row, month, phase, share }: { row: CategoryRow; month: MonthKey; phase: Phase; share: number }) {
  const committed = row.spentCents + row.expectedCents;
  const href = row.categoryId
    ? `/transactions?month=${month}&category=${row.categoryId}`
    : `/transactions?month=${month}`;
  // Média só vale com alguma base; no mês atual só avisa quando já passou dela.
  const vsAverage =
    row.averageCents && row.averageCents >= 1_000 && phase !== "future"
      ? Math.round((committed / row.averageCents - 1) * 100)
      : null;
  const showAverage = vsAverage !== null && (phase === "past" ? Math.abs(vsAverage) >= 10 : vsAverage >= 10);

  const meta: React.ReactNode[] = [];
  if (row.expectedCents > 0) {
    meta.push(
      <>
        +{" "}
        <Money
          cents={row.expectedCents}
          compact
        />{" "}
        previsto em fixas
      </>,
    );
  }
  if (row.limitCents) {
    const over = committed > row.limitCents;
    meta.push(
      <span className={cn(over && "font-semibold text-negative")}>
        {over ? "passou " : "sobram "}
        <Money
          cents={Math.abs(row.limitCents - committed)}
          compact
        />
      </span>,
    );
  }
  if (showAverage && vsAverage !== null) {
    meta.push(
      <span className={cn("font-semibold", vsAverage > 0 ? "text-negative" : "text-positive")}>
        {vsAverage > 0 ? "+" : "−"}
        {Math.abs(vsAverage)}% vs média
      </span>,
    );
  }

  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-foreground/[0.03]"
      >
        <CategoryIcon
          icon={row.icon}
          color={row.color}
        />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-3">
            <span className="truncate text-sm font-semibold">{row.name}</span>
            <span className="shrink-0 text-sm">
              <Money
                cents={row.spentCents}
                className="font-semibold"
              />
              {row.limitCents ? (
                <span className="text-xs text-muted-foreground">
                  {" "}
                  / <Money
                    cents={row.limitCents}
                    compact
                  />
                </span>
              ) : null}
            </span>
          </span>
          {row.limitCents ? (
            <Meter
              value={(committed / row.limitCents) * 100}
              tone="auto"
              className="mt-1.5"
            />
          ) : (
            <span className="mt-2 block h-1 w-full overflow-hidden rounded-full bg-foreground/[0.06]">
              <span
                className="block h-full rounded-full"
                style={{ width: `${Math.max(share, 1.5)}%`, backgroundColor: row.color ?? "#94a3b8" }}
              />
            </span>
          )}
          {meta.length ? (
            <span className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
              {meta.map((item, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1.5"
                >
                  {index > 0 ? <span aria-hidden>·</span> : null}
                  <span>{item}</span>
                </span>
              ))}
            </span>
          ) : null}
        </span>
      </Link>
    </li>
  );
}
