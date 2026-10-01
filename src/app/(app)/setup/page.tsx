import { SetupDone } from "@/features/finance/components/setup/SetupDone";
import { SetupWizard } from "@/features/finance/components/setup/SetupWizard";
import { loadFinance } from "@/features/finance/server/data";

export const metadata = { title: "Configuração inicial" };

export default async function SetupPage() {
  const finance = await loadFinance();

  if (finance.accounts.length) return <SetupDone />;

  return (
    <SetupWizard
      categories={finance.categories.filter((category) => !category.archived && !category.systemKey)}
      today={finance.today}
      cdiAnnualPct={finance.settings.cdiAnnualPct}
    />
  );
}
