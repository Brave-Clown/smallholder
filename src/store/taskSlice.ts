import type { StateCreator } from "zustand";
import type { ManualTask, TaskOverlayEntry, TaskStatus } from "@/types/task";
import { genId } from "@/lib/ids";
import { taskGroupKey } from "@/lib/taskGeneration";

/**
 * Generated tasks are not stored — see lib/taskGeneration. What lives here is
 * the tasks the gardener wrote themselves, plus their verdict on the computed
 * ones.
 */
export interface TaskSlice {
  tasks: ManualTask[];
  taskOverlay: TaskOverlayEntry[];
  addTask: (task: Omit<ManualTask, "id">) => void;
  updateTask: (id: string, updates: Partial<ManualTask>) => void;
  deleteTask: (id: string) => void;
  setTaskDone: (id: string, done: boolean) => void;
  setTaskStatus: (key: string, status: Exclude<TaskStatus, "pending">) => void;
  clearTaskStatus: (key: string) => void;
  /** Drops verdicts about plantings that no longer exist. */
  pruneTaskOverlay: (liveGroupKeys: Set<string>) => void;
}

export const createTaskSlice: StateCreator<TaskSlice> = (set) => ({
  tasks: [],
  taskOverlay: [],

  addTask: (task) =>
    set((state) => ({
      tasks: [...state.tasks, { ...task, id: genId() }],
    })),

  updateTask: (id, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),

  deleteTask: (id) =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
    })),

  // Ticking a manual task has to be as reversible as ticking a computed one.
  // It used to be one-way, so a mis-tick could only be fixed by deleting the
  // task and typing it again.
  setTaskDone: (id, done) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, completedDate: done ? new Date().toISOString() : undefined } : t
      ),
    })),

  setTaskStatus: (key, status) =>
    set((state) => {
      const entry: TaskOverlayEntry = {
        id: key,
        status,
        updatedAt: new Date().toISOString(),
        ...(status === "done" ? { completedDate: new Date().toISOString() } : {}),
      };
      return {
        taskOverlay: [...state.taskOverlay.filter((e) => e.id !== key), entry],
      };
    }),

  clearTaskStatus: (key) =>
    set((state) => ({
      taskOverlay: state.taskOverlay.filter((e) => e.id !== key),
    })),

  // Verdicts outlive the plantings they were about: a bed gets cleared, a crop
  // is pulled. Matched on the planting group rather than the task key, so a
  // verdict is not thrown away merely because its task sits beyond today's
  // horizon. Run once at startup — this is a store write, and generation is a
  // render-time derivation.
  pruneTaskOverlay: (liveGroupKeys) =>
    set((state) => {
      const kept = state.taskOverlay.filter((e) => liveGroupKeys.has(taskGroupKey(e.id)));
      return kept.length === state.taskOverlay.length ? {} : { taskOverlay: kept };
    }),
});
