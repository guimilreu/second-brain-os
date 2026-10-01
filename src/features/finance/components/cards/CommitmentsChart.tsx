"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Bar, BarChart, BarStack, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { dayMonth, invoiceLabel, monthShort } from "@/features/finance/domain/labels";
import { sumCents } from "@/features/finance/domain/money";
import { Money } from "@/components/ui/Money";
import { Panel } from "@/components/ui/Panel";
import type { CommitmentMonth } from "./cardView";

// Ordem validada para daltonismo (vizinhas na pilha bem separadas): índigo, verde-água, âmbar.
const SERIES = [
  { key: "installmentsCents", label: "Parcelas", color: "var(--chart-1)" },
  { key: "fixedCents", label: "Fixas", color: "var(--chart-2)" },
  { key: "otherCents", label: "Compras", color: "var(--chart-3)" },
] as const;

type ChartDatum = CommitmentMonth & { label: string };

const AXIS_TICK = { fontSize: 11, fill: "var(--muted-foreground)" };
const compactNumber = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });

type CommitmentsChartProps = {
  cardId: string;
  months: CommitmentMonth[];
  currentYear: number;
};

/** Próximas faturas empilhando parcelas, fixas e compras já lançadas: o impacto de parcelar algo. */
export function CommitmentsChart({ cardId, months, currentYear }: CommitmentsChartProps) {
  const data: ChartDatum[] = months.map((item) => ({ ...item, label: monthShort(item.month) }));
  const totals = SERIES.map((series) => ({ ...series, cents: sumCents(months.map((item) => item[series.key])) }));
  const committed = sumCents(totals.map((series) => series.cents));
  const first = months[0];
  const last = months[months.length - 1];

  return (
    <Panel
      title="Já comprometido nos próximos meses"
      description={
        first && last
          ? `Próximas ${months.length} faturas, de ${monthShort(first.month)} a ${monthShort(last.month)}`
          : undefined
      }
    >
      {committed > 0 ? (
        <div className="space-y-4">
          <div>
            <Money
              cents={committed}
              className="text-2xl font-semibold"
            />
            <p className="mt-0.5 text-xs text-muted-foreground">
              já contados nessas faturas, antes de qualquer compra nova
            </p>
          </div>

          <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
            {totals.map((series) => (
              <li
                key={series.key}
                className="flex items-center gap-1.5 text-xs"
              >
                <span
                  aria-hidden
                  className="size-2.5 rounded-[2px]"
                  style={{ backgroundColor: series.color }}
                />
                <span className="text-muted-foreground">
                  {series.label}
                </span>
                <Money
                  cents={series.cents}
                  className="font-semibold"
                />
              </li>
            ))}
          </ul>

          {/* `num` também borra o gráfico no modo de ocultar valores. */}
          <div className="num h-52 w-full">
            <ResponsiveContainer
              width="100%"
              height="100%"
              initialDimension={{ width: 320, height: 208 }}
            >
              <BarChart
                data={data}
                // À direita: espaço para o rótulo do último mês não ser cortado.
                margin={{ top: 4, right: 14, bottom: 0, left: 0 }}
                barCategoryGap="24%"
              >
                <CartesianGrid
                  vertical={false}
                  stroke="var(--border)"
                />
                <XAxis
                  dataKey="label"
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  interval="preserveStartEnd"
                  minTickGap={6}
                />
                <YAxis
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                  tickCount={4}
                  allowDecimals={false}
                  tickFormatter={(value: number) => compactNumber.format(value / 100)}
                />
                <Tooltip
                  cursor={{ fill: "var(--muted)", fillOpacity: 0.7 }}
                  isAnimationActive={false}
                  content={({ active, payload }) => (
                    <CommitmentTooltip
                      active={active}
                      datum={payload?.[0]?.payload as ChartDatum | undefined}
                      currentYear={currentYear}
                    />
                  )}
                />
                <BarStack radius={[4, 4, 0, 0]}>
                  {SERIES.map((series) => (
                    <Bar
                      key={series.key}
                      dataKey={series.key}
                      name={series.label}
                      fill={series.color}
                      // Contorno na cor do fundo = 2px de respiro entre os blocos empilhados.
                      stroke="var(--card)"
                      strokeWidth={2}
                      maxBarSize={24}
                      isAnimationActive={false}
                    />
                  ))}
                </BarStack>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <details className="group border-t border-border pt-3">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-[0.8125rem] font-semibold text-muted-foreground transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
              Ver fatura a fatura
              <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
            </summary>
            <ul className="mt-2 divide-y divide-border">
              {months.map((item) => (
                <li key={item.month}>
                  <Link
                    href={`/cards/${cardId}?month=${item.month}`}
                    className="flex items-center justify-between gap-3 py-2.5 transition-colors hover:text-primary"
                  >
                    <span className="min-w-0">
                      <span className="block text-[0.8125rem] font-semibold">
                        {invoiceLabel(item.month, currentYear)}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        vence {dayMonth(item.dueDate)}
                        {SERIES.filter((series) => item[series.key] > 0).map((series) => (
                          <span
                            key={series.key}
                            className="whitespace-nowrap"
                          >
                            {" · "}
                            {series.label.toLowerCase()}{" "}
                            <Money cents={item[series.key]} />
                          </span>
                        ))}
                      </span>
                    </span>
                    <Money
                      cents={item.totalCents}
                      className="text-[0.8125rem] font-semibold"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Nenhuma parcela ou fixa nas próximas faturas. Tudo que você parcelar aparece aqui, mês a mês.
        </p>
      )}
    </Panel>
  );
}

type CommitmentTooltipProps = {
  active?: boolean;
  datum: ChartDatum | undefined;
  currentYear: number;
};

function CommitmentTooltip({ active, datum, currentYear }: CommitmentTooltipProps) {
  if (!active || !datum) return null;
  return (
    <div className="min-w-48 rounded-lg border border-border bg-popover px-3 py-2.5 font-sans text-xs tracking-normal text-popover-foreground shadow-md">
      <p className="font-semibold">
        {invoiceLabel(datum.month, currentYear)}
      </p>
      <p className="text-muted-foreground">
        vence {dayMonth(datum.dueDate)}
      </p>
      <ul className="mt-2 space-y-1">
        {SERIES.filter((series) => datum[series.key] > 0).map((series) => (
          <li
            key={series.key}
            className="flex items-center gap-2"
          >
            <span
              aria-hidden
              className="h-0.5 w-3 rounded-full"
              style={{ backgroundColor: series.color }}
            />
            <Money
              cents={datum[series.key]}
              className="font-semibold"
            />
            <span className="text-muted-foreground">
              {series.label}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 flex items-center justify-between gap-3 border-t border-border pt-1.5 font-semibold">
        <span>Total</span>
        <Money cents={datum.totalCents} />
      </p>
    </div>
  );
}
