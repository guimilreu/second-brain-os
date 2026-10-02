import { redirect } from "next/navigation";
import { cardUsedLimitCents, summarizeInvoices } from "@/features/finance/domain/card";
import { addMonths, monthOf } from "@/features/finance/domain/dates";
import { buildInsights } from "@/features/finance/domain/insights";
import { computeMonthPlan } from "@/features/finance/domain/plan";
import { AttentionPanel } from "@/features/finance/components/today/AttentionPanel";
import { CardSpotlight } from "@/features/finance/components/today/CardSpotlight";
import { RecentPanel } from "@/features/finance/components/today/RecentPanel";
import {
  BubblesTile,
  CashflowTile,
  HeatTile,
  HeroTile,
  MoneyTile,
  SpendDonutTile,
  WeekTile,
} from "@/features/finance/components/today/TodayTiles";
import { UpcomingPanel } from "@/features/finance/components/today/UpcomingPanel";
import {
  cashflow,
  categorySlices,
  moneySnapshot,
  monthHeat,
  paceSeries,
  spendByCategory,
  upcomingInvoices,
  weekSpend,
} from "@/features/finance/components/today/todayCharts";
import {
  buildCardOverviews,
  buildUpcoming,
  greetingFor,
  longDateLabel,
  recentTransactions,
} from "@/features/finance/components/today/todayView";
import { loadFinance } from "@/features/finance/server/data";

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
  const cards = buildCardOverviews(finance).map((overview) => ({
    overview,
    upcoming: upcomingInvoices(finance, overview.card.id),
    usedCents: cardUsedLimitCents(summarizeInvoices(overview.card, finance.transactions, finance.today)),
  }));
  const greeting = greetingFor(finance.settings.timezone);
  const firstName = finance.userName.trim().split(/\s+/)[0];
  const monthSlices = categorySlices(
    plan.categories.map((line) => ({ categoryId: line.categoryId, cents: line.spentCents })),
    finance.categories,
  );
  const quarterSlices = categorySlices(
    spendByCategory(finance.transactions, addMonths(month, -2), month),
    finance.categories,
    8,
  );

  return (
    <div className="space-y-6">
      <header className="animate-rise">
        <p className="text-sm text-muted-foreground first-letter:uppercase">{longDateLabel(finance.today)}</p>
        <h1 className="mt-1 text-[2rem] leading-tight font-semibold tracking-tight md:text-5xl">
          {firstName ? `${greeting}, ${firstName}` : greeting}
        </h1>
      </header>

      {/* No celular a ordem é a do DOM (prioridade); no desktop, xl:order monta o mosaico. */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
        <HeroTile plan={plan} today={finance.today} pace={paceSeries(finance, plan)} className="md:col-span-2 xl:order-1 xl:col-span-8" />
        <div className="md:col-span-2 xl:order-3 xl:col-span-5">
          <AttentionPanel insights={insights} accounts={finance.accounts} recurrings={finance.recurrings} today={finance.today} />
        </div>
        <MoneyTile snapshot={moneySnapshot(finance)} className="xl:order-2 xl:col-span-4" />
        {cards.length ? (
          <CardSpotlight items={cards} today={finance.today} className="xl:order-4 xl:col-span-7" />
        ) : null}
        <WeekTile week={weekSpend(finance)} className="xl:order-6 xl:col-span-4" />
        <SpendDonutTile slices={monthSlices} month={month} className="xl:order-5 xl:col-span-4" />
        <HeatTile heat={monthHeat(finance, month)} className="xl:order-7 xl:col-span-4" />
        <BubblesTile slices={quarterSlices} className="xl:order-8 xl:col-span-5" />
        <CashflowTile months={cashflow(finance)} className="md:col-span-2 xl:order-9 xl:col-span-7" />
        <div className="md:col-span-2 xl:order-10 xl:col-span-7">
          <RecentPanel rows={recentTransactions(finance, 8)} />
        </div>
        <div className="md:col-span-2 xl:order-11 xl:col-span-5">
          <UpcomingPanel days={buildUpcoming(finance, UPCOMING_DAYS)} horizonDays={UPCOMING_DAYS} />
        </div>
      </div>
    </div>
  );
}
