import { describe, it, expect } from "vitest";
import { generateTasks, livePlantingGroupKeys, taskGroupKey, HORIZON_DAYS } from "@/lib/taskGeneration";
import type { Garden, Bed, CellPlantingDraft } from "@/types/garden";
import type { Plant } from "@/types/plant";

const tomato: Plant = {
  id: "tomato", category: "vegetable", sowIndoorsWeeks: -8, sowOutdoorsWeeks: null,
  transplantWeeks: 2, harvestDaysMin: 60, harvestDaysMax: 85, spacingCm: 50,
  rowSpacingCm: 70, sunRequirement: "full", waterNeed: "high",
  companions: [], antagonists: [], color: "#ef4444", icon: "T",
};

const radish: Plant = {
  id: "radish", category: "vegetable", sowIndoorsWeeks: null, sowOutdoorsWeeks: -4,
  transplantWeeks: null, harvestDaysMin: 25, harvestDaysMax: 35, spacingCm: 5,
  rowSpacingCm: 15, sunRequirement: "full", waterNeed: "medium",
  companions: [], antagonists: [], color: "#dc2626", icon: "R",
};

// The harvestDaysMax >= 365 shape the lifecycle split exists to kill.
const blueberry: Plant = {
  id: "blueberry", category: "berry", sowIndoorsWeeks: null, sowOutdoorsWeeks: null,
  transplantWeeks: 0, harvestDaysMin: 730, harvestDaysMax: 1095, spacingCm: 150,
  rowSpacingCm: 200, sunRequirement: "full", waterNeed: "medium",
  companions: [], antagonists: [], color: "#3b82f6", icon: "B",
};

const plantMap = new Map<string, Plant>([
  ["tomato", tomato], ["radish", radish], ["blueberry", blueberry],
]);

const FROST = "2026-05-15";
const TODAY = new Date("2026-07-27T00:00:00");

function garden(cells: CellPlantingDraft[], over: Partial<Bed> = {}): Garden {
  const bed: Bed = {
    id: "bed1", name: "Bed 1", x: 0, y: 0, width: 6, height: 4,
    updatedAt: "2026-01-01", environmentType: "outdoor_bed",
    cells: cells.map((c, i) => ({ ...c, id: c.id ?? `c${i}` })),
    ...over,
  };
  return {
    id: "g1", name: "G", season: "2026", beds: [bed],
    createdAt: "2026-01-01", updatedAt: "2026-01-01",
  };
}

const run = (g: Garden, today = TODAY) =>
  generateTasks([g], plantMap, { today, lastFrostDate: FROST });

describe("Mid-season adoption", () => {
  // The whole reason this file exists: someone installs the app in July with
  // tomatoes already in the ground.
  it("gives a planting in the ground a harvest date and no sowing tasks", () => {
    const tasks = run(garden([
      { cellX: 0, cellY: 0, plantId: "tomato", plantedDate: "2026-06-01" },
    ]));

    expect(tasks.map((t) => t.type)).toEqual(["harvest"]);
    // 2026-06-01 + 60 days
    expect(tasks[0].dueDate).toBe("2026-07-31");
  });

  it("gives the same cell sowing tasks while it is only planned", () => {
    // Seen in March, before either window has passed.
    const tasks = run(
      garden([{ cellX: 0, cellY: 0, plantId: "tomato" }]),
      new Date("2026-03-15T00:00:00")
    );

    expect(tasks.map((t) => t.type).sort()).toEqual(["sow_indoors", "transplant"]);
    expect(tasks.some((t) => t.type === "harvest")).toBe(false);
  });

  it("says nothing about a planned cell whose windows have all closed", () => {
    // Tomato sows indoors 2026-03-20 and transplants 2026-05-29; by late July
    // both are moot. Under the old generator these sat in the list forever.
    expect(run(garden([{ cellX: 0, cellY: 0, plantId: "tomato" }]))).toEqual([]);
  });

  it("stops generating a sowing task once its window is long past", () => {
    // Radish sows 4 weeks before frost: 2026-04-17, plus 21 days of grace.
    const planned = garden([{ cellX: 0, cellY: 0, plantId: "radish" }]);

    expect(run(planned, new Date("2026-05-01T00:00:00")).map((t) => t.type)).toEqual(["sow_outdoors"]);
    expect(run(planned, new Date("2026-07-27T00:00:00"))).toEqual([]);
  });

  it("keeps a harvest task through the whole window, not just its first day", () => {
    const g = garden([{ cellX: 0, cellY: 0, plantId: "radish", plantedDate: "2026-07-01" }]);

    // Due 2026-07-26, window closes 2026-08-05, slack to 2026-08-19.
    expect(run(g, new Date("2026-08-10T00:00:00"))).toHaveLength(1);
    expect(run(g, new Date("2026-08-25T00:00:00"))).toEqual([]);
  });
});

