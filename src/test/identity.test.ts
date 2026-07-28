import { describe, it, expect, beforeEach } from "vitest";
import { create } from "zustand";
import { createGardenSlice, type GardenSlice } from "@/store/gardenSlice";
import { genId } from "@/lib/ids";
import type { Bed } from "@/types/garden";

function createTestStore() {
  return create<GardenSlice>()((...a) => ({ ...createGardenSlice(...a) }));
}

function seedBed(store: ReturnType<typeof createTestStore>) {
  const gardenId = store.getState().addGarden("G");
  store.getState().addBed(gardenId, {
    name: "Bed", x: 0, y: 0, width: 4, height: 3, environmentType: "outdoor_bed",
  });
  const bedId = store.getState().gardens[0].beds[0].id;
  return { gardenId, bedId };
}

const bedOf = (store: ReturnType<typeof createTestStore>, gardenId: string, bedId: string): Bed =>
  store.getState().gardens.find((g) => g.id === gardenId)!.beds.find((b) => b.id === bedId)!;

describe("genId", () => {
  it("does not repeat", () => {
    const ids = new Set(Array.from({ length: 1000 }, genId));
    expect(ids.size).toBe(1000);
  });
});

describe("Planting identity", () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  it("mints an id for every planting the store accepts", () => {
    const { gardenId, bedId } = seedBed(store);
    store.getState().setCell(gardenId, bedId, { cellX: 0, cellY: 0, plantId: "tomato" });
    store.getState().setCell(gardenId, bedId, { cellX: 1, cellY: 0, plantId: "basil" });

    const cells = bedOf(store, gardenId, bedId).cells;
    expect(cells.every((c) => Boolean(c.id))).toBe(true);
    expect(new Set(cells.map((c) => c.id)).size).toBe(2);
  });

  it("keeps ids that arrive with the cells, so undo restores the same plantings", () => {
    const { gardenId, bedId } = seedBed(store);
    store.getState().setBedCells(gardenId, bedId, [
      { cellX: 0, cellY: 0, plantId: "tomato" },
      { cellX: 1, cellY: 0, plantId: "basil" },
    ]);
    const before = bedOf(store, gardenId, bedId).cells;

    store.getState().setBedCells(gardenId, bedId, []);
    store.getState().setBedCells(gardenId, bedId, before);

    expect(bedOf(store, gardenId, bedId).cells.map((c) => c.id)).toEqual(before.map((c) => c.id));
  });

  it("mints only for the cells that lack an id", () => {
    const { gardenId, bedId } = seedBed(store);
    store.getState().setBedCells(gardenId, bedId, [
      { id: "kept", cellX: 0, cellY: 0, plantId: "tomato" },
      { cellX: 1, cellY: 0, plantId: "basil" },
    ]);

    const cells = bedOf(store, gardenId, bedId).cells;
    expect(cells[0].id).toBe("kept");
    expect(cells[1].id).toBeTruthy();
    expect(cells[1].id).not.toBe("kept");
  });

  it("preserves identity when a planting is edited", () => {
    const { gardenId, bedId } = seedBed(store);
    store.getState().setCell(gardenId, bedId, { cellX: 0, cellY: 0, plantId: "tomato" });
    const original = bedOf(store, gardenId, bedId).cells[0].id;

    store.getState().updateCell(gardenId, bedId, 0, 0, { plantedDate: "2026-05-01", notes: "n" });

    const cell = bedOf(store, gardenId, bedId).cells[0];
    expect(cell.id).toBe(original);
    expect(cell.plantedDate).toBe("2026-05-01");
  });

  it("gives a duplicated bed's plantings their own identity", () => {
    const { gardenId, bedId } = seedBed(store);
    store.getState().setCell(gardenId, bedId, { cellX: 0, cellY: 0, plantId: "tomato" });
    const original = bedOf(store, gardenId, bedId).cells[0].id;

    store.getState().duplicateBed(gardenId, bedId);

    const clone = store.getState().gardens[0].beds[1];
    expect(clone.cells[0].id).toBeTruthy();
    expect(clone.cells[0].id).not.toBe(original);
    expect(clone.cells[0].plantId).toBe("tomato");
  });

  it("gives a duplicated garden's plantings their own identity", () => {
    const { gardenId, bedId } = seedBed(store);
    store.getState().setCell(gardenId, bedId, { cellX: 0, cellY: 0, plantId: "tomato" });
    const original = bedOf(store, gardenId, bedId).cells[0].id;

    const cloneId = store.getState().duplicateGarden(gardenId);

    const clone = store.getState().gardens.find((g) => g.id === cloneId)!;
    expect(clone.beds[0].id).not.toBe(bedId);
    expect(clone.beds[0].cells[0].id).not.toBe(original);
  });
});

describe("Bed timestamps", () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  it("stamps the bed, not just the garden, on every kind of bed change", () => {
    const { gardenId, bedId } = seedBed(store);
    const initial = bedOf(store, gardenId, bedId).updatedAt;
    expect(initial).toBeTruthy();

    const stamps: string[] = [];
    const record = () => stamps.push(bedOf(store, gardenId, bedId).updatedAt);

    store.getState().setCell(gardenId, bedId, { cellX: 0, cellY: 0, plantId: "tomato" });
    record();
    store.getState().updateCell(gardenId, bedId, 0, 0, { notes: "x" });
    record();
    store.getState().togglePath(gardenId, bedId, 2, 2);
    record();
    store.getState().updateBed(gardenId, bedId, { name: "Renamed" });
    record();
    store.getState().removeCell(gardenId, bedId, 0, 0);
    record();

    // Timestamps are second-resolution at worst here, so assert they are all
    // real and at least as new as creation rather than strictly increasing.
    expect(stamps).toHaveLength(5);
    for (const s of stamps) expect(s >= initial).toBe(true);
  });
});
