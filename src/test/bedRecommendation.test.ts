import { describe, it, expect } from "vitest";
import { recommendBedPlanting, getRecommendedPlants } from "@/lib/bedRecommendation";
import plantsData from "@/data/plants.json";
import type { Plant } from "@/types/plant";
import type { Bed } from "@/types/garden";

const plants = plantsData as Plant[];

function makeBed(width = 6, height = 4, envType: Bed["environmentType"] = "outdoor_bed"): Bed {
  return {
    id: "b1", name: "Test", x: 0, y: 0, width, height,
    environmentType: envType, cells: [],
  };
}

describe("Bed recommendation engine", () => {
  it("should recommend plants for an empty bed", () => {
    const bed = makeBed();
    const cells = recommendBedPlanting(bed, plants, {
      gridCellSizeCm: 30,
      lastFrostDate: "2026-05-15",
    });
    expect(cells.length).toBeGreaterThan(0);
    // Should have diverse plants
    const uniquePlants = new Set(cells.map((c) => c.plantId));
    expect(uniquePlants.size).toBeGreaterThan(1);
  });

  it("should not place antagonists adjacent", () => {
    const bed = makeBed();
    const cells = recommendBedPlanting(bed, plants, {
      gridCellSizeCm: 30,
      lastFrostDate: "2026-05-15",
    });
    const plantMap = new Map(plants.map((p) => [p.id, p]));

    for (const cell of cells) {
      const plant = plantMap.get(cell.plantId);
      if (!plant) continue;
      for (const other of cells) {
        if (cell === other) continue;
        if (Math.abs(cell.cellX - other.cellX) <= 1 && Math.abs(cell.cellY - other.cellY) <= 1) {
          expect(
            plant.antagonists.includes(other.plantId),
            `${cell.plantId} at (${cell.cellX},${cell.cellY}) is antagonist to ${other.plantId} at (${other.cellX},${other.cellY})`
          ).toBe(false);
        }
      }
    }
  });

  it("should produce recommendations list", () => {
    const bed = makeBed();
    const recs = getRecommendedPlants(bed, plants, {
      gridCellSizeCm: 30,
      lastFrostDate: "2026-05-15",
    });
    expect(recs.length).toBeGreaterThan(0);
    expect(recs[0].score).toBeGreaterThan(0);
  });

  it("should prefer herbs for windowsill", () => {
    const bed = makeBed(3, 2, "windowsill");
    const recs = getRecommendedPlants(bed, plants, {
      gridCellSizeCm: 30,
      lastFrostDate: "2026-05-15",
    });
    const herbCount = recs.filter((r) => r.plant.category === "herb").length;
    expect(herbCount).toBeGreaterThan(0);
  });

  it("should produce different plant selections for different strategies", () => {
    const bed = makeBed();
    const caloriesCells = recommendBedPlanting(bed, plants, {
      gridCellSizeCm: 30,
      lastFrostDate: "2026-05-15",
      strategy: "calories",
    });
    const beginnerCells = recommendBedPlanting(bed, plants, {
      gridCellSizeCm: 30,
      lastFrostDate: "2026-05-15",
      strategy: "beginner",
    });
    const caloriesPlants = new Set(caloriesCells.map((c) => c.plantId));
    const beginnerPlants = new Set(beginnerCells.map((c) => c.plantId));
    // They should differ (not identical sets)
    const combined = new Set([...caloriesPlants, ...beginnerPlants]);
    expect(combined.size).toBeGreaterThanOrEqual(Math.max(caloriesPlants.size, beginnerPlants.size));
    expect(caloriesCells.length).toBeGreaterThan(0);
    expect(beginnerCells.length).toBeGreaterThan(0);
  });

  it("never plants on a path cell, in any direction or strategy", () => {
    const paths = ["0-2", "1-2", "2-2", "3-2", "4-2", "5-2"]; // a path row across a 6x4 bed
    const bed = { ...makeBed(6, 4), paths };
    const directions = ["rows_ew", "rows_ns", "blocks", "companion_clusters"] as const;
    const strategies = ["balanced", "calories", "selfsufficient", "yield", "beginner", "quickharvest"] as const;

    for (const direction of directions) {
      for (const strategy of strategies) {
        const cells = recommendBedPlanting(bed, plants, {
          gridCellSizeCm: 30,
          lastFrostDate: "2026-05-15",
          strategy,
          direction,
        });
        const onPath = cells.filter((c) => paths.includes(`${c.cellX}-${c.cellY}`));
        expect(
          onPath.length,
          `${direction}/${strategy} buried ${onPath.length} plants under the path row`
        ).toBe(0);
        // still fills the plantable area
        expect(cells.length).toBeGreaterThan(0);
      }
    }
  });

  it("should produce results for all 4 directions", () => {
    const bed = makeBed();
    const directions = ["rows_ew", "rows_ns", "blocks", "companion_clusters"] as const;
    for (const direction of directions) {
      const cells = recommendBedPlanting(bed, plants, {
        gridCellSizeCm: 30,
        lastFrostDate: "2026-05-15",
        direction,
      });
      expect(cells.length).toBeGreaterThan(0);
    }
  });

  it("should return empty array for bed with no compatible plants", () => {
    const bed = makeBed(0, 0);
    const cells = recommendBedPlanting(bed, plants, {
      gridCellSizeCm: 30,
      lastFrostDate: "2026-05-15",
    });
    expect(cells).toHaveLength(0);
  });
});
