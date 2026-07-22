import type { Bed, CellPlanting } from "@/types/garden";
import type { PlantGuild } from "@/data/guilds";

/**
 * Extent of a guild's pattern, derived from the offsets themselves so it can
 * never drift from the authored data.
 */
export function guildPatternSize(guild: PlantGuild): { width: number; height: number } {
  let width = 0;
  let height = 0;
  for (const p of guild.plants) {
    width = Math.max(width, p.offsetX + 1);
    height = Math.max(height, p.offsetY + 1);
  }
  return { width, height };
}

export function guildFitsBed(guild: PlantGuild, bed: Bed): boolean {
  const { width, height } = guildPatternSize(guild);
  return width > 0 && width <= bed.width && height <= bed.height;
}

/**
 * Repeat a guild across the whole bed instead of stamping it once in the corner.
 * Partial tiles at the far edge are clipped and path cells stay empty.
 *
 * The pattern repeats rather than stretching: guild offsets encode a real
 * planting distance — a Three Sisters mound is a mound, not a ratio — so
 * scaling one to fit the bed would silently destroy the spacing it exists
 * to express.
 */
export function tileGuild(guild: PlantGuild, bed: Bed): CellPlanting[] {
  const { width: patternWidth, height: patternHeight } = guildPatternSize(guild);
  if (patternWidth === 0 || patternHeight === 0) return [];

  const paths = new Set(bed.paths ?? []);
  const cells: CellPlanting[] = [];

  for (let originY = 0; originY < bed.height; originY += patternHeight) {
    for (let originX = 0; originX < bed.width; originX += patternWidth) {
      for (const p of guild.plants) {
        const cellX = originX + p.offsetX;
        const cellY = originY + p.offsetY;
        if (cellX >= bed.width || cellY >= bed.height) continue;
        if (paths.has(`${cellX}-${cellY}`)) continue;
        cells.push({ cellX, cellY, plantId: p.plantId });
      }
    }
  }

  return cells;
}
