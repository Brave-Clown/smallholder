import { describe, it, expect, beforeEach } from "vitest";
import { buildExportData, type SmallholderExport } from "@/lib/dataExport";
import { validateExportFile, importAllData } from "@/lib/dataImport";
import { useStore } from "@/store";

function makeExport(overrides: Partial<SmallholderExport["data"]> = {}): SmallholderExport {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    app: "smallholder",
    data: {
      gardens: [],
      tasks: [],
      taskOverlay: [],
      harvests: [],
      journalEntries: [],
      expenses: [],
      customPlants: [],
      seasonArchives: [],
      animals: [],
      animalProducts: [],
      feedEntries: [],
      healthEvents: [],
      seeds: [],
      soilTests: [],
      amendments: [],
      pests: [],
      waterEntries: [],
      pantryItems: [],
      settings: {
        locale: "de",
        lastFrostDate: "2026-05-15",
        gridCellSizeCm: 30,
        locationLat: null,
        locationLon: null,
        locationName: "",
        theme: "system",
        alerts: { frostAlertEnabled: true, frostThresholdC: 2, wateringReminders: true, greenhouseAlerts: true, weeklyDigest: true },
      },
      weatherHistory: [],
      ...overrides,
    },
  };
}

describe("Data export", () => {
  it("should build valid export data", () => {
    const data = buildExportData();
    expect(data.version).toBe(1);
    expect(data.app).toBe("smallholder");
    expect(data.exportedAt).toBeTruthy();
    expect(Array.isArray(data.data.gardens)).toBe(true);
    expect(Array.isArray(data.data.tasks)).toBe(true);
    expect(Array.isArray(data.data.harvests)).toBe(true);
    expect(data.data.settings).toBeTruthy();
  });

  it("should include all data sections", () => {
    const data = buildExportData();
    expect(data.data).toHaveProperty("gardens");
    expect(data.data).toHaveProperty("tasks");
    expect(data.data).toHaveProperty("harvests");
    expect(data.data).toHaveProperty("journalEntries");
    expect(data.data).toHaveProperty("expenses");
    expect(data.data).toHaveProperty("customPlants");
    expect(data.data).toHaveProperty("seasonArchives");
    expect(data.data).toHaveProperty("weatherHistory");
    expect(data.data).toHaveProperty("settings");
  });
});

describe("Data import validation", () => {
  it("should accept valid export file", () => {
    expect(validateExportFile(makeExport())).toBe(true);
  });

  it("should accept export with data", () => {
    const withData = makeExport({
      gardens: [{ id: "g1", name: "Test", beds: [], season: "2026", createdAt: "", updatedAt: "" }],
      harvests: [{ id: "h1", gardenId: "g1", bedId: "b1", plantId: "tomato", date: "2026-01-01", quality: 3 }],
    });
    expect(validateExportFile(withData)).toBe(true);
  });

  it("should reject null", () => {
    expect(validateExportFile(null)).toBe(false);
  });

  it("should reject empty object", () => {
    expect(validateExportFile({})).toBe(false);
  });

  it("should reject wrong app name", () => {
    expect(validateExportFile({ app: "other", version: 1, data: { gardens: [] } })).toBe(false);
  });

  it("should reject missing data", () => {
    expect(validateExportFile({ app: "smallholder", version: 1 })).toBe(false);
  });

  it("should reject missing gardens array", () => {
    expect(validateExportFile({ app: "smallholder", version: 1, data: {} })).toBe(false);
  });

  it("should still accept pre-fork exports written by upstream gardener", () => {
    expect(validateExportFile({ app: "gardener", version: 1, data: { gardens: [] } })).toBe(true);
  });

  it("should reject string input", () => {
    expect(validateExportFile("string")).toBe(false);
  });

  it("should reject number input", () => {
    expect(validateExportFile(42)).toBe(false);
  });
});

describe("Task round-trip", () => {
  beforeEach(() => {
    useStore.setState({ tasks: [], taskOverlay: [], gardens: [] });
  });

  it("carries manual tasks and task verdicts through export and import", () => {
    useStore.setState({
      tasks: [{ id: "m1", gardenId: "g1", type: "custom", title: "Fix the gate", dueDate: "2026-08-01" }],
      taskOverlay: [{ id: "b1:tomato:2026-06-01:harvest:0", status: "done", updatedAt: "2026-07-27T00:00:00.000Z" }],
    });

    const exported = buildExportData();
    useStore.setState({ tasks: [], taskOverlay: [] });
    importAllData(exported, "overwrite");

    expect(useStore.getState().tasks.map((t) => t.title)).toEqual(["Fix the gate"]);
    expect(useStore.getState().taskOverlay.map((e) => e.id)).toEqual(["b1:tomato:2026-06-01:harvest:0"]);
  });

  it("drops the generated rows an older backup still carries", () => {
    // Pre-v5 exports hold materialized task rows. Those are computed now, so
    // importing one must not resurrect a frozen copy of a stale list.
    const legacy = makeExport({
      tasks: [
        { id: "gen1", gardenId: "g1", plantId: "tomato", bedId: "b1", type: "sow_indoors", title: "Sow Indoors: Tomato", dueDate: "2026-03-20" },
        { id: "own1", gardenId: "g1", type: "custom", title: "Order seeds", dueDate: "2026-02-01" },
      ],
    });

    const result = importAllData(legacy, "overwrite");

    expect(useStore.getState().tasks.map((t) => t.id)).toEqual(["own1"]);
    expect(result.stats.tasks).toBe(1);
  });

  it("does not duplicate a verdict when the same backup is imported twice", () => {
    const exported = makeExport({
      taskOverlay: [{ id: "b1:tomato:2026-06-01:harvest:0", status: "done", updatedAt: "2026-07-27T00:00:00.000Z" }],
    });

    importAllData(exported, "merge");
    importAllData(exported, "merge");

    expect(useStore.getState().taskOverlay).toHaveLength(1);
  });
});
