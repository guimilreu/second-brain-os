"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Briefcase,
  CalendarClock,
  ChevronDown,
  FlaskConical,
  Landmark,
  PieChart,
  Receipt,
  Tag,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { FinanceOverview } from "@/features/finance/components/FinanceOverview";
import { AccountsSection } from "@/features/finance/components/AccountsSection";
import { TransactionsSection } from "@/features/finance/components/TransactionsSection";
import { RecurringSection } from "@/features/finance/components/RecurringSection";
import { CreditCardsSection } from "@/features/finance/components/CreditCardsSection";
import { BudgetsSection } from "@/features/finance/components/BudgetsSection";
import { FinanceCalendar } from "@/features/finance/components/FinanceCalendar";
import { ScenariosSection } from "@/features/finance/components/ScenariosSection";
import { InvestmentsDebtsSection } from "@/features/finance/components/InvestmentsDebtsSection";
import { CategoriesSection } from "@/features/finance/components/CategoriesSection";
import { ObjectivesSection } from "@/features/finance/components/ObjectivesSection";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TabTransition } from "@/components/motion/TabTransition";
import { SubTabContent, SubTabNav } from "@/components/motion/SubTabNav";
import {
  useFinanceStore,
  type FinanceTab,
  type FinanceMaisSubTab,
  type FinanceMovimentosSubTab,
  type FinancePatrimonioSubTab,
} from "@/stores/finance-store";

type FinanceOverviewData = Parameters<typeof FinanceOverview>[0]["data"];

const PRIMARY_TABS: { id: FinanceTab; label: string; icon: typeof TrendingUp }[] = [
  { id: "hoje", label: "Hoje", icon: TrendingUp },
  { id: "movimentos", label: "Movimentos", icon: Receipt },
  { id: "patrimonio", label: "Patrimônio", icon: Wallet },
];

const MOVIMENTOS_SUB = [
  { id: "transactions", label: "Transações", icon: Receipt },
  { id: "recurring", label: "Recorrências", icon: CalendarClock },
  { id: "timeline", label: "Timeline", icon: Landmark },
] as const;

const PATRIMONIO_SUB = [
  { id: "accounts", label: "Contas", icon: Landmark },
  { id: "cards", label: "Cartões", icon: Wallet },
  { id: "portfolio", label: "Investimentos", icon: Briefcase },
] as const;

const MAIS_SUB = [
  { id: "objectives", label: "Objetivos", icon: Target },
  { id: "budgets", label: "Orçamentos", icon: PieChart },
  { id: "scenarios", label: "Cenários", icon: FlaskConical },
  { id: "categories", label: "Categorias", icon: Tag },
] as const;

type FinanceTabsProps = {
  overviewData: FinanceOverviewData;
};

