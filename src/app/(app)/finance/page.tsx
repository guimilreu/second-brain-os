import { Suspense } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Reveal } from "@/components/motion/Reveal";
import { FinanceTabs } from "@/features/finance/components/FinanceTabs";
import { getFinanceOverview } from "@/features/finance/lib/data";
import { requireCurrentUser } from "@/lib/auth/current-user";
import AppLoading from "../loading";

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
        eyebrow="Dinheiro"
        title="Seu dinheiro — hoje, movimentos e patrimônio."
        description="Três zonas simples. Toda a profundidade quando você precisar."
      />
      <Reveal delay={0.03}>
        <Suspense fallback={<AppLoading />}>
          <FinanceTabs overviewData={clientData} />
        </Suspense>
      </Reveal>
    </div>
  );
}
