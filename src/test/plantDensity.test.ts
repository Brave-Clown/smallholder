import { describe, it, expect } from "vitest";
import { plantDensity } from "@/lib/plantDensity";
import plants from "@/data/plants.json";
import type { Plant } from "@/types/plant";

const byId = (id: string) => (plants as Plant[]).find((p) => p.id === id)!;

describe("plantDensity", () => {
  it("uses both spacing fields, not spacingCm squared", () => {
    // Radish is 5 × 15: 900 / 75 = 12. Squaring spacingCm would say 36.
    expect(plantDensity(byId("radish"), 30)!.perCell).toBe(12);
    expect(plantDensity(byId("carrot"), 30)!.perCell).toBe(6);
    expect(plantDensity(byId("lettuce"), 30)!.perCell).toBe(1);
  });

  it("reports cells needed when one plant outgrows a cell", () => {
    const tomato = plantDensity(byId("tomato"), 30)!; // 50 × 70 = 3500 cm²
    expect(tomato.perCell).toBe(0);
    expect(tomato.cellsPerPlant).toBe(4);

    const pumpkin = plantDensity(byId("pumpkin"), 30)!; // 100 × 200
    expect(pumpkin.perCell).toBe(0);
    expect(pumpkin.cellsPerPlant).toBe(23);
  });

  it("floors rather than rounds, so it never over-sows", () => {
    // 900 / 75 = 12 exactly; a 32 cm cell fits 13.65 and must report 13.
    expect(plantDensity(byId("radish"), 32)!.perCell).toBe(13);
    // 25 × 30 = 750; a 30 cm cell fits 1.2 and must report 1, not 2.
    expect(plantDensity(byId("lettuce"), 30)!.perCell).toBe(1);
  });

  it("scales with cell size without a discontinuity at the boundary", () => {
    const radish = byId("radish");
    expect(plantDensity(radish, 15)!.perCell).toBe(3);
    expect(plantDensity(radish, 60)!.perCell).toBe(48);
    // Exactly one plant's footprint: perCell 1, never the 0 branch.
    const exact = plantDensity({ spacingCm: 30, rowSpacingCm: 30 }, 30)!;
    expect(exact).toMatchObject({ perCell: 1, cellsPerPlant: 1 });
  });

  it("returns null for unusable inputs rather than Infinity or NaN", () => {
    expect(plantDensity({ spacingCm: 0, rowSpacingCm: 15 }, 30)).toBeNull();
    expect(plantDensity({ spacingCm: 5, rowSpacingCm: 0 }, 30)).toBeNull();
    expect(plantDensity({ spacingCm: -5, rowSpacingCm: 15 }, 30)).toBeNull();
    expect(plantDensity(byId("radish"), 0)).toBeNull();
    expect(plantDensity({ spacingCm: NaN, rowSpacingCm: 15 }, 30)).toBeNull();
  });

  it("produces a usable figure for every shipped plant", () => {
    for (const p of plants as Plant[]) {
      const d = plantDensity(p, 30);
      expect(d, `${p.id} has no density`).not.toBeNull();
      // Every plant is either countable per cell or spans a countable number.
      expect(d!.perCell > 0 || d!.cellsPerPlant > 1).toBe(true);
    }
  });
});
