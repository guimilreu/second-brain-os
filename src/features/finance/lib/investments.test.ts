import { describe, expect, it } from "vitest";
import { projectFixedIncome } from "./investments";

describe("projectFixedIncome", () => {
  it("compõe taxa mensal", () => {
    expect(projectFixedIncome(1000, 0.01, 12)).toBeGreaterThan(1120);
  });
});
