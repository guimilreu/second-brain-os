import { FinanceTabs } from "@/features/finance/components/FinanceTabs";
import { getFinanceOverview } from "@/features/finance/lib/data";
import { requireCurrentUser } from "@/lib/auth/current-user";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata = {
  title: "Financeiro",
};

export default async function FinancePage() {
  const user = await requireCurrentUser();
  const data = await getFinanceOverview(user.userId);

  const clientData = {
    ...data,
    forecast: {
      ...data.forecast,
      occurrences: data.forecast.occurrences.map((occurrence) => ({
        ...occurrence,
        date: occurrence.date.toISOString(),
      })),
      upcomingOccurrences: data.forecast.upcomingOccurrences.map((occurrence) => ({
        ...occurrence,
        date: occurrence.date.toISOString(),
      })),
      lateOccurrences: data.forecast.lateOccurrences.map((occurrence) => ({
        ...occurrence,
        date: occurrence.date.toISOString(),
      })),
    },
    futureProjection: data.futureProjection,
    projectionCheckpoints: data.projectionCheckpoints,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Financeiro"
        title="Dinheiro sob controle — presente, passado e futuro."
        description="Contas, entradas, saídas, recorrências, cofrinhos e metas em um só lugar."
      />
      <FinanceTabs overviewData={clientData} />
    </div>
  );
}
