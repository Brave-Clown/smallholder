import { describe, it, expect } from "vitest";
import { monthFraction, axisPercent } from "@/lib/timeline";

describe("Season timeline axis", () => {
  it("puts Jan 1 at the start and Dec 31 just short of the end", () => {
    expect(monthFraction(new Date(2026, 0, 1))).toBe(0);
    expect(monthFraction(new Date(2026, 11, 31))).toBeGreaterThan(11.9);
    expect(monthFraction(new Date(2026, 11, 31))).toBeLessThan(12);
  });

  it("lands the first of each month exactly on its month boundary", () => {
    for (let m = 0; m < 12; m++) {
      expect(monthFraction(new Date(2026, m, 1))).toBe(m);
    }
  });

  it("scales by the real length of the month, not a fixed 31 days", () => {
    // Feb 15 of a 28-day February is past the halfway point of the month
    expect(monthFraction(new Date(2026, 1, 15))).toBeCloseTo(1 + 14 / 28, 5);
    // ...and a leap February stretches the same day date slightly earlier
    expect(monthFraction(new Date(2024, 1, 15))).toBeCloseTo(1 + 14 / 29, 5);
  });

  it("increases monotonically through the year", () => {
    let previous = -1;
    for (let m = 0; m < 12; m++) {
      for (const day of [1, 15, 28]) {
        const value = monthFraction(new Date(2026, m, day));
        expect(value).toBeGreaterThan(previous);
        previous = value;
      }
    }
  });

  it("converts to a percentage of the axis width", () => {
    expect(axisPercent(new Date(2026, 0, 1))).toBe(0);
    expect(axisPercent(new Date(2026, 6, 1))).toBeCloseTo(50, 5);
  });
});
