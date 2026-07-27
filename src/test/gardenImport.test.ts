import { describe, it, expect } from "vitest";
import { parseGardensJson } from "@/lib/gardenImport";

const fullGarden = [
  {
    id: "1",
    name: "Home",
    beds: [
      {
        id: "b1",
        name: "North bed",
        x: 0,
        y: 0,
        width: 4,
        height: 3,
        notes: "Floods at the north end every spring.",
        paths: ["0-2", "1-2"],
        environmentType: "raised_bed",
        raisedBedConfig: { heightCm: 40 },
        cellSizeCm: 25,
        cells: [
          {
            cellX: 1,
            cellY: 0,
            plantId: "tomato",
            variety: "San Marzano",
            plantedDate: "2026-05-02",
            notes: "From the saved seed.",
            overrideWarnings: true,
          },
        ],
      },
    ],
  },
];

describe("parseGardensJson", () => {
  it("preserves every field the export writes", () => {
    const [garden] = parseGardensJson(fullGarden)!;
    const bed = garden.beds[0];

    expect(garden.name).toBe("Home");
    expect(bed.notes).toBe("Floods at the north end every spring.");
    expect(bed.paths).toEqual(["0-2", "1-2"]);
    expect(bed.environmentType).toBe("raised_bed");
    expect(bed.raisedBedConfig).toEqual({ heightCm: 40 });
    // Dropping this would silently resize the bed on import.
    expect(bed.cellSizeCm).toBe(25);

    // The regression this function exists for: the old inline import rebuilt
    // each cell as {cellX, cellY, plantId} and silently dropped the rest.
    expect(bed.cells[0]).toEqual({
      cellX: 1,
      cellY: 0,
      plantId: "tomato",
      variety: "San Marzano",
      plantedDate: "2026-05-02",
      notes: "From the saved seed.",
      overrideWarnings: true,
    });
  });

  it("omits empty optionals rather than storing blanks", () => {
    const [garden] = parseGardensJson([
      {
        name: "G",
        beds: [
          {
            name: "B",
            width: 2,
            height: 2,
            notes: "",
            paths: [],
            cells: [{ cellX: 0, cellY: 0, plantId: "carrot", variety: "", overrideWarnings: false }],
          },
        ],
      },
    ])!;
    const bed = garden.beds[0];

    expect(bed).not.toHaveProperty("notes");
    expect(bed).not.toHaveProperty("paths");
    // Absent must stay absent: it means "inherit the default", not "0 cm".
    expect(bed).not.toHaveProperty("cellSizeCm");
    expect(bed.cells[0]).toEqual({ cellX: 0, cellY: 0, plantId: "carrot" });
  });

  it("ignores a nonsense cell size rather than importing a zero-area bed", () => {
    const [garden] = parseGardensJson([
      {
        name: "G",
        beds: [
          { name: "zero", width: 2, height: 2, cellSizeCm: 0, cells: [] },
          { name: "text", width: 2, height: 2, cellSizeCm: "wide", cells: [] },
        ],
      },
    ])!;
    expect(garden.beds.every((b) => b.cellSizeCm === undefined)).toBe(true);
  });

  it("imports a garden that has no id, since the store mints its own", () => {
    const result = parseGardensJson([{ name: "No id", beds: [] }]);
    expect(result).toHaveLength(1);
    expect(result![0].beds).toEqual([]);
  });

  it("defaults a missing or unknown environment type to outdoor_bed", () => {
    const [garden] = parseGardensJson([
      {
        name: "G",
        beds: [
          { name: "missing", width: 1, height: 1, cells: [] },
          { name: "bogus", width: 1, height: 1, environmentType: "space_station", cells: [] },
        ],
      },
    ])!;
    expect(garden.beds.map((b) => b.environmentType)).toEqual(["outdoor_bed", "outdoor_bed"]);
  });

  it("drops malformed beds and cells but keeps their valid siblings", () => {
    const [garden] = parseGardensJson([
      {
        name: "G",
        beds: [
          { name: "no size", cells: [] },
          { name: "zero width", width: 0, height: 2, cells: [] },
          null,
          {
            name: "good",
            width: 2,
            height: 2,
            cells: [
              { cellX: 0, cellY: 0, plantId: "bean" },
              { cellX: 1, plantId: "pea" },
              { cellX: 1, cellY: 1 },
              { cellX: "1", cellY: 1, plantId: "leek" },
            ],
          },
        ],
      },
    ])!;

    expect(garden.beds.map((b) => b.name)).toEqual(["good"]);
    expect(garden.beds[0].cells).toEqual([{ cellX: 0, cellY: 0, plantId: "bean" }]);
  });

  // The creation modal refuses these; a hand-edited file has to be refused too,
  // since the grid renders one component per cell.
  it("drops a bed whose grid would blow past the cell cap", () => {
    const [garden] = parseGardensJson([
      {
        name: "G",
        beds: [
          { name: "field", width: 133, height: 67, cells: [] },   // 8,911 — allowed
          { name: "absurd", width: 5000, height: 5000, cells: [] },
        ],
      },
    ])!;

    expect(garden.beds.map((b) => b.name)).toEqual(["field"]);
  });

  it("rejects input that yields no usable garden", () => {
    expect(parseGardensJson(null)).toBeNull();
    expect(parseGardensJson({ name: "not an array" })).toBeNull();
    expect(parseGardensJson([])).toBeNull();
    expect(parseGardensJson([{ name: "no beds key" }])).toBeNull();
    expect(parseGardensJson(["nonsense", 42])).toBeNull();
  });
});
