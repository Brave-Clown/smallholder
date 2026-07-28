import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { useStore } from "@/store";
import { usePlantMap } from "@/hooks/usePlants";
import { usePlantName } from "@/hooks/usePlantName";
import { generateTasks } from "@/lib/taskGeneration";
import type { TaskItem, TaskStatus } from "@/types/task";

/**
 * The whole task list: the gardener's own tasks plus everything the rules
 * produce for today, with their verdicts applied. Generation is a derivation,
 * so it happens here in a memo rather than in a store action.
 */
export function useTasks(): TaskItem[] {
  const { gardens, tasks, taskOverlay, lastFrostDate } = useStore(
    useShallow((s) => ({
      gardens: s.gardens,
      tasks: s.tasks,
      taskOverlay: s.taskOverlay,
      lastFrostDate: s.lastFrostDate,
    }))
  );
  const plantMap = usePlantMap();

  // Whole days, so the list is stable within a day instead of re-deriving on
  // every render with a fresh clock.
  const today = new Date().toISOString().slice(0, 10);

  return useMemo(() => {
    const verdicts = new Map(taskOverlay.map((e) => [e.id, e]));

    const generated: TaskItem[] = generateTasks(gardens, plantMap, {
      today: new Date(`${today}T00:00:00`),
      lastFrostDate,
    }).map((g) => {
      const verdict = verdicts.get(g.id);
      return {
        id: g.id,
        origin: "generated" as const,
        gardenId: g.gardenId,
        bedId: g.bedId,
        bedName: g.bedName,
        plantId: g.plantId,
        type: g.type,
        dueDate: g.dueDate,
        status: (verdict?.status ?? "pending") as TaskStatus,
        completedDate: verdict?.completedDate,
        cellCount: g.cellCount,
      };
    });

    const manual: TaskItem[] = tasks.map((t) => ({
      id: t.id,
      origin: "manual" as const,
      gardenId: t.gardenId,
      bedId: t.bedId,
      plantId: t.plantId,
      type: t.type,
      dueDate: t.dueDate,
      status: t.completedDate ? "done" : "pending",
      completedDate: t.completedDate,
      title: t.title,
      description: t.description,
    }));

    return [...generated, ...manual].sort(
      (a, b) => a.dueDate.localeCompare(b.dueDate) || a.id.localeCompare(b.id)
    );
  }, [gardens, tasks, taskOverlay, plantMap, lastFrostDate, today]);
}

/**
 * Names a task. Generated tasks have no stored text, so every surface has to
 * build the same one — hence a shared resolver rather than each component's
 * own. It also means the list follows the UI language instead of whatever
 * language happened to be active when a task was created.
 */
export function useTaskTitle(): (task: TaskItem) => string {
  const { t } = useTranslation();
  const getPlantName = usePlantName();

  return useCallback((task: TaskItem) => {
    if (task.origin === "manual") return task.title ?? "";
    const plant = task.plantId ? getPlantName(task.plantId) : "";
    return task.bedName ? t("calendar.taskFor", { plant, bed: task.bedName }) : plant;
  }, [t, getPlantName]);
}
