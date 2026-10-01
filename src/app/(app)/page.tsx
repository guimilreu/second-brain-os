import { redirect } from "next/navigation";
import { monthOf } from "@/features/finance/domain/dates";
import { buildInsights } from "@/features/finance/domain/insights";
import { computeMonthPlan } from "@/features/finance/domain/plan";
import { AttentionPanel } from "@/features/finance/components/today/AttentionPanel";
import { CardsPanel } from "@/features/finance/components/today/CardsPanel";
import { RecentPanel } from "@/features/finance/components/today/RecentPanel";
import { TodayHero } from "@/features/finance/components/today/TodayHero";
import { UpcomingPanel } from "@/features/finance/components/today/UpcomingPanel";
import {
  buildCardOverviews,
  buildUpcoming,
  greetingFor,
  longDateLabel,
  recentTransactions,
} from "@/features/finance/components/today/todayView";
import { loadFinance } from "@/features/finance/server/data";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata = { title: "Hoje" };

const UPCOMING_DAYS = 14;

export default async function TodayPage() {
  const finance = await loadFinance();
  if (finance.accounts.length === 0) redirect("/setup");

  const month = monthOf(finance.today);
  const plan = computeMonthPlan(finance, month);
  // O estouro do mês já aparece no herói; em "Atenção" ficam os avisos que pedem uma ação.
  const insights = buildInsights(finance, { cdiAnnualPct: finance.settings.cdiAnnualPct }).filter(
    (insight) => insight.id !== `month-negative-${month}`,
  );
  const cards = buildCardOverviews(finance);
  const greeting = greetingFor(finance.settings.timezone);
  const firstName = finance.userName.trim().split(/\s+/)[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title={firstName ? `${greeting}, ${firstName}` : greeting}
        description={longDateLabel(finance.today)}
      />

      {/* No mobile as colunas viram uma pilha só, na ordem de importância (order-*). */}
      <div className="flex flex-col gap-6 xl:grid xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] xl:items-start">
        <div className="contents xl:flex xl:flex-col xl:gap-6">
          <div className="order-1">
            <TodayHero
              plan={plan}
              today={finance.today}
            />
          </div>
          <div className="order-2">
            <AttentionPanel
              insights={insights}
              accounts={finance.accounts}
              recurrings={finance.recurrings}
              today={finance.today}
            />
          </div>
          <div className="order-5">
            <RecentPanel rows={recentTransactions(finance, 8)} />
          </div>
        </div>
        <div className="contents xl:flex xl:flex-col xl:gap-6">
          {cards.length ? (
            <div className="order-3">
              <CardsPanel
                cards={cards}
                today={finance.today}
              />
            </div>
          ) : null}
          <div className="order-4">
            <UpcomingPanel
              days={buildUpcoming(finance, UPCOMING_DAYS)}
              horizonDays={UPCOMING_DAYS}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
