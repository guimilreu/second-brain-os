import { addMonths, format, startOfDay } from "date-fns";
import { calculateFinanceForecast, type ForecastRecurringRule } from "@/features/finance/lib/forecast";

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

function pickRuleDelta(assumptions: ScenarioAssumption[]): Partial<ForecastRecurringRule> | null {
  if (!assumptions?.length) return null;
  const a = assumptions[0];
  if (a.kind === "add-expense" && a.payload && typeof a.payload.amount === "number") {
    return {
      id: "scenario-synthetic",
      title: String(a.payload.title ?? "Cenário"),
      amount: Number(a.payload.amount),
      type: "expense",
      category: String(a.payload.category ?? "Outro"),
      cadence: "monthly",
      dayOfMonth: 1,
      startsAt: new Date(2000, 0, 1),
      isActive: true,
    };
  }
  return null;
}

export function simulateScenario(
  baselineRules: ForecastRecurringRule[],
  scenario: ScenarioPlanShape,
  from: Date = new Date(),
): ScenarioSimulationPoint[] {
  const horizon = scenario.horizonMonths ?? 12;
  const synthetic = pickRuleDelta(scenario.assumptions);
  const rulesWithScenario = synthetic
    ? [...baselineRules, synthetic as ForecastRecurringRule]
    : baselineRules;

  const out: ScenarioSimulationPoint[] = [];
  for (let i = 0; i < horizon; i += 1) {
    const d = addMonths(from, i);
    const monthStart = startOfDay(new Date(d.getFullYear(), d.getMonth(), 1));
    const monthEnd = startOfDay(new Date(d.getFullYear(), d.getMonth() + 1, 0));
    const base = calculateFinanceForecast([], baselineRules, monthStart, monthEnd, from);
    const alt = calculateFinanceForecast([], rulesWithScenario, monthStart, monthEnd, from);
    out.push({
      monthKey: format(d, "yyyy-MM"),
      baselineFreeToSpend: base.freeToSpend,
      scenarioFreeToSpend: alt.freeToSpend,
    });
  }
  return out;
}
