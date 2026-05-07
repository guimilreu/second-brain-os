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
  CalendarClock,
  CreditCard,
  Loader2,
  PiggyBank,
  Plus,
  Target,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { addDays, differenceInCalendarDays, endOfMonth } from "date-fns";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MetricCard } from "@/components/ui/MetricCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProgressMeter } from "@/components/ui/ProgressMeter";
import { SectionCard } from "@/components/ui/SectionCard";
import { TransactionDialog } from "@/features/finance/components/dialogs/TransactionDialog";
import { formatCurrency, formatShortDate } from "@/lib/utils/format";

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
  };
};

export function FinanceOverview({ data }: FinanceOverviewProps) {
  const router = useRouter();
  const [txDialogOpen, setTxDialogOpen] = useState(false);
  const [confirmingKey, setConfirmingKey] = useState<string | null>(null);
  const accounts = data.accounts.map((a) => ({ id: String(a.id), name: String(a.name) }));
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
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Saldo total"
          value={formatCurrency(data.totalBalance)}
          detail={`${data.accounts.length} bancos/carteiras`}
          icon={Wallet}
          index={0}
        />
        <MetricCard
          title="Entrada prevista"
          value={formatCurrency(data.forecast.expectedIncome)}
          detail={`${formatCurrency(data.forecast.lateIncome)} em atraso`}
          trend="up"
          icon={CalendarClock}
          index={1}
        />
        <MetricCard
          title="Saída prevista"
          value={formatCurrency(data.forecast.expectedExpenses)}
          detail={`${formatCurrency(data.forecast.plannedExpenses)} planejados`}
          trend="down"
          icon={CreditCard}
          index={2}
        />
        <MetricCard
          title="Livre para gastar"
          value={formatCurrency(data.forecast.freeToSpend)}
          detail={`${formatCurrency(dailyBudget)} por dia até virar o mês`}
          trend={data.forecast.freeToSpend >= 0 ? "up" : "down"}
          icon={PiggyBank}
          index={3}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard
          eyebrow="Agora"
          title="Ritmo seguro"
          description="Quanto ainda dá para usar sem atropelar recorrências e cofrinhos."
          className="lg:col-span-2"
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl bg-default-50 p-4 dark:bg-default-50/20">
              <p className="text-sm text-muted-foreground">Por dia</p>
              <p className="mt-2 text-2xl font-semibold">{formatCurrency(dailyBudget)}</p>
            </div>
            <div className="rounded-3xl bg-default-50 p-4 dark:bg-default-50/20">
              <p className="text-sm text-muted-foreground">Por semana</p>
              <p className="mt-2 text-2xl font-semibold">{formatCurrency(weeklyBudget)}</p>
            </div>
            <div className="rounded-3xl bg-default-50 p-4 dark:bg-default-50/20">
              <p className="text-sm text-muted-foreground">Para guardar</p>
              <p className="mt-2 text-2xl font-semibold">
                {formatCurrency(data.forecast.allocationAmount)}
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Atenção"
          title="Atrasos"
          icon={AlertTriangle}
          description={
            data.forecast.lateOccurrences.length
              ? "Entradas/saídas previstas que já passaram."
              : "Nenhuma recorrência atrasada pelo cálculo atual."
          }
        >
          {data.forecast.lateOccurrences.length ? (
            <div className="space-y-3">
              {data.forecast.lateOccurrences.slice(0, 3).map((occurrence) => (
                <div
                  key={`${occurrence.ruleId}-${occurrence.date}`}
                  className="flex flex-col gap-3 rounded-2xl bg-danger/10 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{occurrence.title}</p>
                    <p className="text-xs text-danger">{formatShortDate(occurrence.date)}</p>
                  </div>
                  <p className="text-sm font-semibold text-danger">
                    {occurrence.type === "income" ? "+" : "−"}
                    {formatCurrency(occurrence.amount)}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={confirmingKey === `${occurrence.ruleId}-${occurrence.date}`}
                      onClick={() => void postponeOccurrence(occurrence)}
                      className="rounded-full text-danger hover:bg-danger/10 hover:text-danger"
                    >
                      {confirmingKey === `${occurrence.ruleId}-${occurrence.date}` ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : null}
                      Adiar 3d
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={confirmingKey === `${occurrence.ruleId}-${occurrence.date}`}
                      onClick={() => void confirmOccurrence(occurrence)}
                      className="rounded-full text-success hover:bg-success/10 hover:text-success"
                    >
                      {confirmingKey === `${occurrence.ruleId}-${occurrence.date}` ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : null}
                      Confirmar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Badge className="rounded-full bg-success/10 text-success border-transparent">
              Fluxo em dia
            </Badge>
          )}
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <SectionCard
          eyebrow="Previsão do mês"
          title="Fluxo projetado"
          action={
            <Button
              onClick={() => setTxDialogOpen(true)}
              className="rounded-full"
            >
              <Plus className="h-4 w-4" />
              Novo lançamento
            </Button>
          }
        >
          <div className="h-80">
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

        <SectionCard eyebrow="Contas e bancos" title="Saldos">
          <div className="space-y-3">
            {data.accounts.length ? (
              data.accounts.map((account) => (
                <div
                  key={String(account.id)}
                  className="flex items-center justify-between rounded-2xl bg-default-50 p-4 dark:bg-default-50/20"
                >
                  <div>
                    <p className="font-medium">{String(account.name)}</p>
                    <p className="text-sm text-muted-foreground">{String(account.institution)}</p>
                  </div>
                  <p className="font-semibold">{formatCurrency(Number(account.balance))}</p>
                </div>
              ))
            ) : (
              <EmptyState
                icon={Wallet}
                title="Nenhum saldo ainda"
                description="Cadastre seus bancos e carteiras para transformar o dashboard em fonte real de decisão."
              />
            )}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <SectionCard
          eyebrow="Categorias"
          title="Onde o dinheiro está indo"
          className="xl:col-span-2"
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(value) => `R$${value}`} tickLine={false} axisLine={false} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="total" fill="#8b7cff" radius={[12, 12, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard eyebrow="Metas e cofrinhos" title="Progresso" icon={Target}>
          <div className="space-y-5">
            {[...data.savingsPots, ...data.goals].slice(0, 5).map((item) => {
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
            })}
            {!data.savingsPots.length && !data.goals.length ? (
              <EmptyState
                icon={PiggyBank}
                title="Sem metas ainda"
                description="Crie cofrinhos para distribuir automaticamente parte das entradas futuras."
              />
            ) : null}
            {data.forecast.allocationPlan.length ? (
              <div className="rounded-3xl bg-default-50 p-4 dark:bg-default-50/20">
                <p className="text-sm font-semibold">Alocação prevista</p>
                <div className="mt-3 space-y-3">
                  {data.forecast.allocationPlan.map((allocation) => (
                    <div key={allocation.potId}>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="flex min-w-0 items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: allocation.color }}
                          />
                          <span className="truncate">{allocation.name}</span>
                        </span>
                        <span className="font-medium">{formatCurrency(allocation.amount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        eyebrow="Histórico"
        title="Tendência dos últimos 6 meses"
        description="Use isso para comparar o mês atual com o padrão real de entradas e saídas."
      >
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.monthlyHistory}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(value) => `R$${value}`} tickLine={false} axisLine={false} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Bar dataKey="income" name="Entradas" fill="#22c55e" radius={[10, 10, 0, 0]} />
              <Bar dataKey="expenses" name="Saídas" fill="#ef4444" radius={[10, 10, 0, 0]} />
              <Bar dataKey="net" name="Resultado" fill="#8b7cff" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Futuro"
        title="Previsibilidade dos próximos 12 meses"
        description="Uma visão simples do que tende a sobrar depois de recorrências e alocações."
      >
        <div className="mb-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-3xl bg-default-50 p-4 dark:bg-default-50/20">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">3 meses</p>
            <p className="mt-2 text-xl font-semibold">
              {formatCurrency(data.projectionCheckpoints.threeMonths)}
            </p>
          </div>
          <div className="rounded-3xl bg-default-50 p-4 dark:bg-default-50/20">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">6 meses</p>
            <p className="mt-2 text-xl font-semibold">
              {formatCurrency(data.projectionCheckpoints.sixMonths)}
            </p>
          </div>
          <div className="rounded-3xl bg-default-50 p-4 dark:bg-default-50/20">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">12 meses</p>
            <p className="mt-2 text-xl font-semibold">
              {formatCurrency(data.projectionCheckpoints.twelveMonths)}
            </p>
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.futureProjection}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(value) => `R$${value}`} tickLine={false} axisLine={false} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Area
                type="monotone"
                dataKey="freeToSpend"
                name="Livre"
                stroke="#8b7cff"
                fill="#8b7cff"
                fillOpacity={0.18}
              />
              <Area
                type="monotone"
                dataKey="allocationAmount"
                name="Cofrinhos"
                stroke="#22c55e"
                fill="#22c55e"
                fillOpacity={0.12}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <SectionCard eyebrow="Agenda financeira" title="Próximos movimentos do dinheiro">
        {data.forecast.upcomingOccurrences.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.forecast.upcomingOccurrences.map((occurrence) => (
              <div
                key={`${occurrence.ruleId}-${occurrence.date}`}
                className="rounded-3xl border border-border bg-default-50 p-4 dark:border-default-200 dark:bg-default-50/20"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{occurrence.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatShortDate(occurrence.date)} · {occurrence.category}
                    </p>
                  </div>
                  <Badge
                    className={
                      occurrence.type === "income"
                        ? "rounded-full bg-success/10 text-success border-transparent"
                        : "rounded-full bg-danger/10 text-danger border-transparent"
                    }
                  >
                    {occurrence.type === "income" ? "Entrada" : "Saída"}
                  </Badge>
                </div>
                <p
                  className={
                    occurrence.type === "income"
                      ? "mt-4 text-xl font-semibold text-success"
                      : "mt-4 text-xl font-semibold text-danger"
                  }
                >
                  {occurrence.type === "income" ? "+" : "−"}
                  {formatCurrency(occurrence.amount)}
                </p>
                {occurrence.allocationAmount > 0 ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatCurrency(occurrence.allocationAmount)} reservado para cofrinho.
                  </p>
                ) : null}
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={confirmingKey === `${occurrence.ruleId}-${occurrence.date}`}
                  onClick={() => void confirmOccurrence(occurrence)}
                  className={
                    occurrence.type === "income"
                      ? "mt-4 w-full rounded-full hover:bg-success/10 hover:text-success"
                      : "mt-4 w-full rounded-full hover:bg-danger/10 hover:text-danger"
                  }
                >
                  {confirmingKey === `${occurrence.ruleId}-${occurrence.date}` ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : null}
                  Confirmar ocorrência
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={CalendarClock}
            title="Nenhum movimento futuro"
            description="Cadastre recorrências para enxergar o mês antes dele acontecer."
          />
        )}
      </SectionCard>

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
