"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChartColumn, List } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Rectangle,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type BarShapeProps,
} from "recharts";
import { isMonthKey } from "@/features/finance/domain/dates";
import { monthLabel, monthName } from "@/features/finance/domain/labels";
import type { MonthKey } from "@/features/finance/domain/types";
import { Money } from "@/components/ui/Money";
import { Panel } from "@/components/ui/Panel";
import { Segmented } from "@/components/ui/Segmented";
import { cn } from "@/lib/utils";
import { formatCompactCents } from "@/lib/utils/format";
import type { ForecastRow } from "./monthView";

const FREE_COLOR = "var(--chart-1)";
const SHORT_COLOR = "var(--negative)";
const INSTALLMENTS_COLOR = "var(--chart-3)";
const MONTH_ABBR = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

const VIEW_OPTIONS = [
  { value: "chart" as const, label: "Gráfico", icon: ChartColumn },
  { value: "list" as const, label: "Lista", icon: List },
];

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

type ForecastChartProps = {
  rows: ForecastRow[];
  selectedMonth: MonthKey;
  currentYear: number;
};

/** Livre previsto dos próximos 12 meses, com o pedaço já preso em parcelas em destaque. */
export function ForecastChart({ rows, selectedMonth, currentYear }: ForecastChartProps) {
  const router = useRouter();
  const [view, setView] = useState<"chart" | "list">("chart");
  const label = (month: MonthKey) => capitalize(monthLabel(month, currentYear));

  if (!rows.length) return null;
  const tightest = rows.reduce((min, row) => (row.freeCents < min.freeCents ? row : min), rows[0]);
  const installmentsTotal = rows.reduce((total, row) => total + row.installmentsCents, 0);
  const lastInstallment = rows.findLast((row) => row.installmentsCents > 0);
  const hasShortfall = rows.some((row) => row.freeCents < 0);

  return (
    <Panel
      title="Próximos 12 meses"
      description="Quanto deve sobrar em cada mês, com as parcelas já assumidas em destaque."
      actions={
        <Segmented
          options={VIEW_OPTIONS}
          value={view}
          onChange={setView}
          size="sm"
        />
      }
      padded={false}
      className="overflow-hidden"
    >
      <dl className="grid gap-3 px-5 pt-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-foreground/[0.04] px-3 py-2.5">
          <dt className="text-xs font-medium text-muted-foreground">Mês mais apertado</dt>
          <dd className="mt-0.5 text-sm font-semibold">
            {label(tightest.month)} ·{" "}
            <Money
              cents={Math.abs(tightest.freeCents)}
              compact
              className={cn(tightest.freeCents < 0 && "text-negative")}
            />
            {tightest.freeCents < 0 ? " no vermelho" : " livres"}
          </dd>
        </div>
        <div className="rounded-2xl bg-foreground/[0.04] px-3 py-2.5">
          <dt className="text-xs font-medium text-muted-foreground">Parcelas pela frente</dt>
          <dd className="mt-0.5 text-sm font-semibold">
            {installmentsTotal > 0 ? (
              <>
                <Money
                  cents={installmentsTotal}
                  compact
                />
                {lastInstallment && lastInstallment.month !== rows[rows.length - 1].month
                  ? `, a última em ${monthName(lastInstallment.month)}`
                  : " nos próximos 12 meses"}
              </>
            ) : (
              "Nenhuma"
            )}
          </dd>
        </div>
      </dl>

      {view === "chart" ? (
        <>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 pt-4 text-xs text-muted-foreground">
            <LegendKey
              color={FREE_COLOR}
              label="Livre previsto"
            />
            <LegendKey
              color={INSTALLMENTS_COLOR}
              label="Parcelas"
            />
            {hasShortfall ? (
              <LegendKey
                color={SHORT_COLOR}
                label="Falta"
              />
            ) : null}
          </div>
          <div className="h-64 px-2 pt-2 pb-3 sm:px-3">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <BarChart
                data={rows}
                stackOffset="sign"
                margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
                style={{ cursor: "pointer" }}
                onClick={(state) => {
                  const month = state.activeLabel;
                  if (typeof month === "string" && isMonthKey(month)) router.push(`/month?month=${month}`);
                }}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="var(--border)"
                  strokeDasharray="3 5"
                />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  height={34}
                  tick={(props: { x: number | string; y: number | string; payload: { value: unknown } }) => (
                    <MonthTick
                      x={Number(props.x)}
                      y={Number(props.y)}
                      month={String(props.payload.value)}
                      selected={props.payload.value === selectedMonth}
                    />
                  )}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={64}
                  tickFormatter={(value: number) => formatCompactCents(value)}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                />
                <ReferenceLine
                  y={0}
                  stroke="var(--muted-foreground)"
                  strokeOpacity={0.35}
                />
                <Tooltip
                  cursor={{ fill: "var(--foreground)", opacity: 0.05, radius: 12 } as never}
                  content={({ active, payload }) => (
                    <ForecastTooltip
                      active={active}
                      row={payload?.[0]?.payload as ForecastRow | undefined}
                      label={label}
                    />
                  )}
                />
                <Bar
                  dataKey="freeCents"
                  stackId="month"
                  name="Livre previsto"
                  maxBarSize={30}
                  shape={FreeBar}
                />
                <Bar
                  dataKey="installmentsCents"
                  stackId="month"
                  name="Parcelas"
                  maxBarSize={30}
                  shape={InstallmentsBar}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <ul className="mt-3 divide-y divide-border border-t border-border">
          {rows.map((row) => (
            <li key={row.month}>
              <Link
                href={`/month?month=${row.month}`}
                className={cn(
                  "flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-foreground/[0.03]",
                  row.month === selectedMonth && "bg-muted/40",
                )}
              >
                <span className="w-32 shrink-0 truncate text-sm font-medium">{label(row.month)}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                  {row.installmentsCents > 0 ? (
                    <>
                      <Money
                        cents={row.installmentsCents}
                        compact
                      />{" "}
                      em parcelas
                    </>
                  ) : null}
                </span>
                <Money
                  cents={row.freeCents}
                  className={cn("shrink-0 text-sm font-semibold", row.freeCents < 0 && "text-negative")}
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function LegendKey({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden
        className="size-2.5 rounded-[3px]"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

function MonthTick({ x, y, month, selected }: { x: number; y: number; month: string; selected: boolean }) {
  const index = Number(month.slice(5, 7)) - 1;
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        dy={12}
        textAnchor="middle"
        fontSize={11}
        fontWeight={selected ? 700 : 500}
        fill={selected ? "var(--foreground)" : "var(--muted-foreground)"}
      >
        {MONTH_ABBR[index] ?? month}
      </text>
      {index === 0 ? (
        <text
          dy={25}
          textAnchor="middle"
          fontSize={10}
          fill="var(--muted-foreground)"
        >
          {month.slice(0, 4)}
        </text>
      ) : null}
    </g>
  );
}

/** Bordas de 2px na cor do fundo separam os pedaços empilhados; só a ponta da barra é arredondada. */
function FreeBar(props: BarShapeProps) {
  const row = props.payload as ForecastRow;
  if (!props.height) return <g />;
  const isEnd = row.freeCents < 0 || row.installmentsCents <= 0;
  return (
    <Rectangle
      x={props.x}
      y={props.y}
      width={props.width}
      height={props.height}
      radius={isEnd ? [8, 8, 4, 4] : 4}
      fill={row.freeCents < 0 ? SHORT_COLOR : FREE_COLOR}
      stroke="var(--card)"
      strokeWidth={2}
    />
  );
}

function InstallmentsBar(props: BarShapeProps) {
  if (!props.height) return <g />;
  return (
    <Rectangle
      x={props.x}
      y={props.y}
      width={props.width}
      height={props.height}
      radius={[8, 8, 4, 4]}
      fill={INSTALLMENTS_COLOR}
      stroke="var(--card)"
      strokeWidth={2}
    />
  );
}

type ForecastTooltipProps = {
  active?: boolean;
  row: ForecastRow | undefined;
  label: (month: MonthKey) => string;
};

function ForecastTooltip({ active, row, label }: ForecastTooltipProps) {
  if (!active || !row) return null;
  const short = row.freeCents < 0;
  return (
    <div className="min-w-44 rounded-md border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <p className="font-semibold">{label(row.month)}</p>
      <div className="mt-1.5 space-y-1">
        <TooltipLine
          color={short ? SHORT_COLOR : FREE_COLOR}
          label={short ? "Falta" : "Livre previsto"}
          cents={short ? -row.freeCents : row.freeCents}
        />
        <TooltipLine
          color={INSTALLMENTS_COLOR}
          label="Parcelas"
          cents={row.installmentsCents}
        />
      </div>
      <p className="mt-1.5 text-muted-foreground">Clique para abrir o mês</p>
    </div>
  );
}

function TooltipLine({ color, label, cents }: { color: string; label: string; cents: number }) {
  return (
    <p className="flex items-center gap-2">
      <span
        aria-hidden
        className="h-0.5 w-3 rounded-full"
        style={{ backgroundColor: color }}
      />
      <Money
        cents={cents}
        className="font-semibold"
      />
      <span className="text-muted-foreground">{label}</span>
    </p>
  );
}
