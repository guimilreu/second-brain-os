import { differenceInCalendarDays, endOfMonth, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowDownLeft, ArrowUpRight, Landmark, ListTodo, Sparkles } from "lucide-react";
import Link from "next/link";
import { MetricCard } from "@/components/ui/MetricCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Reveal } from "@/components/motion/Reveal";
import { getFinanceOverview } from "@/features/finance/lib/data";
import { getTasksOverview } from "@/features/tasks/lib/data";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export const metadata = { title: "Dashboard — Second Brain OS" };

export default async function DashboardPage() {
  const user = await requireCurrentUser();
  const [finance, tasks] = await Promise.all([
    getFinanceOverview(user.userId),
    getTasksOverview(user.userId),
  ]);

  const doneTasks = tasks.tasks.filter((t) => t.status === "done").length;
  const totalTasks = tasks.tasks.length;
  const sprintProgress = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const daysLeft = Math.max(differenceInCalendarDays(endOfMonth(new Date()), new Date()) + 1, 1);
  const dailyBudget = finance.forecast.freeToSpend / daysLeft;
  const upcomingMoney = finance.forecast.upcomingOccurrences.slice(0, 4);
  const lateMoney = finance.forecast.lateOccurrences.slice(0, 3);
  const averageMonthlyNet =
    finance.monthlyHistory.length > 0
      ? finance.monthlyHistory.reduce((total, month) => total + month.net, 0) /
        finance.monthlyHistory.length
      : 0;

  const recentTransactions = finance.transactions.slice(0, 5);

  const topGoals = [...finance.savingsPots, ...finance.goals]
    .filter((g) => Number(g.targetAmount) > 0)
    .slice(0, 3);

  const urgentTasks = tasks.tasks
    .filter((t) => t.status !== "done" && (t.priority === "critical" || t.priority === "high"))
    .slice(0, 3);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={`Bom dia, ${user.name.split(" ")[0]}`}
        title="Seu cockpit pessoal."
        description="Finanças, tarefas e objetivos — tudo num só lugar."
      />

      {/* KPIs */}
      <Reveal>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Saldo total"
          value={formatCurrency(finance.totalBalance)}
          detail={`${finance.accounts.length} conta${finance.accounts.length !== 1 ? "s" : ""}`}
          icon="landmark"
          trend="neutral"
          index={0}
        />
        <MetricCard
          title="Livre para gastar"
          value={formatCurrency(finance.forecast.freeToSpend)}
          detail="Este mês, após recorrências"
          trend={finance.forecast.freeToSpend >= 0 ? "up" : "down"}
          icon="trending-up"
          index={1}
        />
        <MetricCard
          title="Sprint atual"
          value={`${doneTasks}/${totalTasks} tarefas`}
          detail={`${sprintProgress}% concluído`}
          trend={sprintProgress >= 50 ? "up" : "neutral"}
          icon="check-circle"
          index={2}
        />
        <MetricCard
          title="Metas em andamento"
          value={`${topGoals.length} ativa${topGoals.length !== 1 ? "s" : ""}`}
          detail="Cofrinhos + objetivos"
          icon="target"
          trend="neutral"
          index={3}
        />
      </div>
      </Reveal>

      {/* Main content grid */}
      <Reveal delay={0.04}>
        <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="glass-surface rounded-3xl p-6 xl:col-span-2">
          <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr] lg:items-center">
            <div>
              <p className="text-sm text-muted-foreground">Decisão de hoje</p>
              <h2 className="mt-1 text-3xl font-semibold tracking-tight">
                {formatCurrency(dailyBudget)} por dia até virar o mês.
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Depois de entradas previstas, saídas recorrentes e{" "}
                {formatCurrency(finance.forecast.allocationAmount)} separados para cofrinhos.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-3xl bg-surface-soft p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Livre</p>
                <p className="mt-2 text-xl font-semibold">
                  {formatCurrency(finance.forecast.freeToSpend)}
                </p>
              </div>
              <div className="rounded-3xl bg-surface-soft p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Atrasado</p>
                <p className="mt-2 text-xl font-semibold text-warning">
                  {formatCurrency(finance.forecast.lateIncome + finance.forecast.lateExpenses)}
                </p>
              </div>
              <div className="rounded-3xl bg-surface-soft p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Média 6m</p>
                <p
                  className={cn(
                    "mt-2 text-xl font-semibold",
                    averageMonthlyNet >= 0 ? "text-success" : "text-danger",
                  )}
                >
                  {formatCurrency(averageMonthlyNet)}
                </p>
              </div>
              <div className="rounded-3xl bg-surface-soft p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Livre 12m</p>
                <p
                  className={cn(
                    "mt-2 text-xl font-semibold",
                    finance.projectionCheckpoints.twelveMonths >= 0
                      ? "text-success"
                      : "text-danger",
                  )}
                >
                  {formatCurrency(finance.projectionCheckpoints.twelveMonths)}
                </p>
              </div>
              <div className="rounded-3xl bg-surface-soft p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Sprint</p>
                <p className="mt-2 text-xl font-semibold">{sprintProgress}%</p>
              </div>
            </div>
          </div>
        </section>

        {/* Recent transactions */}
        <section className="glass-surface rounded-3xl p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Financeiro</p>
              <h2 className="text-xl font-semibold">Últimas transações</h2>
            </div>
            <Link
              href="/finance"
              className="rounded-2xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition hover:border-brand hover:text-brand"
            >
              Ver tudo
            </Link>
          </div>
          {recentTransactions.length === 0 ? (
            <div className="rounded-2xl bg-surface-soft p-6 text-center">
              <p className="text-sm text-muted-foreground">Nenhuma transação ainda.</p>
              <Link href="/finance" className="mt-2 text-sm text-brand hover:underline">
                Registrar primeira transação →
              </Link>
            </div>
          ) : (
            <div className="space-y-1">
              {recentTransactions.map((t) => (
                <div
                  key={String(t.id)}
                  className="flex items-center gap-4 rounded-2xl px-4 py-3 transition hover:bg-surface-soft"
                >
                  <div
                    className={cn(
                      "rounded-xl p-2",
                      t.type === "income" ? "bg-emerald-500/10" : "bg-red-500/10",
                    )}
                  >
                    {t.type === "income" ? (
                      <ArrowUpRight className="h-4 w-4 text-success" />
                    ) : (
                      <ArrowDownLeft className="h-4 w-4 text-danger" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{String(t.title)}</p>
                    <p className="text-xs text-muted-foreground">
                      {String(t.category)} ·{" "}
                      {format(new Date(String(t.occurredAt)), "dd MMM", { locale: ptBR })}
                    </p>
                  </div>
                  <p
                    className={cn(
                      "text-sm font-semibold tabular-nums",
                      t.type === "income" ? "text-success" : "text-danger",
                    )}
                  >
                    {t.type === "income" ? "+" : "−"}
                    {formatCurrency(Number(t.amount))}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Tasks + Goals */}
        <div className="space-y-6">
          <section className="glass-surface rounded-3xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Agenda financeira</p>
                <h2 className="text-xl font-semibold">Próximos movimentos</h2>
              </div>
              <Link
                href="/finance"
                className="rounded-2xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition hover:border-brand hover:text-brand"
              >
                Ver mês
              </Link>
            </div>
            {lateMoney.length ? (
              <div className="mb-3 rounded-2xl bg-warning/10 p-3 text-sm text-warning">
                {lateMoney.length} recorrência{lateMoney.length !== 1 ? "s" : ""} precisa{lateMoney.length === 1 ? "" : "m"} de atenção.
              </div>
            ) : null}
            {upcomingMoney.length ? (
              <div className="space-y-2">
                {upcomingMoney.map((event) => (
                  <div
                    key={`${event.ruleId}-${event.date.toISOString()}`}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-surface-soft px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(event.date, "dd MMM", { locale: ptBR })} · {event.category}
                      </p>
                    </div>
                    <p
                      className={cn(
                        "text-sm font-semibold tabular-nums",
                        event.type === "income" ? "text-success" : "text-danger",
                      )}
                    >
                      {event.type === "income" ? "+" : "−"}
                      {formatCurrency(event.amount)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl bg-surface-soft p-4 text-sm text-muted-foreground">
                Cadastre recorrências para o cockpit antecipar o mês.
              </p>
            )}
          </section>

          {/* Urgent tasks */}
          <section className="glass-surface rounded-3xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tarefas</p>
                <h2 className="text-xl font-semibold">Prioridade alta</h2>
              </div>
              <Link
                href="/tasks"
                className="rounded-2xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition hover:border-brand hover:text-brand"
              >
                Ver sprint
              </Link>
            </div>
            {urgentTasks.length === 0 ? (
              <div className="rounded-2xl bg-surface-soft p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  {totalTasks === 0
                    ? "Nenhuma tarefa esta semana."
                    : "Nenhuma tarefa urgente. Ótimo!"}
                </p>
                <Link href="/tasks" className="mt-1 text-sm text-brand hover:underline">
                  {totalTasks === 0 ? "Planejar sprint →" : "Ver todas as tarefas →"}
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {urgentTasks.map((task) => {
                  const projectName =
                    task.projectId && typeof task.projectId === "object"
                      ? String((task.projectId as Record<string, unknown>).name ?? "")
                      : null;
                  return (
                    <div
                      key={String(task.id)}
                      className="flex items-start gap-3 rounded-2xl bg-surface-soft px-4 py-3"
                    >
                      <div
                        className={cn(
                          "mt-0.5 h-2 w-2 shrink-0 rounded-full",
                          task.priority === "critical" ? "bg-danger" : "bg-warning",
                        )}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{String(task.title)}</p>
                        {projectName ? (
                          <p className="text-xs text-muted-foreground">{projectName}</p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Goals progress */}
          {topGoals.length > 0 ? (
            <section className="glass-surface rounded-3xl p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Objetivos</p>
                  <h2 className="text-xl font-semibold">Progresso</h2>
                </div>
                <Link
                  href="/finance"
                  className="rounded-2xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition hover:border-brand hover:text-brand"
                >
                  Gerenciar
                </Link>
              </div>
              <div className="space-y-4">
                {topGoals.map((item) => {
                  const current = Number(item.currentAmount);
                  const target = Number(item.targetAmount);
                  const progress = target > 0 ? Math.min((current / target) * 100, 100) : 0;
                  return (
                    <div key={String(item.id)}>
                      <div className="mb-1.5 flex justify-between text-sm">
                        <span className="font-medium">{String(item.name)}</span>
                        <span className="text-muted-foreground">{Math.round(progress)}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-surface-soft">
                        <div
                          className="h-full rounded-full bg-brand transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}
        </div>
      </div>
      </Reveal>

      {/* Module cards */}
      <Reveal delay={0.07}>
      <div className="grid gap-5 lg:grid-cols-2">
        {[
          {
            href: "/finance",
            icon: Landmark,
            title: "Financeiro",
            description: `${finance.accounts.length} conta${finance.accounts.length !== 1 ? "s" : ""} · ${formatCurrency(finance.totalBalance)} em saldo`,
            cta: "Abrir financeiro",
          },
          {
            href: "/tasks",
            icon: ListTodo,
            title: "Tarefas",
            description: `${totalTasks} tarefa${totalTasks !== 1 ? "s" : ""} esta semana · ${sprintProgress}% concluído`,
            cta: "Ver sprint",
          },
        ].map((area) => {
          const Icon = area.icon;
          return (
            <Link
              key={area.href}
              href={area.href}
              className="glass-surface group rounded-3xl p-6 transition-[transform,border-color] duration-300 hover:-translate-y-0.5 hover:border-brand/40"
            >
              <div className="flex items-start justify-between gap-6">
                <div className="rounded-3xl bg-brand-soft p-4 text-brand">
                  <Icon className="h-7 w-7" />
                </div>
                <span className="rounded-full bg-surface-soft px-3 py-1 text-sm text-muted-foreground transition group-hover:bg-brand group-hover:text-primary-foreground">
                  {area.cta}
                </span>
              </div>
              <h2 className="mt-6 text-2xl font-semibold">{area.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{area.description}</p>
            </Link>
          );
        })}
      </div>
      </Reveal>

      <Reveal delay={0.09}>
      <section className="glass-surface rounded-3xl p-6">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-brand-soft p-3 text-brand">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold">Um OS que cresce com você</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Notas, hábitos, calendário, CRM pessoal e health tracking estão a caminho.
              A arquitetura já está pronta para expandir.
            </p>
          </div>
        </div>
      </section>
      </Reveal>
    </div>
  );
}
