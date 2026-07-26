import type { Bed, Garden } from "@/types/garden";

export const MIN_CELL_SIZE_CM = 5;
export const MAX_CELL_SIZE_CM = 300;

/**
 * Every cell is a rendered component, so a grid this large is a browser hang,
 * not a slow render — 1 cm cells on a 1.8 × 1.2 m bed is already 21,600 of
 * them. The cap permits everything sane (a 40 × 20 m field at 30 cm is 8,911)
 * and blocks the rest; Level 3's fields-as-rows is the real answer for bigger.
 */
export const MAX_BED_CELLS = 10_000;

export function cellCountExceedsLimit(width: number, height: number): boolean {
  return width * height > MAX_BED_CELLS;
}

/**
 * Cell size is per-bed, falling back to the app-wide default.
 *
 * Everything that turns cells into real-world area has to go through here:
 * summing cells across beds and multiplying once by a single cell size is
 * wrong the moment two beds disagree.
 */
export function bedCellSizeCm(bed: Pick<Bed, "cellSizeCm">, defaultCellSizeCm: number): number {
  const own = bed.cellSizeCm;
  return own !== undefined && own > 0 ? own : defaultCellSizeCm;
}

export function bedCellAreaM2(bed: Pick<Bed, "cellSizeCm">, defaultCellSizeCm: number): number {
  return (bedCellSizeCm(bed, defaultCellSizeCm) / 100) ** 2;
}

/** Real-world footprint. The grid is fixed, so cell size is what sets this. */
export function bedSizeM(
  bed: Pick<Bed, "width" | "height" | "cellSizeCm">,
  defaultCellSizeCm: number
): { widthM: number; heightM: number } {
  const cm = bedCellSizeCm(bed, defaultCellSizeCm);
  return { widthM: (bed.width * cm) / 100, heightM: (bed.height * cm) / 100 };
}

export function bedAreaM2(
  bed: Pick<Bed, "width" | "height" | "cellSizeCm">,
  defaultCellSizeCm: number
): number {
  const { widthM, heightM } = bedSizeM(bed, defaultCellSizeCm);
  return widthM * heightM;
}

/**
 * The grid a bed needs to keep its real-world footprint at a new cell size.
 *
 * Metres are the real-world fact; cells are only planning resolution. Holding
 * the grid and letting the footprint move would make this control a bed
 * resizer, which is not a thing gardeners do to beds that already exist.
 */
export function regridToCellSize(
  bed: Pick<Bed, "width" | "height" | "cellSizeCm">,
  newCellSizeCm: number,
  defaultCellSizeCm: number
): { width: number; height: number } | null {
  if (!(newCellSizeCm > 0)) return null;
  const { widthM, heightM } = bedSizeM(bed, defaultCellSizeCm);
  const width = Math.max(1, Math.round((widthM * 100) / newCellSizeCm));
  const height = Math.max(1, Math.round((heightM * 100) / newCellSizeCm));
  // Refuse rather than clamp: a silently different grid than the one asked for
  // is worse than saying no.
  if (cellCountExceedsLimit(width, height)) return null;
  return { width, height };
}

/** Area growing one crop across every garden, accumulated per bed. */
export function plantAreaM2(gardens: Garden[], plantId: string, defaultCellSizeCm: number): number {
  let area = 0;
  for (const garden of gardens) {
    for (const bed of garden.beds) {
      const cellArea = bedCellAreaM2(bed, defaultCellSizeCm);
      for (const cell of bed.cells) {
        if (cell.plantId === plantId) area += cellArea;
      }
    }
  }
  return area;
}
