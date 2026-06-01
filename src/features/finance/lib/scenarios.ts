import { addMonths, format, startOfDay } from "date-fns";
import {
  calculateFinanceForecast,
  type ForecastRecurringRule,
  type ForecastTransaction,
} from "@/features/finance/lib/forecast";

export type ScenarioAssumption = { kind: string; payload?: Record<string, unknown> };

export type ScenarioPlanShape = {
  assumptions: ScenarioAssumption[];
  horizonMonths: number;
};

export type ScenarioSimulationPoint = {
  monthKey: string;
  baselineFreeToSpend: number;
  scenarioFreeToSpend: number;
};

function pickRecurringDeltas(assumptions: ScenarioAssumption[]): ForecastRecurringRule[] {
  const rules: ForecastRecurringRule[] = [];
  for (const a of assumptions) {
    if (a.kind === "add-expense" && a.payload && typeof a.payload.amount === "number") {
      rules.push({
        id: `scenario-recurring-${rules.length}`,
        title: String(a.payload.title ?? "Cenário"),
        amount: Number(a.payload.amount),
        type: "expense",
        category: String(a.payload.category ?? "Outro"),
        cadence: "monthly",
        dayOfMonth: 1,
        startsAt: new Date(2000, 0, 1),
        isActive: true,
      });
    }
  }
  return rules;
}

function buildOneTimeTransactions(
  assumptions: ScenarioAssumption[],
  monthDate: Date,
  monthIndex: number,
): ForecastTransaction[] {
  const txs: ForecastTransaction[] = [];
  for (const a of assumptions) {
    if (
      (a.kind === "add-one-time-expense" || a.kind === "add-wishlist-month") &&
      a.payload &&
      typeof a.payload.amount === "number"
    ) {
      const offset = Number(a.payload.monthOffset ?? 0);
      if (offset !== monthIndex) continue;
      txs.push({
        amount: Number(a.payload.amount),
        type: "expense",
        status: "planned",
        occurredAt: startOfDay(
          new Date(monthDate.getFullYear(), monthDate.getMonth(), 15),
        ),
        category: String(a.payload.category ?? "Outro"),
      });
    }
    if (a.kind === "delay-purchase" && a.payload && typeof a.payload.amount === "number") {
      const fromOffset = Number(a.payload.fromMonthOffset ?? 0);
      const toOffset = Number(a.payload.toMonthOffset ?? 1);
      const amount = Number(a.payload.amount);
      if (monthIndex === fromOffset) {
        txs.push({
          amount,
          type: "income",
          status: "planned",
          occurredAt: startOfDay(
            new Date(monthDate.getFullYear(), monthDate.getMonth(), 10),
          ),
          category: String(a.payload.category ?? "Compras"),
        });
      }
      if (monthIndex === toOffset) {
        txs.push({
          amount,
          type: "expense",
          status: "planned",
          occurredAt: startOfDay(
            new Date(monthDate.getFullYear(), monthDate.getMonth(), 15),
          ),
          category: String(a.payload.category ?? "Compras"),
        });
      }
    }
  }
  return txs;
}

export function simulateScenario(
  baselineRules: ForecastRecurringRule[],
  scenario: ScenarioPlanShape,
  from: Date = new Date(),
): ScenarioSimulationPoint[] {
  const horizon = scenario.horizonMonths ?? 12;
  const syntheticRules = pickRecurringDeltas(scenario.assumptions);
  const rulesWithScenario = [...baselineRules, ...syntheticRules];

  const out: ScenarioSimulationPoint[] = [];
  for (let i = 0; i < horizon; i += 1) {
    const d = addMonths(from, i);
    const monthStart = startOfDay(new Date(d.getFullYear(), d.getMonth(), 1));
    const monthEnd = startOfDay(new Date(d.getFullYear(), d.getMonth() + 1, 0));
    const oneTimeTxs = buildOneTimeTransactions(scenario.assumptions, d, i);
    const base = calculateFinanceForecast([], baselineRules, monthStart, monthEnd, from);
    const alt = calculateFinanceForecast(
      oneTimeTxs,
      rulesWithScenario,
      monthStart,
      monthEnd,
      from,
    );
    out.push({
      monthKey: format(d, "yyyy-MM"),
      baselineFreeToSpend: base.freeToSpend,
      scenarioFreeToSpend: alt.freeToSpend,
    });
  }
  return out;
}
