import { describe, it, expect } from "vitest";
import { encodeGardenToUrl, decodeGardenFromUrl } from "@/lib/sharing";
import type { Garden } from "@/types/garden";

const garden: Garden = {
  id: "g1",
  name: "My Garden",
  season: "2026",
  beds: [{
    id: "b1",
    name: "Tomato Bed",
    x: 0,
    y: 0,
    width: 4,
    height: 3,
    environmentType: "greenhouse",
    greenhouseConfig: {
      material: "glass",
      heated: true,
      heatingType: "electric",
      ventilation: "automatic",
      minTempC: 5,
      maxTempC: 35,
      frostProtectionWeeks: 4,
    },
    cells: [
      { cellX: 0, cellY: 0, plantId: "tomato" },
      { cellX: 1, cellY: 0, plantId: "basil" },
      { cellX: 2, cellY: 0, plantId: "tomato", variety: "San Marzano" },
    ],
  }],
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};

describe("Garden sharing", () => {
  it("should encode and decode a garden", () => {
    const encoded = encodeGardenToUrl(garden);
    expect(encoded).toBeTruthy();
    expect(typeof encoded).toBe("string");

    const decoded = decodeGardenFromUrl(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.name).toBe("My Garden");
    expect(decoded!.beds).toHaveLength(1);
    expect(decoded!.beds[0].w).toBe(4);
    expect(decoded!.beds[0].h).toBe(3);
    expect(decoded!.beds[0].env).toBe("greenhouse");
    expect(decoded!.beds[0].cells).toHaveLength(3);
  });

  it("carries a bed's own cell size, which is part of the layout", () => {
    const sized: Garden = { ...garden, beds: [{ ...garden.beds[0], cellSizeCm: 25 }] };
    expect(decodeGardenFromUrl(encodeGardenToUrl(sized))!.beds[0].cs).toBe(25);
    // A bed on the default carries nothing, so the recipient uses their own.
    expect(decodeGardenFromUrl(encodeGardenToUrl(garden))!.beds[0].cs).toBeUndefined();
  });

  it("should return null for invalid data", () => {
    expect(decodeGardenFromUrl("invalid")).toBeNull();
    expect(decodeGardenFromUrl("")).toBeNull();
  });

  // A link is hand-editable, and the grid renders one component per cell, so
  // an unbounded bed hangs the recipient rather than importing badly.
  it("drops beds whose grid would blow past the cell cap, keeping siblings", () => {
    const encode = (beds: unknown[]) =>
      btoa(unescape(encodeURIComponent(JSON.stringify({ v: 1, name: "Shared", beds }))));

    const decoded = decodeGardenFromUrl(encode([
      { name: "sane", w: 20, h: 20, env: "outdoor_bed", cells: [] },
      { name: "huge", w: 5000, h: 5000, env: "outdoor_bed", cells: [] },
      { name: "text", w: "wide", h: 3, env: "outdoor_bed", cells: [] },
      { name: "zero", w: 0, h: 3, env: "outdoor_bed", cells: [] },
    ]));

    expect(decoded!.beds.map((b) => b.name)).toEqual(["sane"]);
  });

  it("should produce reasonably sized URLs", () => {
    const encoded = encodeGardenToUrl(garden);
    // base64 of a small garden should be under 1KB
    expect(encoded.length).toBeLessThan(1000);
  });
});
