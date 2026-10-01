import { AccountsView } from "@/features/finance/components/accounts/AccountsView";
import { buildAccountsOverview } from "@/features/finance/components/accounts/overview";
import { isMonthKey } from "@/features/finance/domain/dates";
import { loadFinance } from "@/features/finance/server/data";

export const metadata = { title: "Contas e cofres" };

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [{ reconcile, yields }, finance] = await Promise.all([searchParams, loadFinance()]);

  return (
    <AccountsView
      overview={buildAccountsOverview(finance, finance.settings.cdiAnnualPct)}
      startReconciling={reconcile === "1"}
      startYields={typeof yields === "string" && isMonthKey(yields) ? yields : null}
    />
  );
}
