import { describe, expect, it } from "vitest";
import { occurrenceDate, overdueOccurrences, suggestedStartMonth } from "./recurring";
import { recurring, scenarioAccounts, tx } from "./fixtures.test-utils";

describe("fixas", () => {
  it("anual só no mês configurado; meses pulados e pausadas não geram ocorrência", () => {
    const ipva = recurring({ id: "ipva", type: "expense", amountCents: 150_000, accountId: "mp-saldo", dayOfMonth: 15, frequency: "yearly", monthOfYear: 3 });
    expect(occurrenceDate(ipva, "2027-03")).toBe("2027-03-15");
    expect(occurrenceDate(ipva, "2027-04")).toBeNull();
    const rent = recurring({ id: "aluguel", type: "expense", amountCents: 1, accountId: "mp-saldo", dayOfMonth: 31, skippedMonths: ["2026-10"] });
    expect(occurrenceDate(rent, "2026-10")).toBeNull();
    expect(occurrenceDate(rent, "2026-11")).toBe("2026-11-30");
    expect(occurrenceDate({ ...rent, active: false }, "2026-12")).toBeNull();
  });

  it("vencidas não lançadas aparecem; lançadas somem", () => {
    const accounts = scenarioAccounts();
    const rent = recurring({ id: "aluguel", type: "expense", amountCents: 200_000, accountId: "mp-saldo", dayOfMonth: 10, startMonth: "2026-09" });
    const posted = tx({ type: "expense", amountCents: 200_000, accountId: "mp-saldo", date: "2026-09-10", recurringId: "aluguel", recurringMonth: "2026-09" });
    const overdue = overdueOccurrences([rent], accounts, [posted], "2026-10-12");
    expect(overdue.map((item) => item.month)).toEqual(["2026-10"]);
  });

  it("começo sugerido: se o dia já passou, começa no mês seguinte", () => {
    expect(suggestedStartMonth("2026-09-30", 10)).toBe("2026-10");
    expect(suggestedStartMonth("2026-09-05", 10)).toBe("2026-09");
  });
});
