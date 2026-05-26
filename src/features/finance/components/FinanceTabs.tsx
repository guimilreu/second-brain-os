"use client";

import {
  Briefcase,
  CalendarClock,
  CalendarDays,
  CreditCard,
  FlaskConical,
  Landmark,
  PieChart,
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
import { CreditCardsSection } from "@/features/finance/components/CreditCardsSection";
import { BudgetsSection } from "@/features/finance/components/BudgetsSection";
import { FinanceCalendar } from "@/features/finance/components/FinanceCalendar";
import { ScenariosSection } from "@/features/finance/components/ScenariosSection";
import { InvestmentsDebtsSection } from "@/features/finance/components/InvestmentsDebtsSection";
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
  { id: "cards", label: "Cartões", icon: CreditCard },
  { id: "transactions", label: "Transações", icon: Receipt },
  { id: "recurring", label: "Recorrências", icon: CalendarClock },
  { id: "savings", label: "Cofrinhos", icon: PiggyBank },
  { id: "budgets", label: "Orçamentos", icon: PieChart },
  { id: "scenarios", label: "Cenários", icon: FlaskConical },
  { id: "portfolio", label: "Investimentos", icon: Briefcase },
  { id: "calendar", label: "Calendário", icon: CalendarDays },
  { id: "goals", label: "Metas", icon: Target },
];

type FinanceTabsProps = {
  overviewData: FinanceOverviewData;
};

export function FinanceTabs({ overviewData }: FinanceTabsProps) {
  const calOccurrences =
    overviewData.forecast.occurrences?.map((o) => ({
      date: new Date(o.date),
      title: o.title,
      type: o.type,
    })) ?? [];

  return (
    <Tabs defaultValue="overview" className="w-full min-w-0 gap-6">
      <div className="min-w-0 w-full overflow-hidden rounded-2xl border border-border bg-card p-1 text-muted-foreground shadow-paper-sm">
        <TabsList className="scrollbar-none flex h-auto min-h-0 w-full min-w-0 flex-nowrap justify-start gap-1 overflow-x-auto overflow-y-hidden border-0 bg-transparent p-0 shadow-none">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="group h-10 shrink-0 grow-0 basis-auto justify-center rounded-xl border-0 bg-transparent px-3 py-2 text-center shadow-none [&::after]:hidden transition-colors duration-200 hover:bg-surface-soft hover:text-foreground data-active:bg-foreground data-active:text-background data-active:shadow-paper-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate text-sm font-semibold">{tab.label}</span>
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </div>

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
      <TabsContent value="cards" className="overflow-visible pt-0">
        <TabTransition>
          <CreditCardsSection />
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
      <TabsContent value="budgets" className="overflow-visible pt-0">
        <TabTransition>
          <BudgetsSection />
        </TabTransition>
      </TabsContent>
      <TabsContent value="scenarios" className="overflow-visible pt-0">
        <TabTransition>
          <ScenariosSection />
        </TabTransition>
      </TabsContent>
      <TabsContent value="portfolio" className="overflow-visible pt-0">
        <TabTransition>
          <InvestmentsDebtsSection />
        </TabTransition>
      </TabsContent>
      <TabsContent value="calendar" className="overflow-visible pt-0">
        <TabTransition>
          <FinanceCalendar occurrences={calOccurrences} />
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
