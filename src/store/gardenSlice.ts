import type { StateCreator } from "zustand";
import type { Garden, Bed, CellPlanting, CellPlantingDraft } from "@/types/garden";
import { genId } from "@/lib/ids";

export interface GardenSlice {
  gardens: Garden[];
  activeGardenId: string | null;
  addGarden: (name: string) => string;
  deleteGarden: (id: string) => void;
  setActiveGarden: (id: string | null) => void;
  addBed: (gardenId: string, bed: Omit<Bed, "id" | "cells" | "updatedAt">) => void;
  updateBed: (gardenId: string, bedId: string, updates: Partial<Bed>) => void;
  deleteBed: (gardenId: string, bedId: string) => void;
  setCell: (gardenId: string, bedId: string, cell: CellPlantingDraft) => void;
  setBedCells: (gardenId: string, bedId: string, cells: CellPlantingDraft[]) => void;
  updateCell: (gardenId: string, bedId: string, cellX: number, cellY: number, updates: Partial<CellPlanting>) => void;
  removeCell: (gardenId: string, bedId: string, cellX: number, cellY: number) => void;
  togglePath: (gardenId: string, bedId: string, cellX: number, cellY: number) => void;
  duplicateGarden: (gardenId: string) => string;
  duplicateBed: (gardenId: string, bedId: string) => void;
}

const now = () => new Date().toISOString();

const withId = (cell: CellPlantingDraft): CellPlanting => ({ ...cell, id: cell.id ?? genId() });

/** Clones are new plantings, so they must not inherit the original's identity. */
const reidentify = (cells: CellPlanting[]): CellPlanting[] =>
  cells.map((c) => ({ ...c, id: genId() }));

/**
 * Every bed mutation routes through here so the garden's and the bed's
 * timestamps cannot drift apart, and no path can forget to stamp one.
 */
function mutateBed(
  gardens: Garden[],
  gardenId: string,
  bedId: string,
  fn: (bed: Bed) => Bed,
): Garden[] {
  const stamp = now();
  return gardens.map((g) =>
    g.id === gardenId
      ? {
          ...g,
          beds: g.beds.map((b) => (b.id === bedId ? { ...fn(b), updatedAt: stamp } : b)),
          updatedAt: stamp,
        }
      : g
  );
}

export const createGardenSlice: StateCreator<GardenSlice> = (set) => ({
  gardens: [],
  activeGardenId: null,

  addGarden: (name) => {
    const id = genId();
    set((state) => ({
      gardens: [
        ...state.gardens,
        { id, name, beds: [], season: String(new Date().getFullYear()), createdAt: now(), updatedAt: now() },
      ],
      activeGardenId: id,
    }));
    return id;
  },

  deleteGarden: (id) =>
    set((state) => ({
      gardens: state.gardens.filter((g) => g.id !== id),
      activeGardenId: state.activeGardenId === id ? null : state.activeGardenId,
    })),

  setActiveGarden: (id) => set({ activeGardenId: id }),

  addBed: (gardenId, bed) =>
    set((state) => ({
      gardens: state.gardens.map((g) =>
        g.id === gardenId
          ? { ...g, beds: [...g.beds, { ...bed, id: genId(), cells: [], updatedAt: now() }], updatedAt: now() }
          : g
      ),
    })),

  updateBed: (gardenId, bedId, updates) =>
    set((state) => ({
      gardens: mutateBed(state.gardens, gardenId, bedId, (b) => ({ ...b, ...updates })),
    })),

  deleteBed: (gardenId, bedId) =>
    set((state) => ({
      gardens: state.gardens.map((g) =>
        g.id === gardenId
          ? { ...g, beds: g.beds.filter((b) => b.id !== bedId), updatedAt: now() }
          : g
      ),
    })),

  setCell: (gardenId, bedId, cell) =>
    set((state) => ({
      gardens: mutateBed(state.gardens, gardenId, bedId, (b) => ({
        ...b,
        cells: [
          ...b.cells.filter((c) => !(c.cellX === cell.cellX && c.cellY === cell.cellY)),
          withId(cell),
        ],
      })),
    })),

  // Replace a bed's plantings wholesale. Bulk fills use this so the whole bed
  // lands in one store update, and so undo can restore the previous array —
  // which is why an incoming id is kept rather than replaced.
  setBedCells: (gardenId, bedId, cells) =>
    set((state) => ({
      gardens: mutateBed(state.gardens, gardenId, bedId, (b) => ({
        ...b,
        cells: cells.map(withId),
      })),
    })),

  updateCell: (gardenId, bedId, cellX, cellY, updates) =>
    set((state) => ({
      gardens: mutateBed(state.gardens, gardenId, bedId, (b) => ({
        ...b,
        cells: b.cells.map((c) =>
          c.cellX === cellX && c.cellY === cellY ? { ...c, ...updates, id: c.id } : c
        ),
      })),
    })),

  removeCell: (gardenId, bedId, cellX, cellY) =>
    set((state) => ({
      gardens: mutateBed(state.gardens, gardenId, bedId, (b) => ({
        ...b,
        cells: b.cells.filter((c) => !(c.cellX === cellX && c.cellY === cellY)),
      })),
    })),

  togglePath: (gardenId, bedId, cellX, cellY) =>
    set((state) => ({
      gardens: mutateBed(state.gardens, gardenId, bedId, (b) => {
        const key = `${cellX}-${cellY}`;
        const paths = new Set(b.paths ?? []);
        if (paths.has(key)) {
          paths.delete(key);
        } else {
          paths.add(key);
        }
        // Remove any plant on this cell when adding a path
        const cells = paths.has(key)
          ? b.cells.filter((c) => !(c.cellX === cellX && c.cellY === cellY))
          : b.cells;
        return { ...b, paths: Array.from(paths), cells };
      }),
    })),

  duplicateGarden: (gardenId) => {
    const id = genId();
    set((state) => {
      const source = state.gardens.find((g) => g.id === gardenId);
      if (!source) return state;
      const clone: Garden = {
        ...JSON.parse(JSON.stringify(source)),
        id,
        name: `${source.name} (copy)`,
        beds: source.beds.map((b) => {
          const copy: Bed = JSON.parse(JSON.stringify(b));
          return { ...copy, id: genId(), cells: reidentify(copy.cells), updatedAt: now() };
        }),
        createdAt: now(),
        updatedAt: now(),
      };
      return { gardens: [...state.gardens, clone], activeGardenId: id };
    });
    return id;
  },

  duplicateBed: (gardenId, bedId) =>
    set((state) => ({
      gardens: state.gardens.map((g) => {
        if (g.id !== gardenId) return g;
        const source = g.beds.find((b) => b.id === bedId);
        if (!source) return g;
        const copy: Bed = JSON.parse(JSON.stringify(source));
        const clone: Bed = {
          ...copy,
          id: genId(),
          name: `${source.name} (copy)`,
          y: g.beds.length,
          cells: reidentify(copy.cells),
          updatedAt: now(),
        };
        return { ...g, beds: [...g.beds, clone], updatedAt: now() };
      }),
    })),
});
