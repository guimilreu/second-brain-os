import { differenceInCalendarDays, endOfMonth, format, isSameDay } from "date-fns";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Reveal } from "@/components/motion/Reveal";
import { getFinanceOverview } from "@/features/finance/lib/data";
import { getTasksOverview } from "@/features/tasks/lib/data";
import { getWishlistOverview } from "@/features/wishlist/lib/data";
import { formatFinanceAlertMessage } from "@/features/today/lib/format";
import {
  PurchasesWidget,
  SprintBar,
  TodayInbox,
} from "@/features/today/components/TodayPanels";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { formatCurrency } from "@/lib/utils/format";

export const metadata = { title: "Hoje — Second Brain OS" };

export default async function DashboardPage() {
  const user = await requireCurrentUser();
  const monthKey = format(new Date(), "yyyy-MM");
  const today = new Date();

  const [finance, tasks, wishlist] = await Promise.all([
    getFinanceOverview(user.userId),
    getTasksOverview(user.userId),
    getWishlistOverview(user.userId),
  ]);

  const doneTasks = tasks.tasks.filter((t) => t.status === "done").length;
  const totalTasks = tasks.tasks.length;
  const sprintProgress = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const daysLeft = Math.max(differenceInCalendarDays(endOfMonth(today), today) + 1, 1);
  const dailyBudget = finance.forecast.freeToSpend / daysLeft;

  const planned =
    wishlist.totalsByMonth[monthKey] ?? 0;
  const cap =
    wishlist.monthBudgets.find((b) => b.monthKey === monthKey)?.capAmount ?? 0;
  const freeHint =
    wishlist.financeHints.find((h) => h.monthKey === monthKey)?.freeToSpend ??
    finance.forecast.freeToSpend;

  const readyItems = wishlist.items
    .filter(
      (i) =>
        i.status === "ready" &&
        i.lane === "planned" &&
        String(i.plannedMonthKey) === monthKey,
    )
    .slice(0, 2)
    .map((i) => ({
      id: String(i.id),
      title: String(i.title),
      estimatedPrice: Number(i.estimatedPrice ?? 0),
    }));

  const inboxItems: Parameters<typeof TodayInbox>[0]["items"] = [];

  for (const occ of finance.forecast.lateOccurrences.slice(0, 2)) {
    inboxItems.push({
      kind: "recurring-late",
      id: `late-${occ.ruleId}-${occ.date}`,
      title: occ.title,
      date: occ.date instanceof Date ? occ.date.toISOString() : String(occ.date),
      ruleId: occ.ruleId,
      amount: occ.amount,
      type: occ.type as "income" | "expense",
      category: occ.category,
    });
  }

  for (const inv of finance.invoiceSummaries ?? []) {
    const daysUntilDue = Math.ceil(
      (new Date(inv.dueDate).getTime() - today.getTime()) / 86400000,
    );
    if (daysUntilDue <= 5 && daysUntilDue >= 0 && inv.remaining > 0) {
      inboxItems.push({
        kind: "invoice-due",
        id: `invoice-${inv.accountId}`,
        accountName: inv.accountName,
        remaining: inv.remaining,
        dueDate: inv.dueDate,
      });
      break;
    }
  }

  for (const alert of finance.financeAlerts.filter((a) => !a.acknowledgedAt).slice(0, 2)) {
    inboxItems.push({
      kind: "alert",
      id: String(alert.id),
      message: formatFinanceAlertMessage(
        String(alert.kind),
        (alert.payload as Record<string, unknown>) ?? {},
      ),
      href: "/finance",
    });
  }

  const urgentToday = tasks.tasks.filter(
    (t) =>
      t.status !== "done" &&
      (t.priority === "critical" || t.priority === "high") &&
      (!t.plannedFor || isSameDay(new Date(String(t.plannedFor)), today)),
  );
  for (const task of urgentToday.slice(0, 2)) {
    inboxItems.push({
      kind: "task",
      id: String(task.id),
      title: String(task.title),
      priority: String(task.priority),
    });
  }

  if (planned > freeHint) {
    inboxItems.push({
      kind: "wishlist-over",
      message: `Lista de compras (${formatCurrency(planned)}) excede o livre (${formatCurrency(freeHint)}).`,
    });
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={`Olá, ${user.name.split(" ")[0]}`}
        title="Hoje."
        description="Uma decisão, uma inbox, ação rápida."
      />

      <Reveal>
        <section className="paper-sheet rounded-[2.25rem] p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Decisão do dia
          </p>
          <h2 className="font-heading mt-2 text-3xl font-bold tracking-[-0.04em] text-paper-ink md:text-4xl">
            {formatCurrency(dailyBudget)} por dia até virar o mês.
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Livre para gastar: {formatCurrency(finance.forecast.freeToSpend)} ·{" "}
            <Link href="/finance" className="text-brand hover:underline">
              Ver dinheiro
            </Link>
          </p>
        </section>
      </Reveal>

      <Reveal delay={0.03}>
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="paper-note rounded-[1.75rem] p-6">
            <h2 className="font-heading mb-4 text-xl font-bold tracking-[-0.03em]">Inbox</h2>
            <TodayInbox items={inboxItems} />
          </section>
          <PurchasesWidget
            monthKey={monthKey}
            planned={planned}
            cap={cap}
            freeToSpend={freeHint}
            readyItems={readyItems}
          />
        </div>
      </Reveal>

      <Reveal delay={0.05}>
        <SprintBar done={doneTasks} total={totalTasks} progress={sprintProgress} />
      </Reveal>
    </div>
  );
}
