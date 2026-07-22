import { describe, it, expect } from "vitest";
import { tileGuild, guildPatternSize, guildFitsBed } from "@/lib/guildFill";
import { GUILDS, type PlantGuild } from "@/data/guilds";
import type { Bed } from "@/types/garden";

const bed = (width: number, height: number, paths?: string[]): Bed => ({
  id: "b1",
  name: "Bed",
  x: 0,
  y: 0,
  width,
  height,
  environmentType: "outdoor_bed",
  cells: [],
  ...(paths ? { paths } : {}),
});

const stripes: PlantGuild = {
  id: "stripes",
  nameKey: "x",
  descriptionKey: "x",
  icon: "x",
  minWidth: 2,
  minHeight: 2,
  plants: [
    { plantId: "a", offsetX: 0, offsetY: 0 },
    { plantId: "b", offsetX: 1, offsetY: 0 },
    { plantId: "c", offsetX: 0, offsetY: 1 },
    { plantId: "d", offsetX: 1, offsetY: 1 },
  ],
};

describe("guildPatternSize", () => {
  it("derives the extent from the offsets", () => {
    expect(guildPatternSize(stripes)).toEqual({ width: 2, height: 2 });
  });

  it("agrees with the minWidth/minHeight declared on every shipped guild", () => {
    for (const guild of GUILDS) {
      expect(guildPatternSize(guild)).toEqual({ width: guild.minWidth, height: guild.minHeight });
    }
  });
});

describe("tileGuild", () => {
  it("fills the whole bed rather than stamping once in the corner", () => {
    const cells = tileGuild(stripes, bed(4, 4));
    expect(cells).toHaveLength(16);
    // every cell of the bed is planted, exactly once
    const keys = new Set(cells.map((c) => `${c.cellX}-${c.cellY}`));
    expect(keys.size).toBe(16);
  });

  it("repeats the pattern rather than stretching it", () => {
    const cells = tileGuild(stripes, bed(4, 2));
    const at = (x: number, y: number) => cells.find((c) => c.cellX === x && c.cellY === y)?.plantId;
    expect(at(0, 0)).toBe("a");
    expect(at(1, 0)).toBe("b");
    // second tile is the same pattern again, not a scaled version
    expect(at(2, 0)).toBe("a");
    expect(at(3, 0)).toBe("b");
    expect(at(0, 1)).toBe("c");
    expect(at(2, 1)).toBe("c");
  });

  it("clips partial tiles at the far edge instead of overflowing the bed", () => {
    const cells = tileGuild(stripes, bed(3, 3));
    expect(cells).toHaveLength(9);
    for (const c of cells) {
      expect(c.cellX).toBeLessThan(3);
      expect(c.cellY).toBeLessThan(3);
    }
  });

  it("leaves path cells empty", () => {
    const cells = tileGuild(stripes, bed(4, 4, ["1-1", "2-2"]));
    expect(cells).toHaveLength(14);
    const keys = cells.map((c) => `${c.cellX}-${c.cellY}`);
    expect(keys).not.toContain("1-1");
    expect(keys).not.toContain("2-2");
  });

  it("still places a partial pattern in a bed smaller than the guild", () => {
    const cells = tileGuild(stripes, bed(1, 1));
    expect(cells).toEqual([{ cellX: 0, cellY: 0, plantId: "a" }]);
  });

  it("never plants outside the bed for any shipped guild and bed size", () => {
    for (const guild of GUILDS) {
      for (const [w, h] of [[1, 1], [3, 3], [7, 5], [12, 8], [20, 13]]) {
        for (const c of tileGuild(guild, bed(w, h))) {
          expect(c.cellX).toBeGreaterThanOrEqual(0);
          expect(c.cellY).toBeGreaterThanOrEqual(0);
          expect(c.cellX).toBeLessThan(w);
          expect(c.cellY).toBeLessThan(h);
        }
      }
    }
  });

  it("covers a large bed densely, not just its first tile", () => {
    for (const guild of GUILDS) {
      const cells = tileGuild(guild, bed(12, 8));
      // the old behaviour capped out at one pattern (<= 9 cells)
      expect(cells.length).toBeGreaterThan(guild.plants.length);
      expect(cells.length).toBeGreaterThan(50);
    }
  });
});

describe("guildFitsBed", () => {
  it("rejects beds narrower or shorter than the pattern", () => {
    expect(guildFitsBed(stripes, bed(2, 2))).toBe(true);
    expect(guildFitsBed(stripes, bed(1, 2))).toBe(false);
    expect(guildFitsBed(stripes, bed(2, 1))).toBe(false);
  });
});
