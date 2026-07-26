import { describe, it, expect } from "vitest";
import { raisedBedSoilVolume, SOIL_BAG_LITRES } from "@/lib/soilVolume";

describe("raisedBedSoilVolume", () => {
  it("computes the fill for a typical bed", () => {
    // 6 × 4 cells at 30 cm = 180 × 120 cm; at 80 cm deep that is 1.728 m³.
    const v = raisedBedSoilVolume({ width: 6, height: 4 }, 80, 30)!;
    expect(v.litres).toBeCloseTo(1728, 6);
    expect(v.cubicMetres).toBeCloseTo(1.728, 6);
    expect(v.bags).toBe(44); // ceil(1728 / 40)
  });

  it("rounds bags up, since a part bag still has to be bought", () => {
    const v = raisedBedSoilVolume({ width: 1, height: 1 }, 50, 30)!;
    expect(v.litres).toBeCloseTo(45, 6);
    expect(v.bags).toBe(Math.ceil(45 / SOIL_BAG_LITRES));
    expect(v.bags).toBe(2);
  });

  it("scales linearly in every dimension", () => {
    const base = raisedBedSoilVolume({ width: 2, height: 2 }, 40, 30)!;
    expect(raisedBedSoilVolume({ width: 4, height: 2 }, 40, 30)!.litres).toBeCloseTo(base.litres * 2, 6);
    expect(raisedBedSoilVolume({ width: 2, height: 2 }, 80, 30)!.litres).toBeCloseTo(base.litres * 2, 6);
    // Cell size is squared: doubling it quadruples the footprint.
    expect(raisedBedSoilVolume({ width: 2, height: 2 }, 40, 60)!.litres).toBeCloseTo(base.litres * 4, 6);
  });

  it("returns null rather than 0 or NaN for unusable input", () => {
    expect(raisedBedSoilVolume({ width: 0, height: 4 }, 80, 30)).toBeNull();
    expect(raisedBedSoilVolume({ width: 6, height: 0 }, 80, 30)).toBeNull();
    expect(raisedBedSoilVolume({ width: 6, height: 4 }, 0, 30)).toBeNull();
    expect(raisedBedSoilVolume({ width: 6, height: 4 }, 80, 0)).toBeNull();
    expect(raisedBedSoilVolume({ width: 6, height: 4 }, NaN, 30)).toBeNull();
  });
});
