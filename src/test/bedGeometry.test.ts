import { describe, it, expect } from "vitest";
import { bedCellSizeCm, bedCellAreaM2, bedSizeM, bedAreaM2, plantAreaM2, regridToCellSize, cellCountExceedsLimit } from "@/lib/bedGeometry";
import type { Bed, Garden } from "@/types/garden";

function makeBed(over: Partial<Bed> = {}): Bed {
  return {
    id: "b", name: "Bed", x: 0, y: 0, width: 6, height: 4,
    updatedAt: "2026-01-01T00:00:00.000Z", cells: [], environmentType: "outdoor_bed", ...over,
  };
}

const cells = (plantId: string, n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `${plantId}-${i}`, cellX: i, cellY: 0, plantId }));

describe("bedGeometry", () => {
  it("inherits the default when the bed has no size of its own", () => {
    expect(bedCellSizeCm(makeBed(), 30)).toBe(30);
    expect(bedCellSizeCm(makeBed({ cellSizeCm: 25 }), 30)).toBe(25);
  });

  it("ignores a nonsense stored size rather than dividing by it", () => {
    expect(bedCellSizeCm(makeBed({ cellSizeCm: 0 }), 30)).toBe(30);
    expect(bedCellSizeCm(makeBed({ cellSizeCm: -10 }), 30)).toBe(30);
  });

  it("derives footprint from the grid, since the grid is what is fixed", () => {
    expect(bedSizeM(makeBed(), 30)).toEqual({ widthM: 1.8, heightM: 1.2 });
    // Same 6 × 4 grid, smaller cells: a smaller bed, not a different grid.
    expect(bedSizeM(makeBed({ cellSizeCm: 15 }), 30)).toEqual({ widthM: 0.9, heightM: 0.6 });
    expect(bedAreaM2(makeBed({ cellSizeCm: 50 }), 30)).toBeCloseTo(3 * 2, 6);
  });

  it("keeps cell area consistent with cell size", () => {
    expect(bedCellAreaM2(makeBed({ cellSizeCm: 30 }), 30)).toBeCloseTo(0.09, 6);
    expect(bedCellAreaM2(makeBed({ cellSizeCm: 50 }), 30)).toBeCloseTo(0.25, 6);
  });

  it("accumulates crop area per bed when beds disagree on cell size", () => {
    const gardens: Garden[] = [{
      id: "g", name: "G", season: "2026", createdAt: "", updatedAt: "",
      beds: [
        makeBed({ id: "a", cells: cells("radish", 4) }),                    // inherits 30 → 0.09 each
        makeBed({ id: "b", cellSizeCm: 50, cells: cells("radish", 2) }),    // 0.25 each
      ],
    }];
    expect(plantAreaM2(gardens, "radish", 30)).toBeCloseTo(4 * 0.09 + 2 * 0.25, 6);
    // The bug this exists to prevent: 6 cells × one global size.
    expect(plantAreaM2(gardens, "radish", 30)).not.toBeCloseTo(6 * 0.09, 6);
  });

  describe("regridToCellSize", () => {
    it("keeps the footprint and changes the grid, not the other way round", () => {
      const bed = makeBed(); // 6 × 4 at the 30 cm default = 1.8 × 1.2 m
      const finer = regridToCellSize(bed, 15, 30)!;
      expect(finer).toEqual({ width: 12, height: 8 });
      expect(bedSizeM({ ...bed, ...finer, cellSizeCm: 15 }, 30)).toEqual({ widthM: 1.8, heightM: 1.2 });
    });

    it("coarsens for a field-scale bed", () => {
      // 30 × 20 m at 1 m cells, re-gridded to 2 m.
      const field = makeBed({ width: 30, height: 20, cellSizeCm: 100 });
      expect(regridToCellSize(field, 200, 30)).toEqual({ width: 15, height: 10 });
    });

    it("never collapses a bed to nothing", () => {
      const small = makeBed({ width: 1, height: 1 }); // 0.3 × 0.3 m
      expect(regridToCellSize(small, 100, 30)).toEqual({ width: 1, height: 1 });
    });

    it("rejects a nonsense size instead of dividing by it", () => {
      expect(regridToCellSize(makeBed(), 0, 30)).toBeNull();
      expect(regridToCellSize(makeBed(), -5, 30)).toBeNull();
    });

    it("refuses a grid that would hang the page, rather than clamping to one", () => {
      // 1.8 × 1.2 m at 1 cm is 180 × 120 = 21,600 rendered cells.
      expect(regridToCellSize(makeBed(), 1, 30)).toBeNull();
      // A 40 × 20 m field at the 30 cm default is 8,911 — big, but permitted.
      const field = makeBed({ width: 40, height: 20, cellSizeCm: 100 });
      expect(regridToCellSize(field, 30, 30)).toEqual({ width: 133, height: 67 });
      expect(cellCountExceedsLimit(133, 67)).toBe(false);
      expect(cellCountExceedsLimit(180, 120)).toBe(true);
    });
  });

  it("counts only the requested crop, across gardens", () => {
    const bedWithMix = makeBed({ cells: [...cells("radish", 3), ...cells("carrot", 2)] });
    const gardens: Garden[] = [
      { id: "g1", name: "G1", season: "2026", createdAt: "", updatedAt: "", beds: [bedWithMix] },
      { id: "g2", name: "G2", season: "2026", createdAt: "", updatedAt: "", beds: [makeBed({ cellSizeCm: 20, cells: cells("radish", 1) })] },
    ];
    expect(plantAreaM2(gardens, "radish", 30)).toBeCloseTo(3 * 0.09 + 0.04, 6);
    expect(plantAreaM2(gardens, "nothing", 30)).toBe(0);
  });
});
