"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import axios from "axios";
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  Loader2,
  Plus,
  Target,
} from "lucide-react";
import { useState } from "react";
import { addDays, differenceInCalendarDays, endOfMonth } from "date-fns";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MetricCard } from "@/components/ui/MetricCard";
import { ProgressMeter } from "@/components/ui/ProgressMeter";
import { SectionCard } from "@/components/ui/SectionCard";
import { TransactionDialog } from "@/features/finance/components/dialogs/TransactionDialog";
import { formatCurrency, formatShortDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

type FinanceAlertRow = {
  id: string;
  kind: string;
  payload?: Record<string, unknown>;
  triggeredAt?: string;
};

type NetWorthPoint = {
  dateKey: string;
  netWorth: number;
  assets: number;
  liabilities: number;
};

type InvoiceSummary = {
  accountId: string;
  accountName: string;
  invoiceId: string;
  dueDate: string;
  remaining: number;
  status: string;
};

function safeShortDate(raw: unknown): string {
  if (raw == null) return "";
  if (raw instanceof Date) {
    return formatShortDate(raw);
  }
  const s = String(raw);
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : formatShortDate(d);
}

function alertMessage(row: FinanceAlertRow): string {
  const p = row.payload ?? {};
  switch (row.kind) {
    case "low-balance":
      return `Saldo abaixo do mínimo em ${String(p.name ?? "conta")}.`;
    case "invoice-due":
      return `Fatura de cartão vence em breve — ${formatCurrency(Number(p.remaining ?? 0))} em aberto.`;
    case "budget-exceeded": {
      const planned = Number(p.planned);
      const pct = planned > 0 ? Math.round((Number(p.spent) / planned) * 100) : 0;
      return `Orçamento de ${String(p.category)} perto do limite (${pct}%).`;
    }
    case "goal-milestone":
      return `Cofrinho "${String(p.name)}" quase atingiu a meta.`;
    case "recurring-late":
      return `Recorrência atrasada: ${String(p.title)} (${safeShortDate(p.date)}).`;
    case "unusual-spending":
      return `Gasto incomum em ${String(p.category)} (${formatCurrency(Number(p.amount))} vs média ${formatCurrency(Number(p.avg))}).`;
    default:
      return `Alerta: ${row.kind}`;
  }
}

type ForecastOccurrence = {
  ruleId: string;
  title: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  date: string;
  allocationAmount: number;
  savingsPotId?: string;
  status: "expected" | "late";
};

type FinanceOverviewProps = {
  data: {
    accounts: Record<string, unknown>[];
    transactions: Record<string, unknown>[];
    recurringRules: Record<string, unknown>[];
    savingsPots: Record<string, unknown>[];
    goals: Record<string, unknown>[];
    forecast: {
      expectedIncome: number;
      expectedExpenses: number;
      projectedNet: number;
      freeToSpend: number;
      allocationAmount: number;
      plannedIncome: number;
      plannedExpenses: number;
      lateIncome: number;
      lateExpenses: number;
      allocationsByPot: Record<string, number>;
      allocationPlan: {
        potId: string;
        name: string;
        color: string;
        amount: number;
      }[];
      occurrences: ForecastOccurrence[];
      upcomingOccurrences: ForecastOccurrence[];
      lateOccurrences: ForecastOccurrence[];
    };
    monthlyHistory: {
      month: string;
      income: number;
      expenses: number;
      net: number;
    }[];
    futureProjection: {
      month: string;
      expectedIncome: number;
      expectedExpenses: number;
      allocationAmount: number;
      projectedNet: number;
      freeToSpend: number;
    }[];
    projectionCheckpoints: {
      threeMonths: number;
      sixMonths: number;
      twelveMonths: number;
    };
    totalBalance: number;
    financeAlerts?: FinanceAlertRow[];
    netWorthSeries?: NetWorthPoint[];
    invoiceSummaries?: InvoiceSummary[];
  };
};

export function FinanceOverview({ data }: FinanceOverviewProps) {
  const router = useRouter();
  const [txDialogOpen, setTxDialogOpen] = useState(false);
  const [confirmingKey, setConfirmingKey] = useState<string | null>(null);
  const [dismissingAlertId, setDismissingAlertId] = useState<string | null>(null);
  const accounts = data.accounts.map((a) => ({ id: String(a.id), name: String(a.name) }));
  const financeAlerts = data.financeAlerts ?? [];
  const netWorthSeries = data.netWorthSeries ?? [];
  const invoiceSummaries = data.invoiceSummaries ?? [];
  const today = new Date();
  const daysLeft = Math.max(differenceInCalendarDays(endOfMonth(today), today) + 1, 1);
  const dailyBudget = data.forecast.freeToSpend / daysLeft;
  const weeklyBudget = data.forecast.freeToSpend / Math.max(daysLeft / 7, 1);
  const chartData = data.forecast.occurrences.map((occurrence) => ({
    name: formatShortDate(occurrence.date),
    entrada: occurrence.type === "income" ? occurrence.amount : 0,
    saida: occurrence.type === "expense" ? occurrence.amount : 0,
  }));

  const categoryData = Object.values(
    data.transactions.reduce<Record<string, { name: string; total: number }>>(
      (acc, transaction) => {
        if (transaction.type !== "expense") {
          return acc;
        }

        const category = String(transaction.category);
        acc[category] ??= { name: category, total: 0 };
        acc[category].total += Number(transaction.amount);
        return acc;
      },
      {},
    ),
  ).slice(0, 6);
  const openInvoiceTotal = invoiceSummaries.reduce(
    (total, invoice) => total + Math.max(0, invoice.remaining),
    0,
  );
  const nextInvoice = invoiceSummaries
    .slice()
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
  const latestNetWorth = netWorthSeries.at(-1);
  const previousNetWorth = netWorthSeries.at(-2);
  const netWorthDelta =
    latestNetWorth && previousNetWorth
      ? latestNetWorth.netWorth - previousNetWorth.netWorth
      : 0;
  const hasForecastChart = chartData.some((row) => row.entrada > 0 || row.saida > 0);
  const hasCategoryData = categoryData.some((row) => row.total > 0);
  const hasMonthlyHistory = data.monthlyHistory.some(
    (row) => row.income !== 0 || row.expenses !== 0 || row.net !== 0,
  );
  const hasFutureProjection = data.futureProjection.some(
    (row) =>
      row.expectedIncome !== 0 ||
      row.expectedExpenses !== 0 ||
      row.allocationAmount !== 0 ||
      row.freeToSpend !== 0,
  );
  const progressItems = [...data.savingsPots, ...data.goals].slice(0, 5);

  async function dismissAlert(alertId: string) {
    setDismissingAlertId(alertId);
    try {
      await axios.post(`/api/finance/alerts/${alertId}/ack`);
      toast.success("Alerta dispensado.");
      router.refresh();
    } catch {
      toast.error("Não foi possível dispensar o alerta.");
    } finally {
      setDismissingAlertId(null);
    }
  }

  async function confirmOccurrence(occurrence: ForecastOccurrence) {
    const key = `${occurrence.ruleId}-${occurrence.date}`;
    setConfirmingKey(key);

    try {
      await axios.post("/api/finance/transactions", {
        title: occurrence.title,
        amount: occurrence.amount,
        type: occurrence.type,
        category: occurrence.category,
        status: "confirmed",
        occurredAt: new Date().toISOString(),
        recurringRuleId: occurrence.ruleId,
        recurringOccurrenceDate: occurrence.date,
        notes: `Confirmado a partir da previsão de ${formatShortDate(occurrence.date)}.`,
      });

      if (occurrence.savingsPotId && occurrence.allocationAmount > 0) {
        const pot = data.savingsPots.find(
          (item) => String(item.id) === occurrence.savingsPotId,
        );

        if (pot) {
          await axios.patch(`/api/finance/savings-pots/${occurrence.savingsPotId}`, {
            currentAmount: Number(pot.currentAmount) + occurrence.allocationAmount,
          });
        }
      }

      toast.success("Previsão confirmada e registrada.");
      router.refresh();
    } catch {
      toast.error("Não foi possível confirmar a previsão.");
    } finally {
      setConfirmingKey(null);
    }
  }

  async function postponeOccurrence(occurrence: ForecastOccurrence) {
    const key = `${occurrence.ruleId}-${occurrence.date}`;
    setConfirmingKey(key);

    try {
      const postponedDate = addDays(new Date(), 3);

      await axios.post("/api/finance/transactions", {
        title: occurrence.title,
        amount: occurrence.amount,
        type: occurrence.type,
        category: occurrence.category,
        status: "planned",
        occurredAt: postponedDate.toISOString(),
        recurringRuleId: occurrence.ruleId,
        recurringOccurrenceDate: occurrence.date,
        notes: `Adiado a partir da previsão de ${formatShortDate(occurrence.date)}.`,
      });

      toast.success("Previsão adiada e mantida no planejamento.");
      router.refresh();
    } catch {
      toast.error("Não foi possível adiar a previsão.");
    } finally {
      setConfirmingKey(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
        <section className="rounded-3xl border border-border bg-card p-6 shadow-paper-sm md:p-7">
          <div className="flex h-full flex-col justify-between gap-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Leitura do mês
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                  {formatCurrency(data.forecast.freeToSpend)} livres para decidir.
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {formatCurrency(dailyBudget)} por dia ou {formatCurrency(weeklyBudget)} por semana,
                  já considerando recorrências, atrasos e alocações para cofrinhos.
                </p>
              </div>
              <Button
                onClick={() => setTxDialogOpen(true)}
                className="w-full rounded-2xl lg:w-auto"
              >
                <Plus className="h-4 w-4" />
                Novo lançamento
              </Button>
            </div>
            <div className="grid gap-3 border-t border-border pt-5 sm:grid-cols-3">
              {[
                {
                  label: "Entradas previstas",
                  value: formatCurrency(data.forecast.expectedIncome),
                  tone: "text-success",
                },
                {
                  label: "Saídas previstas",
                  value: formatCurrency(data.forecast.expectedExpenses),
                  tone: "text-danger",
                },
                {
                  label: "Reserva planejada",
                  value: formatCurrency(data.forecast.allocationAmount),
                  tone: "text-foreground",
                },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {item.label}
                  </p>
                  <p className={cn("mt-2 text-xl font-semibold", item.tone)}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="rounded-3xl border border-border bg-card p-5 shadow-paper-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl border border-border bg-background p-2.5">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Painel rápido
              </p>
              <h3 className="mt-1 text-xl font-semibold tracking-tight">O que pede atenção</h3>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {financeAlerts.length ? (
              financeAlerts.slice(0, 3).map((row) => (
                <div
                  key={row.id}
                  className="rounded-2xl border border-border bg-background px-3 py-3 text-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 leading-snug">{alertMessage(row)}</p>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 shrink-0 rounded-full px-2"
                      disabled={dismissingAlertId === row.id}
                      onClick={() => void dismissAlert(row.id)}
                    >
                      {dismissingAlertId === row.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        "Ok"
                      )}
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-success/20 bg-success/10 px-3 py-3 text-sm text-success">
                Nenhum alerta financeiro aberto.
              </div>
            )}

            {nextInvoice ? (
              <div className="rounded-2xl border border-border bg-background px-3 py-3 text-sm">
                <p className="font-medium">Próxima fatura</p>
                <p className="mt-1 text-muted-foreground">
                  {nextInvoice.accountName} · {formatCurrency(nextInvoice.remaining)} vence{" "}
                  {formatShortDate(nextInvoice.dueDate)}
                </p>
              </div>
            ) : null}

            {latestNetWorth ? (
              <div className="rounded-2xl border border-border bg-background px-3 py-3 text-sm">
                <p className="font-medium">Patrimônio líquido</p>
                <p className="mt-1 text-muted-foreground">
                  {formatCurrency(latestNetWorth.netWorth)}
                  {previousNetWorth ? (
                    <span
                      className={cn(
                        "ml-2 font-medium",
                        netWorthDelta >= 0 ? "text-success" : "text-danger",
                      )}
                    >
                      {netWorthDelta >= 0 ? "+" : ""}
                      {formatCurrency(netWorthDelta)}
                    </span>
                  ) : null}
                </p>
              </div>
            ) : null}
          </div>
        </aside>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Saldo total"
          value={formatCurrency(data.totalBalance)}
          detail={`${data.accounts.length} bancos/carteiras`}
          icon="wallet"
          index={0}
        />
        <MetricCard
          title="Faturas abertas"
          value={formatCurrency(openInvoiceTotal)}
          detail={nextInvoice ? `Próxima: ${formatShortDate(nextInvoice.dueDate)}` : "Nada em aberto"}
          trend={openInvoiceTotal > 0 ? "down" : "neutral"}
          icon="credit-card"
          index={1}
        />
        <MetricCard
          title="Alertas ativos"
          value={String(financeAlerts.length)}
          detail={
            data.forecast.lateOccurrences.length
              ? `${data.forecast.lateOccurrences.length} recorrência(s) atrasada(s)`
              : "Sem atrasos calculados"
          }
          trend={financeAlerts.length ? "down" : "neutral"}
          icon="calendar-clock"
          index={2}
        />
        <MetricCard
          title="Livre para gastar"
          value={formatCurrency(data.forecast.freeToSpend)}
          detail={`${formatCurrency(dailyBudget)} por dia até virar o mês`}
          trend={data.forecast.freeToSpend >= 0 ? "up" : "down"}
          icon="piggy-bank"
          index={3}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard
          eyebrow="Agora"
          title="Ritmo seguro"
          description="Orçamento diário e semanal sem ocupar espaço demais."
        >
          <div className="grid gap-3">
            {[
              ["Por dia", dailyBudget],
              ["Por semana", weeklyBudget],
              ["Para guardar", data.forecast.allocationAmount],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="flex items-center justify-between rounded-2xl border border-border bg-background px-4 py-3"
              >
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="font-semibold">{formatCurrency(Number(value))}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Contas"
          title={data.accounts.length ? "Saldos" : "Comece por aqui"}
          className="xl:col-span-2"
        >
          {data.accounts.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {data.accounts.slice(0, 4).map((account) => (
                <div
                  key={String(account.id)}
                  className="flex items-center justify-between rounded-2xl border border-border bg-background p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{String(account.name)}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {String(account.institution)}
                    </p>
                  </div>
                  <p className="shrink-0 font-semibold">
                    {formatCurrency(Number(account.balance))}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              {[
                ["1", "Cadastre suas contas"],
                ["2", "Crie recorrências"],
                ["3", "Registre transações"],
              ].map(([step, label]) => (
                <div key={step} className="rounded-2xl border border-border bg-background p-4">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand">
                    {step}
                  </span>
                  <p className="mt-3 text-sm font-medium">{label}</p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {(hasForecastChart || data.forecast.upcomingOccurrences.length > 0 || data.forecast.lateOccurrences.length > 0) ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
          {hasForecastChart ? (
            <SectionCard
              eyebrow="Previsão"
              title="Fluxo do mês"
              description="Entradas e saídas previstas em ordem de ocorrência."
            >
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="entrada" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="saida" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={(value) => `R$${value}`} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Area type="monotone" dataKey="entrada" stroke="#22c55e" fill="url(#entrada)" />
                    <Area type="monotone" dataKey="saida" stroke="#ef4444" fill="url(#saida)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          ) : null}

          <SectionCard
            eyebrow="Agenda"
            title={data.forecast.lateOccurrences.length ? "Atrasos" : "Próximos movimentos"}
            icon={data.forecast.lateOccurrences.length ? AlertTriangle : CalendarClock}
            className={!hasForecastChart ? "xl:col-span-3" : undefined}
          >
            {data.forecast.lateOccurrences.length ? (
              <div className="space-y-3">
                {data.forecast.lateOccurrences.slice(0, 3).map((occurrence) => (
                  <div
                    key={`${occurrence.ruleId}-${occurrence.date}`}
                    className="rounded-2xl border border-danger/20 bg-danger/10 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{occurrence.title}</p>
                        <p className="text-xs text-danger">{formatShortDate(occurrence.date)}</p>
                      </div>
                      <p className="text-sm font-semibold text-danger">
                        {occurrence.type === "income" ? "+" : "−"}
                        {formatCurrency(occurrence.amount)}
                      </p>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={confirmingKey === `${occurrence.ruleId}-${occurrence.date}`}
                        onClick={() => void postponeOccurrence(occurrence)}
                        className="rounded-full text-danger hover:bg-danger/10 hover:text-danger"
                      >
                        Adiar 3d
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={confirmingKey === `${occurrence.ruleId}-${occurrence.date}`}
                        onClick={() => void confirmOccurrence(occurrence)}
                        className="rounded-full text-success hover:bg-success/10 hover:text-success"
                      >
                        Confirmar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : data.forecast.upcomingOccurrences.length ? (
              <div className="space-y-3">
                {data.forecast.upcomingOccurrences.slice(0, 4).map((occurrence) => (
                  <div
                    key={`${occurrence.ruleId}-${occurrence.date}`}
                    className="rounded-2xl border border-border bg-background p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{occurrence.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatShortDate(occurrence.date)} · {occurrence.category}
                        </p>
                      </div>
                      <Badge
                        className={
                          occurrence.type === "income"
                            ? "rounded-full border-transparent bg-success/10 text-success"
                            : "rounded-full border-transparent bg-danger/10 text-danger"
                        }
                      >
                        {occurrence.type === "income" ? "+" : "−"}
                        {formatCurrency(occurrence.amount)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Crie recorrências para preencher a agenda e liberar a previsão do mês.
              </p>
            )}
          </SectionCard>
        </div>
      ) : null}

      {(hasCategoryData || progressItems.length > 0 || data.forecast.allocationPlan.length > 0) ? (
        <div className="grid gap-4 xl:grid-cols-3">
          {hasCategoryData ? (
            <SectionCard
              eyebrow="Categorias"
              title="Onde o dinheiro está indo"
              className="xl:col-span-2"
            >
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={(value) => `R$${value}`} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Bar dataKey="total" fill="#ffc100" radius={[12, 12, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          ) : null}

          <SectionCard
            eyebrow="Objetivos"
            title="Metas e cofrinhos"
            icon={Target}
            className={!hasCategoryData ? "xl:col-span-3" : undefined}
          >
            <div className="space-y-5">
              {progressItems.length ? (
                progressItems.map((item) => {
                  const current = Number(item.currentAmount);
                  const target = Number(item.targetAmount);
                  const progress = target > 0 ? Math.min((current / target) * 100, 100) : 0;

                  return (
                    <div key={String(item.id)}>
                      <div className="mb-2 flex justify-between text-sm">
                        <span className="font-medium">{String(item.name)}</span>
                        <span className="text-muted-foreground">{Math.round(progress)}%</span>
                      </div>
                      <ProgressMeter value={progress} />
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">
                  Crie cofrinhos ou metas para acompanhar objetivos sem sair do dashboard.
                </p>
              )}
              {data.forecast.allocationPlan.length ? (
                <div className="rounded-3xl border border-border bg-background p-4">
                  <p className="text-sm font-semibold">Alocação prevista</p>
                  <div className="mt-3 space-y-3">
                    {data.forecast.allocationPlan.map((allocation) => (
                      <div
                        key={allocation.potId}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: allocation.color }}
                          />
                          <span className="truncate">{allocation.name}</span>
                        </span>
                        <span className="font-medium">{formatCurrency(allocation.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </SectionCard>
        </div>
      ) : null}

      {(hasMonthlyHistory || hasFutureProjection) ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {hasMonthlyHistory ? (
            <SectionCard
              eyebrow="Histórico"
              title="Últimos 6 meses"
              description="Compare o mês atual com o padrão real de entradas e saídas."
            >
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.monthlyHistory}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={(value) => `R$${value}`} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Bar dataKey="income" name="Entradas" fill="#22c55e" radius={[10, 10, 0, 0]} />
                    <Bar dataKey="expenses" name="Saídas" fill="#ef4444" radius={[10, 10, 0, 0]} />
                    <Bar dataKey="net" name="Resultado" fill="#ffc100" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          ) : null}

          {hasFutureProjection ? (
            <SectionCard
              eyebrow="Futuro"
              title="Próximos 12 meses"
              description="Tendência do livre para gastar e das alocações."
            >
              <div className="mb-4 grid gap-2 sm:grid-cols-3">
                {[
                  ["3 meses", data.projectionCheckpoints.threeMonths],
                  ["6 meses", data.projectionCheckpoints.sixMonths],
                  ["12 meses", data.projectionCheckpoints.twelveMonths],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-2xl border border-border bg-background p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
                    <p className="mt-1 font-semibold">{formatCurrency(Number(value))}</p>
                  </div>
                ))}
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.futureProjection}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={(value) => `R$${value}`} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Area type="monotone" dataKey="freeToSpend" name="Livre" stroke="#ffc100" fill="#ffc100" fillOpacity={0.18} />
                    <Area type="monotone" dataKey="allocationAmount" name="Cofrinhos" stroke="#22c55e" fill="#22c55e" fillOpacity={0.12} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          ) : null}
        </div>
      ) : null}

      <TransactionDialog
        open={txDialogOpen}
        onClose={() => setTxDialogOpen(false)}
        accounts={accounts}
        onSaved={() => {
          setTxDialogOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}
