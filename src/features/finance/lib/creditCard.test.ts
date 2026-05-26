import { describe, expect, it } from "vitest";
import { computeInvoiceBounds } from "./creditCard";

describe("creditCard computeInvoiceBounds", () => {
  it("fecha ciclo corretamente para compra antes do fechamento", () => {
    const { cycleStart, cycleEnd, dueDate } = computeInvoiceBounds(27, 5, new Date(2026, 0, 10));
    expect(cycleEnd.getDate()).toBe(27);
    expect(cycleEnd.getMonth()).toBe(0);
    expect(cycleStart.getDate()).toBe(28);
    expect(cycleStart.getMonth()).toBe(11);
    expect(cycleStart.getFullYear()).toBe(2025);
    expect(dueDate.getMonth()).toBe(1);
  });
});
