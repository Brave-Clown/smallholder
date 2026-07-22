import { describe, it, expect, beforeEach } from "vitest";
import { create } from "zustand";
import { createSettingsSlice, type SettingsSlice } from "@/store/settingsSlice";
import { createGardenSlice, type GardenSlice } from "@/store/gardenSlice";
import { createTaskSlice, type TaskSlice } from "@/store/taskSlice";

type TestStore = SettingsSlice & GardenSlice & TaskSlice;

function createTestStore() {
  return create<TestStore>()((...a) => ({
    ...createSettingsSlice(...a),
    ...createGardenSlice(...a),
    ...createTaskSlice(...a),
  }));
}

describe("Zustand store", () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  describe("Garden operations", () => {
    it("should add a garden", () => {
      const id = store.getState().addGarden("Test Garden");
      expect(id).toBeTruthy();
      expect(store.getState().gardens).toHaveLength(1);
      expect(store.getState().gardens[0].name).toBe("Test Garden");
      expect(store.getState().activeGardenId).toBe(id);
    });

    it("should delete a garden", () => {
      const id = store.getState().addGarden("Test");
      store.getState().deleteGarden(id);
      expect(store.getState().gardens).toHaveLength(0);
      expect(store.getState().activeGardenId).toBeNull();
    });

    it("should add a bed to a garden", () => {
      const gardenId = store.getState().addGarden("Test");
      store.getState().addBed(gardenId, {
        name: "Bed 1",
        x: 0,
        y: 0,
        width: 4,
        height: 3,
        environmentType: "outdoor_bed" as const,
      });
      const garden = store.getState().gardens[0];
      expect(garden.beds).toHaveLength(1);
      expect(garden.beds[0].name).toBe("Bed 1");
      expect(garden.beds[0].width).toBe(4);
      expect(garden.beds[0].cells).toHaveLength(0);
    });

    it("should set and remove cells in a bed", () => {
      const gardenId = store.getState().addGarden("Test");
      store.getState().addBed(gardenId, { name: "B", x: 0, y: 0, width: 3, height: 3, environmentType: "outdoor_bed" as const });
      const bedId = store.getState().gardens[0].beds[0].id;

      store.getState().setCell(gardenId, bedId, { cellX: 0, cellY: 0, plantId: "tomato" });
      store.getState().setCell(gardenId, bedId, { cellX: 1, cellY: 0, plantId: "basil" });

      let bed = store.getState().gardens[0].beds[0];
      expect(bed.cells).toHaveLength(2);

      store.getState().removeCell(gardenId, bedId, 0, 0);
      bed = store.getState().gardens[0].beds[0];
      expect(bed.cells).toHaveLength(1);
      expect(bed.cells[0].plantId).toBe("basil");
    });

    it("should overwrite a cell when placing in same position", () => {
      const gardenId = store.getState().addGarden("Test");
      store.getState().addBed(gardenId, { name: "B", x: 0, y: 0, width: 3, height: 3, environmentType: "outdoor_bed" as const });
      const bedId = store.getState().gardens[0].beds[0].id;

      store.getState().setCell(gardenId, bedId, { cellX: 0, cellY: 0, plantId: "tomato" });
      store.getState().setCell(gardenId, bedId, { cellX: 0, cellY: 0, plantId: "basil" });

      const bed = store.getState().gardens[0].beds[0];
      expect(bed.cells).toHaveLength(1);
      expect(bed.cells[0].plantId).toBe("basil");
    });

    it("should replace a bed's cells wholesale and let a snapshot restore them", () => {
      const gardenId = store.getState().addGarden("Test");
      store.getState().addBed(gardenId, { name: "B", x: 0, y: 0, width: 3, height: 3, environmentType: "outdoor_bed" as const });
      const bedId = store.getState().gardens[0].beds[0].id;

      store.getState().setCell(gardenId, bedId, { cellX: 0, cellY: 0, plantId: "tomato" });
      const before = store.getState().gardens[0].beds[0].cells;

      // a bulk fill lands in one update
      store.getState().setBedCells(gardenId, bedId, [
        { cellX: 0, cellY: 0, plantId: "corn" },
        { cellX: 1, cellY: 1, plantId: "bean" },
      ]);
      expect(store.getState().gardens[0].beds[0].cells).toHaveLength(2);

      // ...and undo restores exactly what was there before
      store.getState().setBedCells(gardenId, bedId, before);
      const restored = store.getState().gardens[0].beds[0].cells;
      expect(restored).toHaveLength(1);
      expect(restored[0].plantId).toBe("tomato");
    });

    it("should not let the caller mutate stored cells through the array it passed", () => {
      const gardenId = store.getState().addGarden("Test");
      store.getState().addBed(gardenId, { name: "B", x: 0, y: 0, width: 3, height: 3, environmentType: "outdoor_bed" as const });
      const bedId = store.getState().gardens[0].beds[0].id;

      const input = [{ cellX: 0, cellY: 0, plantId: "tomato" }];
      store.getState().setBedCells(gardenId, bedId, input);
      input.push({ cellX: 1, cellY: 1, plantId: "basil" });

      expect(store.getState().gardens[0].beds[0].cells).toHaveLength(1);
    });
  });

  describe("Task operations", () => {
    it("should add and complete a task", () => {
      store.getState().addTask({
        gardenId: "g1",
        type: "custom",
        title: "Water tomatoes",
        dueDate: "2026-05-01",
      });
      expect(store.getState().tasks).toHaveLength(1);
      expect(store.getState().tasks[0].completedDate).toBeUndefined();

      const taskId = store.getState().tasks[0].id;
      store.getState().completeTask(taskId);
      expect(store.getState().tasks[0].completedDate).toBeTruthy();
    });

    it("should delete a task", () => {
      store.getState().addTask({
        gardenId: "g1",
        type: "harvest",
        title: "Harvest carrots",
        dueDate: "2026-08-15",
      });
      const taskId = store.getState().tasks[0].id;
      store.getState().deleteTask(taskId);
      expect(store.getState().tasks).toHaveLength(0);
    });
  });

  describe("Settings", () => {
    it("should update locale", () => {
      store.getState().setLocale("en");
      expect(store.getState().locale).toBe("en");
      store.getState().setLocale("de");
      expect(store.getState().locale).toBe("de");
    });

    it("should update location", () => {
      store.getState().setLocation(48.1351, 11.582, "Munich");
      expect(store.getState().locationLat).toBe(48.1351);
      expect(store.getState().locationLon).toBe(11.582);
      expect(store.getState().locationName).toBe("Munich");
    });
  });
});
