export type TaskType =
  | "sow_indoors"
  | "sow_outdoors"
  | "transplant"
  | "water"
  | "harvest"
  | "fertilize"
  | "scout"
  | "preserve"
  | "soil_test"
  | "custom";

/**
 * A task the gardener typed in themselves. The only kind that is stored:
 * everything the app works out for itself is computed on render instead.
 */
export interface ManualTask {
  id: string;
  gardenId: string;
  plantId?: string;
  bedId?: string;
  type: TaskType;
  title: string;
  description?: string;
  dueDate: string;
  completedDate?: string;
}

export type TaskStatus = "pending" | "done" | "dismissed";

/**
 * The user's verdict on a computed task. This is the whole of what the store
 * keeps about generated tasks — the tasks themselves are re-derived every
 * render, so a row here outlives nothing but its own key.
 */
export interface TaskOverlayEntry {
  /** The generated task's key. See `plantingTaskKey` in lib/taskGeneration. */
  id: string;
  status: Exclude<TaskStatus, "pending">;
  completedDate?: string;
  updatedAt: string;
}

/**
 * A task worked out from the plantings, the rules and today's date. Never
 * stored, so it carries a translation key rather than a translated string —
 * the old stored tasks were frozen in whatever language generated them.
 */
export interface GeneratedTask {
  id: string;
  gardenId: string;
  bedId: string;
  bedName: string;
  plantId: string;
  type: TaskType;
  cycleIndex: number;
  dueDate: string;
  /** Past this date the task is moot and stops being generated at all. */
  expiresOn: string;
  /** How many plantings this one job covers, for the UI to mention. */
  cellCount: number;
}

/** What every surface renders: manual and generated tasks in one shape. */
export interface TaskItem {
  id: string;
  origin: "manual" | "generated";
  gardenId: string;
  bedId?: string;
  bedName?: string;
  plantId?: string;
  type: TaskType;
  dueDate: string;
  status: TaskStatus;
  completedDate?: string;
  /** Manual tasks carry their own text; generated ones are named at render. */
  title?: string;
  description?: string;
  cellCount?: number;
}
