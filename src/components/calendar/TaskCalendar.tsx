import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Check, Download, Trash2, Filter, X, Undo2 } from "lucide-react";
import { useStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { usePlantMap } from "@/hooks/usePlants";
import { useTasks, useTaskTitle } from "@/hooks/useTasks";
import { PlantIconDisplay } from "@/components/ui/PlantIconDisplay";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import type { TaskItem, TaskType } from "@/types/task";
import { downloadIcal } from "@/lib/ical";
import { format, isAfter, isBefore, startOfWeek, endOfWeek, parseISO } from "date-fns";

const taskTypeColors: Record<TaskType, string> = {
  sow_indoors: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  sow_outdoors: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  transplant: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  water: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  harvest: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  fertilize: "bg-earth-100 text-earth-700 dark:bg-earth-700/30 dark:text-earth-300",
  scout: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  preserve: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  soil_test: "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-400",
  custom: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

const taskTypes: TaskType[] = ["sow_indoors", "sow_outdoors", "transplant", "water", "harvest", "fertilize", "scout", "preserve", "soil_test", "custom"];

type ViewFilter = "active" | "overdue" | "thisWeek" | "upcoming" | "completed" | "all";
type TypeFilter = "all" | TaskType;

export function TaskCalendar() {
  const { t } = useTranslation();
  const { toast, confirm } = useToast();
  const { gardens, addTask, setTaskDone, deleteTask, setTaskStatus, clearTaskStatus } = useStore(
    useShallow((s) => ({
      gardens: s.gardens,
      addTask: s.addTask, setTaskDone: s.setTaskDone, deleteTask: s.deleteTask,
      setTaskStatus: s.setTaskStatus, clearTaskStatus: s.clearTaskStatus,
    }))
  );
  const tasks = useTasks();
  const plantMap = usePlantMap();
  const titleOf = useTaskTitle();
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<TaskType>("custom");
  const [newDate, setNewDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [viewFilter, setViewFilter] = useState<ViewFilter>("active");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [showFilters, setShowFilters] = useState(false);
  // Tasks acted on during this visit, kept on screen so the action can be
  // taken back. Component state on purpose: leaving the page clears it.
  const [stickyIds, setStickyIds] = useState<Set<string>>(() => new Set());

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  // A dismissed task is the gardener saying "not this one" — it leaves the list
  // rather than sitting in it as a done-but-not-done row. Unless it was
  // dismissed just now, in which case it stays put so the click can be undone.
  const visible = useMemo(
    () => tasks.filter((t) => t.status !== "dismissed" || stickyIds.has(t.id)),
    [tasks, stickyIds]
  );

  // Counts report the truth, not what is on screen: a task kept visible after
  // being ticked is still done, and says so by being struck through.
  const counts = useMemo(() => {
    const open = visible.filter((t) => t.status === "pending");
    return {
      overdue: open.filter((t) => isBefore(parseISO(t.dueDate), weekStart)).length,
      thisWeek: open.filter((t) => !isBefore(parseISO(t.dueDate), weekStart) && !isAfter(parseISO(t.dueDate), weekEnd)).length,
      upcoming: open.filter((t) => isAfter(parseISO(t.dueDate), weekEnd)).length,
      completed: visible.filter((t) => t.status === "done").length,
      active: open.length,
      all: visible.length,
    };
  }, [visible, weekStart, weekEnd]);

  const filtered = useMemo(() => {
    let list = [...visible];
    // Still-open tasks, plus anything acted on this visit so it can be undone.
    const open = (t: TaskItem) => t.status === "pending" || stickyIds.has(t.id);

    if (viewFilter === "active") list = list.filter(open);
    else if (viewFilter === "overdue") list = list.filter((t) => open(t) && isBefore(parseISO(t.dueDate), weekStart));
    else if (viewFilter === "thisWeek") list = list.filter((t) => open(t) && !isBefore(parseISO(t.dueDate), weekStart) && !isAfter(parseISO(t.dueDate), weekEnd));
    else if (viewFilter === "upcoming") list = list.filter((t) => open(t) && isAfter(parseISO(t.dueDate), weekEnd));
    else if (viewFilter === "completed") list = list.filter((t) => t.status === "done");

    if (typeFilter !== "all") list = list.filter((t) => t.type === typeFilter);

    list.sort((a, b) => {
      if (a.status === "done" && b.status !== "done") return 1;
      if (a.status !== "done" && b.status === "done") return -1;
      return a.dueDate.localeCompare(b.dueDate);
    });

    return list;
  }, [visible, viewFilter, typeFilter, weekStart, weekEnd, stickyIds]);

  const toggleDone = (task: TaskItem) => {
    const done = task.status === "done";

    // Ticking something makes it leave the list it was ticked in, which is
    // where an accidental tick becomes unfixable without hunting for the
    // Completed filter. Keep it on screen, struck through, for this visit.
    setStickyIds((prev) => {
      const next = new Set(prev);
      if (done) next.delete(task.id);
      else next.add(task.id);
      return next;
    });

    if (task.origin === "manual") setTaskDone(task.id, !done);
    else if (done) clearTaskStatus(task.id);
    else setTaskStatus(task.id, "done");
  };

  const toggleDismissed = (task: TaskItem) => {
    if (task.status === "dismissed") {
      clearTaskStatus(task.id);
      return;
    }
    setStickyIds((prev) => new Set(prev).add(task.id));
    setTaskStatus(task.id, "dismissed");
    toast(t("calendar.dismissed"), "success");
  };

  const handleAddTask = () => {
    if (!newTitle.trim()) return;
    addTask({ gardenId: gardens[0]?.id ?? "", type: newType, title: newTitle.trim(), dueDate: newDate });
    setNewTitle("");
    setShowAddTask(false);
  };

  const isOverdue = (task: TaskItem) => task.status !== "done" && isBefore(parseISO(task.dueDate), weekStart);
  const isThisWeek = (task: TaskItem) => task.status !== "done" && !isBefore(parseISO(task.dueDate), weekStart) && !isAfter(parseISO(task.dueDate), weekEnd);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("nav.tasks")}</h1>
        <div className="flex gap-2">
          {visible.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => downloadIcal(visible, titleOf)} title="iCal">
              <Download size={16} />
            </Button>
          )}
          <Button size="sm" onClick={() => setShowAddTask(true)}>
            <Plus size={16} />
            {t("calendar.addTask")}
          </Button>
        </div>
      </div>

      {/* Stats row */}
      {visible.length > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {([
            { key: "active" as ViewFilter, count: counts.active, color: "text-garden-600", label: t("calendar.active") },
            { key: "overdue" as ViewFilter, count: counts.overdue, color: "text-red-600", label: t("calendar.overdue") },
            { key: "thisWeek" as ViewFilter, count: counts.thisWeek, color: "text-blue-600", label: t("calendar.thisWeek") },
            { key: "upcoming" as ViewFilter, count: counts.upcoming, color: "text-gray-600", label: t("calendar.upcoming") },
            { key: "completed" as ViewFilter, count: counts.completed, color: "text-green-600", label: t("calendar.completed") },
          ]).map((s) => (
            <button
              key={s.key}
              onClick={() => setViewFilter(s.key)}
              className={`rounded-lg border p-2 text-center transition-colors ${
                viewFilter === s.key
                  ? "border-garden-400 bg-garden-50 dark:border-garden-600 dark:bg-garden-900/20"
                  : "border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
              }`}
            >
              <p className={`text-lg font-bold ${s.color}`}>{s.count}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </button>
          ))}
        </div>
      )}

      {/* Type filter */}
      {visible.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-1">
          <button onClick={() => setShowFilters(!showFilters)} className="mr-1 text-gray-400 hover:text-gray-600">
            <Filter size={14} />
          </button>
          {(showFilters || typeFilter !== "all") && (
            <>
              <button
                onClick={() => setTypeFilter("all")}
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeFilter === "all" ? "bg-garden-100 text-garden-700 dark:bg-garden-900/40" : "bg-gray-100 text-gray-500 dark:bg-gray-800"}`}
              >
                {t("plants.allCategories")}
              </button>
              {taskTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setTypeFilter(typeFilter === type ? "all" : type)}
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeFilter === type ? taskTypeColors[type] : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}
                >
                  {t(`calendar.taskTypes.${type}`)}
                </button>
              ))}
            </>
          )}
        </div>
      )}

      {/* Task list */}
      {filtered.length === 0 ? (
        <Card>
          <p className="text-center text-gray-500">
            {visible.length === 0 ? t("calendar.noTasks") : t("common.noResults")}
          </p>
        </Card>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((task) => {
            const plant = task.plantId ? plantMap.get(task.plantId) : undefined;
            const overdue = isOverdue(task);
            const thisWeek = isThisWeek(task);
            const done = task.status === "done";
            const settled = task.status !== "pending";
            return (
              <div
                key={task.id}
                className={`flex items-center gap-3 rounded-lg border bg-white p-3 transition-colors dark:bg-gray-900 ${
                  settled
                    ? "border-gray-100 opacity-50 dark:border-gray-800"
                    : overdue
                      ? "border-red-200 dark:border-red-900"
                      : thisWeek
                        ? "border-blue-200 dark:border-blue-900"
                        : "border-gray-200 dark:border-gray-700"
                }`}
              >
                <button
                  onClick={() => toggleDone(task)}
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    done
                      ? "border-green-500 bg-green-500 text-white"
                      : "border-gray-300 hover:border-garden-500"
                  }`}
                >
                  {done && <Check size={12} />}
                </button>

                {plant && <PlantIconDisplay plantId={plant.id} emoji={plant.icon} size={16} />}

                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium ${settled ? "line-through text-gray-400" : ""}`}>{titleOf(task)}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span className={overdue && !settled ? "font-medium text-red-500" : ""}>{task.dueDate}</span>
                    {task.estimated && <span title={t("calendar.estimatedHint")}>{t("calendar.estimated")}</span>}
                    {overdue && !settled && <span className="text-red-500">{t("calendar.overdue")}</span>}
                    {task.cellCount !== undefined && task.cellCount > 1 && (
                      <span>{t("calendar.squares", { count: task.cellCount })}</span>
                    )}
                  </div>
                </div>

                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${taskTypeColors[task.type]}`}>
                  {t(`calendar.taskTypes.${task.type}`)}
                </span>

                {task.origin === "manual" ? (
                  <button
                    onClick={async () => { if (await confirm(t("common.confirmDelete"))) deleteTask(task.id); }}
                    className="shrink-0 rounded p-1 text-gray-300 hover:text-red-500"
                    title={t("common.delete")}
                  >
                    <Trash2 size={13} />
                  </button>
                ) : (
                  <button
                    onClick={() => toggleDismissed(task)}
                    className="shrink-0 rounded p-1 text-gray-300 hover:text-gray-600"
                    title={task.status === "dismissed" ? t("calendar.undismiss") : t("calendar.dismiss")}
                  >
                    {task.status === "dismissed" ? <Undo2 size={13} /> : <X size={13} />}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={showAddTask} onClose={() => setShowAddTask(false)} title={t("calendar.addTask")}>
        <div className="space-y-4">
          <Input label={t("calendar.taskTitle")} value={newTitle} onChange={(e) => setNewTitle(e.target.value)} autoFocus />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("calendar.taskType")}</label>
            <div className="flex flex-wrap gap-2">
              {taskTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setNewType(type)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    newType === type ? taskTypeColors[type] + " ring-2 ring-offset-1 ring-garden-500" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  {t(`calendar.taskTypes.${type}`)}
                </button>
              ))}
            </div>
          </div>
          <Input label={t("calendar.taskDate")} type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowAddTask(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleAddTask}>{t("common.add")}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
