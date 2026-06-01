import { describe, expect, it } from "vitest";
import { calculatePMT, calculatePayoffDate, calculatePayoffDateWithExtra } from "./debt";

describe("debt helpers", () => {
  it("calcula PMT sem juros", () => {
    expect(calculatePMT(1200, 0, 12)).toBe(100);
  });

  it("calcula PMT com juros", () => {
    expect(calculatePMT(10000, 0.01, 24)).toBeGreaterThan(470);
  });

  it("calcula data de quitação", () => {
    const start = new Date("2026-01-15");
    const payoff = calculatePayoffDate(start, 12);
    expect(payoff.getFullYear()).toBe(2026);
    expect(payoff.getMonth()).toBe(11);
  });

  it("antecipa quitação com pagamento extra", () => {
    const start = new Date("2026-01-15");
    const base = calculatePayoffDate(start, 12);
    const withExtra = calculatePayoffDateWithExtra(start, 1200, 0, 100, 50);
    expect(withExtra.getTime()).toBeLessThan(base.getTime());
  });
});
