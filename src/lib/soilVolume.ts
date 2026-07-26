import type { Bed } from "@/types/garden";

/** Compost and topsoil are sold in 40 L bags across most of the EU and UK. */
export const SOIL_BAG_LITRES = 40;

export interface SoilVolume {
  litres: number;
  cubicMetres: number;
  bags: number;
}

/**
 * Soil needed to fill a raised bed to its full height.
 *
 * The whole footprint counts, paths included — a path drawn on a raised bed is
 * a walkway over the same box of soil, not a hole in it.
 */
export function raisedBedSoilVolume(
  bed: Pick<Bed, "width" | "height">,
  heightCm: number,
  cellSizeCm: number
): SoilVolume | null {
  if (!(bed.width > 0) || !(bed.height > 0)) return null;
  if (!(heightCm > 0) || !(cellSizeCm > 0)) return null;

  const areaCm2 = bed.width * cellSizeCm * bed.height * cellSizeCm;
  const litres = (areaCm2 * heightCm) / 1000;

  return {
    litres,
    cubicMetres: litres / 1000,
    bags: Math.ceil(litres / SOIL_BAG_LITRES),
  };
}
