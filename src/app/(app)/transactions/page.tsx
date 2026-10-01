import { PageHeader } from "@/components/ui/PageHeader";
import { LaunchButton, TransactionsView } from "@/features/finance/components/transactions/TransactionsView";
import {
  describeInstallmentGroup,
  filterTransactions,
  parseTransactionFilters,
  summarizeTransactions,
} from "@/features/finance/components/transactions/transactionFilters";
import { loadFinance } from "@/features/finance/server/data";

export const metadata = { title: "Lançamentos" };

type TransactionsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TransactionsPage({ searchParams }: TransactionsPageProps) {
  const [params, finance] = await Promise.all([searchParams, loadFinance()]);
  const filters = parseTransactionFilters(params, finance);
  const matched = filterTransactions(finance.transactions, filters);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lançamentos"
        description="Tudo que entrou e saiu, mês a mês. Toque num lançamento para editar."
        actions={<LaunchButton type={filters.type} />}
      />
      <TransactionsView
        filters={filters}
        transactions={matched.slice(0, filters.limit)}
        total={matched.length}
        summary={summarizeTransactions(matched)}
        group={filters.group ? describeInstallmentGroup(matched) : null}
        accounts={finance.accounts}
        categories={finance.categories}
        today={finance.today}
      />
    </div>
  );
}
