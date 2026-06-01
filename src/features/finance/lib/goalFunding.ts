import { differenceInCalendarMonths, startOfMonth } from "date-fns";

export type GoalFundingInput = {
  targetAmount: number;
  currentAmount: number;
  dueDate?: Date | string | null;
  status?: string;
};

export type GoalFundingResult = {
  remaining: number;
  monthsRemaining: number;
  monthlyNeed: number | null;
};

/** Quanto falta aportar por mês até o prazo, ou null se sem prazo / meta concluída. */
export function monthlyNeed(
  goal: GoalFundingInput,
  referenceDate: Date = new Date(),
): number | null {
  return calculateGoalFunding(goal, referenceDate).monthlyNeed;
}

export function calculateGoalFunding(
  goal: GoalFundingInput,
  referenceDate: Date = new Date(),
): GoalFundingResult {
  const remaining = Math.max(
    0,
    Number(goal.targetAmount) - Number(goal.currentAmount),
  );

  if (goal.status === "completed" || remaining <= 0) {
    return { remaining: 0, monthsRemaining: 0, monthlyNeed: null };
  }

  if (!goal.dueDate) {
    return { remaining, monthsRemaining: 0, monthlyNeed: null };
  }

  const due = startOfMonth(new Date(goal.dueDate));
  const ref = startOfMonth(referenceDate);
  const monthsRemaining = differenceInCalendarMonths(due, ref) + 1;

  if (monthsRemaining <= 0) {
    return {
      remaining,
      monthsRemaining: 0,
      monthlyNeed: remaining > 0 ? remaining : null,
    };
  }

  return {
    remaining,
    monthsRemaining,
    monthlyNeed: remaining / monthsRemaining,
  };
}
