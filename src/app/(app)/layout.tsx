import { AppShell } from "@/components/layout/AppShell";
import { loadFinance } from "@/features/finance/server/data";
import { buildShellData } from "@/features/finance/server/shell";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const finance = await loadFinance();

  return (
    <AppShell userName={finance.userName} shell={buildShellData(finance)}>
      {children}
    </AppShell>
  );
}
