"use client";

import {
  CalendarClock,
  Landmark,
  PiggyBank,
  Receipt,
  Target,
  TrendingUp,
} from "lucide-react";
import { FinanceOverview } from "@/features/finance/components/FinanceOverview";
import { AccountsSection } from "@/features/finance/components/AccountsSection";
import { TransactionsSection } from "@/features/finance/components/TransactionsSection";
import { RecurringSection } from "@/features/finance/components/RecurringSection";
import { SavingsPotsSection } from "@/features/finance/components/SavingsPotsSection";
import { GoalsSection } from "@/features/finance/components/GoalsSection";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TabTransition } from "@/components/motion/TabTransition";

type FinanceOverviewData = Parameters<typeof FinanceOverview>[0]["data"];

type TabDef = {
  id: string;
  label: string;
  icon: typeof TrendingUp;
};

const TABS: TabDef[] = [
  { id: "overview", label: "Visão geral", icon: TrendingUp },
  { id: "accounts", label: "Contas", icon: Landmark },
  { id: "transactions", label: "Transações", icon: Receipt },
  { id: "recurring", label: "Recorrências", icon: CalendarClock },
  { id: "savings", label: "Cofrinhos", icon: PiggyBank },
  { id: "goals", label: "Metas", icon: Target },
];

type FinanceTabsProps = {
  overviewData: FinanceOverviewData;
};

export function FinanceTabs({ overviewData }: FinanceTabsProps) {
  return (
    <Tabs defaultValue="overview" className="w-full gap-4">
      <TabsList className="h-auto w-full flex-wrap gap-1 rounded-2xl border border-border bg-default-100/70 p-1 shadow-inner backdrop-blur-sm dark:border-default-200 dark:bg-default-50/40">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="relative flex-1 overflow-hidden rounded-xl transition-transform duration-200 active:scale-[0.97] data-active:bg-background data-active:text-primary data-active:shadow-sm"
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          );
        })}
      </TabsList>

      <TabsContent value="overview" className="overflow-visible pt-0">
        <TabTransition>
          <FinanceOverview data={overviewData} />
        </TabTransition>
      </TabsContent>
      <TabsContent value="accounts" className="overflow-visible pt-0">
        <TabTransition>
          <AccountsSection />
        </TabTransition>
      </TabsContent>
      <TabsContent value="transactions" className="overflow-visible pt-0">
        <TabTransition>
          <TransactionsSection />
        </TabTransition>
      </TabsContent>
      <TabsContent value="recurring" className="overflow-visible pt-0">
        <TabTransition>
          <RecurringSection />
        </TabTransition>
      </TabsContent>
      <TabsContent value="savings" className="overflow-visible pt-0">
        <TabTransition>
          <SavingsPotsSection />
        </TabTransition>
      </TabsContent>
      <TabsContent value="goals" className="overflow-visible pt-0">
        <TabTransition>
          <GoalsSection />
        </TabTransition>
      </TabsContent>
    </Tabs>
  );
}
