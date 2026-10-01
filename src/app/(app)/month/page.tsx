import { isMonthKey, monthOf } from "@/features/finance/domain/dates";
import { monthLabel } from "@/features/finance/domain/labels";
import { categoryAverages, computeMonthPlan, computeMonthPlans } from "@/features/finance/domain/plan";
import { CategoryBreakdown } from "@/features/finance/components/month/CategoryBreakdown";
import { ForecastChart } from "@/features/finance/components/month/ForecastChart";
import { MonthCascade } from "@/features/finance/components/month/MonthCascade";
import { MonthHero } from "@/features/finance/components/month/MonthHero";
import { MonthNav } from "@/features/finance/components/month/MonthNav";
import { buildCategoryRows, buildMonthDetails } from "@/features/finance/components/month/monthView";
import { loadFinance } from "@/features/finance/server/data";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata = { title: "Mês" };

function parseMonth(raw: string | string[] | undefined, fallback: string) {
  if (typeof raw !== "string" || !isMonthKey(raw)) return fallback;
  const number = Number(raw.slice(5));
  return number >= 1 && number <= 12 ? raw : fallback;
}

export default async function MonthPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const finance = await loadFinance();
  const currentMonth = monthOf(finance.today);
  const currentYear = Number(currentMonth.slice(0, 4));
  const month = parseMonth((await searchParams).month, currentMonth);

  const plan = computeMonthPlan(finance, month);
  const details = buildMonthDetails(finance, plan);
  const categoryRows = buildCategoryRows(plan, finance.categories, categoryAverages(finance, month));
  const forecast = computeMonthPlans(finance, currentMonth, 12).map((item) => ({
    month: item.month,
    freeCents: item.freeCents,
    installmentsCents: item.installmentsCents,
  }));

  const title = monthLabel(month, currentYear);
  const phase = plan.isPast ? "past" : plan.isCurrent ? "current" : "future";
  const description =
    phase === "past"
      ? "Mês fechado: como terminou."
      : phase === "current"
        ? plan.daysLeft === 1
          ? "Mês atual · último dia."
          : `Mês atual · faltam ${plan.daysLeft} dias.`
        : "Previsão com o que já está marcado.";

  return (
    <div className="space-y-6">
      <PageHeader
        title={title.charAt(0).toUpperCase() + title.slice(1)}
        description={description}
        actions={
          <MonthNav
            month={month}
            currentMonth={currentMonth}
          />
        }
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <MonthHero plan={plan} />
          <MonthCascade
            plan={plan}
            details={details}
            accounts={finance.accounts}
            today={finance.today}
          />
        </div>
        <CategoryBreakdown
          rows={categoryRows}
          month={month}
          phase={phase}
        />
      </div>

      <ForecastChart
        rows={forecast}
        selectedMonth={month}
        currentYear={currentYear}
      />
    </div>
  );
}