export function FinanceTabs({ overviewData }: FinanceTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = useFinanceStore((s) => s.activeTab);
  const setActiveTab = useFinanceStore((s) => s.setActiveTab);
  const movimentosSubTab = useFinanceStore((s) => s.movimentosSubTab);
  const setMovimentosSubTab = useFinanceStore((s) => s.setMovimentosSubTab);
  const patrimonioSubTab = useFinanceStore((s) => s.patrimonioSubTab);
  const setPatrimonioSubTab = useFinanceStore((s) => s.setPatrimonioSubTab);
  const maisSubTab = useFinanceStore((s) => s.maisSubTab);
  const setMaisSubTab = useFinanceStore((s) => s.setMaisSubTab);

  useEffect(() => {
    const tab = searchParams.get("tab") as FinanceTab | null;
    if (tab && ["hoje", "movimentos", "patrimonio", "mais"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams, setActiveTab]);

  function handleTabChange(tab: FinanceTab) {
    setActiveTab(tab);
    router.replace(`/finance?tab=${tab}`, { scroll: false });
  }

  const calOccurrences =
    overviewData.forecast.occurrences?.map((o) => ({
      date: new Date(o.date),
      title: o.title,
      type: o.type,
    })) ?? [];

  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => handleTabChange(v as FinanceTab)}
      className="w-full min-w-0 gap-6"
    >
      <div className="min-w-0 w-full overflow-hidden rounded-2xl border border-border bg-card p-1 shadow-paper-sm">
        <TabsList className="flex h-auto min-h-0 w-full flex-wrap justify-start gap-1 border-0 bg-transparent p-0 shadow-none">
          {PRIMARY_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="h-10 shrink-0 grow basis-0 justify-center rounded-xl border-0 bg-transparent px-3 py-2 shadow-none [&::after]:hidden transition-colors duration-200 hover:bg-surface-soft data-active:bg-foreground data-active:text-background data-active:shadow-paper-sm"
              >
                <span className="flex items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="text-sm font-semibold">{tab.label}</span>
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </div>

      <TabsContent value="hoje" className="overflow-visible pt-0">
        <TabTransition motionKey="hoje">
          <FinanceOverview data={overviewData} />
        </TabTransition>
      </TabsContent>

      <TabsContent value="movimentos" className="overflow-visible pt-0">
        <TabTransition motionKey="movimentos">
          <div className="space-y-6">
            <SubTabNav
              tabs={[...MOVIMENTOS_SUB]}
              activeId={movimentosSubTab}
              onChange={(id) => setMovimentosSubTab(id as FinanceMovimentosSubTab)}
              layoutId="finance-movimentos-sub"
            />
            <SubTabContent activeId={movimentosSubTab} id="transactions">
              <TransactionsSection />
            </SubTabContent>
            <SubTabContent activeId={movimentosSubTab} id="recurring">
              <RecurringSection />
            </SubTabContent>
            <SubTabContent activeId={movimentosSubTab} id="timeline">
              <FinanceCalendar occurrences={calOccurrences} />
            </SubTabContent>
          </div>
        </TabTransition>
      </TabsContent>

      <TabsContent value="patrimonio" className="overflow-visible pt-0">
        <TabTransition motionKey="patrimonio">
          <div className="space-y-6">
            <SubTabNav
              tabs={[...PATRIMONIO_SUB]}
              activeId={patrimonioSubTab}
              onChange={(id) => setPatrimonioSubTab(id as FinancePatrimonioSubTab)}
              layoutId="finance-patrimonio-sub"
            />
            <SubTabContent activeId={patrimonioSubTab} id="accounts">
              <AccountsSection />
            </SubTabContent>
            <SubTabContent activeId={patrimonioSubTab} id="cards">
              <CreditCardsSection />
            </SubTabContent>
            <SubTabContent activeId={patrimonioSubTab} id="portfolio">
              <InvestmentsDebtsSection />
            </SubTabContent>
          </div>
        </TabTransition>
      </TabsContent>

      <details className="paper-note rounded-[1.75rem] group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 font-semibold transition-colors duration-200 hover:bg-surface-soft/50 [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2">
            <ChevronDown className="h-4 w-4 transition-transform duration-300 ease-out group-open:rotate-180" />
            Mais — orçamentos, objetivos e cenários
          </span>
        </summary>
        <div className="space-y-6 border-t border-border px-5 pb-5 pt-4">
          <SubTabNav
            tabs={[...MAIS_SUB]}
            activeId={activeTab === "mais" ? maisSubTab : ""}
            onChange={(id) => {
              handleTabChange("mais");
              setMaisSubTab(id as FinanceMaisSubTab);
            }}
            layoutId="finance-mais-sub"
          />
          {activeTab === "mais" ? (
            <>
              <SubTabContent activeId={maisSubTab} id="objectives">
                <ObjectivesSection />
              </SubTabContent>
              <SubTabContent activeId={maisSubTab} id="budgets">
                <BudgetsSection />
              </SubTabContent>
              <SubTabContent activeId={maisSubTab} id="scenarios">
                <ScenariosSection />
              </SubTabContent>
              <SubTabContent activeId={maisSubTab} id="categories">
                <CategoriesSection />
              </SubTabContent>
            </>
          ) : null}
        </div>
      </details>
    </Tabs>
  );
}
