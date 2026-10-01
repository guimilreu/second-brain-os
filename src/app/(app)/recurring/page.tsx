import { monthOf } from "@/features/finance/domain/dates";
import { RecurringScreen } from "@/features/finance/components/recurring/RecurringScreen";
import { buildRecurringItems, recurringTotals } from "@/features/finance/components/recurring/recurringView";
import { loadFinance } from "@/features/finance/server/data";

export const metadata = { title: "Fixas" };

export default async function RecurringPage() {
  const finance = await loadFinance();

  return (
    <RecurringScreen
      items={buildRecurringItems(finance)}
      totals={recurringTotals(finance.recurrings, monthOf(finance.today))}
      accounts={finance.accounts}
      categories={finance.categories}
      today={finance.today}
    />
  );
}