describe("Planting groups", () => {
  it("treats a block of one crop as one job, not one job per square", () => {
    const tasks = run(garden([
      { cellX: 0, cellY: 0, plantId: "tomato", plantedDate: "2026-06-01" },
      { cellX: 1, cellY: 0, plantId: "tomato", plantedDate: "2026-06-01" },
      { cellX: 2, cellY: 0, plantId: "tomato", plantedDate: "2026-06-01" },
    ]));

    expect(tasks).toHaveLength(1);
    expect(tasks[0].cellCount).toBe(3);
  });

  it("splits a crop planted on two dates into two jobs", () => {
    const tasks = run(garden([
      { cellX: 0, cellY: 0, plantId: "radish", plantedDate: "2026-07-01" },
      { cellX: 1, cellY: 0, plantId: "radish", plantedDate: "2026-07-15" },
    ]));

    expect(tasks).toHaveLength(2);
    expect(tasks.map((t) => t.dueDate)).toEqual(["2026-07-26", "2026-08-09"]);
  });

  it("keeps its key when a planting moves to another square", () => {
    const before = run(garden([
      { cellX: 0, cellY: 0, plantId: "tomato", plantedDate: "2026-06-01" },
    ]));
    const after = run(garden([
      { cellX: 5, cellY: 3, plantId: "tomato", plantedDate: "2026-06-01" },
    ]));

    expect(after[0].id).toBe(before[0].id);
  });

  it("gives each bed its own job for the same crop", () => {
    const g = garden([{ cellX: 0, cellY: 0, plantId: "tomato", plantedDate: "2026-06-01" }]);
    g.beds.push({
      ...g.beds[0], id: "bed2", name: "Bed 2",
      cells: [{ id: "x", cellX: 0, cellY: 0, plantId: "tomato", plantedDate: "2026-06-01" }],
    });

    const tasks = run(g);
    expect(tasks).toHaveLength(2);
    expect(new Set(tasks.map((t) => t.id)).size).toBe(2);
    expect(tasks.map((t) => t.bedName).sort()).toEqual(["Bed 1", "Bed 2"]);
  });
});

describe("Rules", () => {
  it("shifts sowing dates by the bed's frost protection", () => {
    const outdoor = run(garden([{ cellX: 0, cellY: 0, plantId: "tomato" }]), new Date("2026-03-01T00:00:00"));
    const sheltered = run(
      garden([{ cellX: 0, cellY: 0, plantId: "tomato" }], { environmentType: "polytunnel" }),
      new Date("2026-03-01T00:00:00")
    );

    const transplant = (ts: typeof outdoor) => ts.find((t) => t.type === "transplant")!.dueDate;
    // A polytunnel buys 3 weeks, so its transplant date comes earlier.
    expect(transplant(sheltered) < transplant(outdoor)).toBe(true);
  });

  it("says nothing about perennials rather than guessing", () => {
    // harvestDaysMax >= 365 is a placeholder, not a fact — "harvest in 730
    // days" would be worse than silence. Real dates arrive with the lifecycle
    // split (Level 2 schema v2).
    const tasks = run(garden([
      { cellX: 0, cellY: 0, plantId: "blueberry", plantedDate: "2026-06-01" },
    ]));

    expect(tasks).toEqual([]);
  });

  it("ignores plantings whose plant is unknown", () => {
    const tasks = run(garden([{ cellX: 0, cellY: 0, plantId: "dragonfruit" }]));
    expect(tasks).toEqual([]);
  });

  it("does not look further ahead than the horizon", () => {
    const g = garden([{ cellX: 0, cellY: 0, plantId: "tomato", plantedDate: "2026-07-01" }]);
    // Harvest lands 2026-08-30, well inside the horizon.
    expect(run(g)).toHaveLength(1);
    expect(generateTasks([g], plantMap, { today: TODAY, lastFrostDate: FROST, horizonDays: 5 })).toEqual([]);
    expect(HORIZON_DAYS).toBeGreaterThan(30);
  });
});

describe("Overlay housekeeping", () => {
  it("reports the groups that exist, whatever their dates", () => {
    const keys = livePlantingGroupKeys([garden([
      { cellX: 0, cellY: 0, plantId: "tomato", plantedDate: "2026-06-01" },
      { cellX: 1, cellY: 0, plantId: "radish" },
    ])], plantMap);

    expect(keys).toEqual(new Set(["bed1:tomato:2026-06-01", "bed1:radish:planned"]));
  });

  it("maps a task key back to the planting it belongs to", () => {
    const task = run(garden([
      { cellX: 0, cellY: 0, plantId: "tomato", plantedDate: "2026-06-01" },
    ]))[0];

    expect(taskGroupKey(task.id)).toBe("bed1:tomato:2026-06-01");
    expect(livePlantingGroupKeys([garden([
      { cellX: 0, cellY: 0, plantId: "tomato", plantedDate: "2026-06-01" },
    ])], plantMap).has(taskGroupKey(task.id))).toBe(true);
  });
});
