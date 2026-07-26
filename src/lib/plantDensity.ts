import type { Plant } from "@/types/plant";

/**
 * How many plants a grid cell holds.
 *
 * Area per plant is `spacingCm × rowSpacingCm` — both fields, deliberately.
 * Squaring `spacingCm` alone would claim radish needs 25 cm² instead of 75,
 * i.e. 36 per 30 cm cell against a square-foot-gardening benchmark of 16.
 * Over-sowing is the expensive mistake for a beginner (crowded radishes never
 * bulb, and you cannot undo a sowing), so this floors rather than rounds.
 */
export interface PlantDensity {
  /** Whole plants that fit one cell; 0 when the plant outgrows a cell. */
  perCell: number;
  /** Cells one plant needs; 1 unless it outgrows a cell. */
  cellsPerPlant: number;
  areaPerPlantCm2: number;
}

export function plantDensity(
  plant: Pick<Plant, "spacingCm" | "rowSpacingCm">,
  cellSizeCm: number
): PlantDensity | null {
  const { spacingCm, rowSpacingCm } = plant;
  if (!(spacingCm > 0) || !(rowSpacingCm > 0) || !(cellSizeCm > 0)) return null;

  const areaPerPlantCm2 = spacingCm * rowSpacingCm;
  const fit = cellSizeCm ** 2 / areaPerPlantCm2;

  return fit >= 1
    ? { perCell: Math.floor(fit), cellsPerPlant: 1, areaPerPlantCm2 }
    : { perCell: 0, cellsPerPlant: Math.ceil(1 / fit), areaPerPlantCm2 };
}
