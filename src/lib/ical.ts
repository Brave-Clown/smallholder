import type { TaskItem } from "@/types/task";

function escapeIcal(str: string): string {
  return str.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
}

function formatIcalDate(dateStr: string): string {
  return dateStr.replace(/-/g, "");
}

/**
 * Generated tasks carry no text of their own, so the caller supplies the same
 * naming the list uses. Their id is a stable key rather than a fresh row id,
 * which means re-exporting updates the existing calendar entries instead of
 * duplicating every one of them.
 */
export function tasksToIcal(
  tasks: TaskItem[],
  titleOf: (task: TaskItem) => string,
  calendarName: string = "Smallholder",
): string {
  const now = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const events = tasks
    .filter((t) => t.status === "pending")
    .map((task) => {
      const dtStart = formatIcalDate(task.dueDate);
      // All-day event: DTEND is next day
      const endDate = new Date(task.dueDate);
      endDate.setDate(endDate.getDate() + 1);
      const dtEnd = formatIcalDate(endDate.toISOString().slice(0, 10));

      return [
        "BEGIN:VEVENT",
        `UID:${task.id}@smallholder`,
        `DTSTAMP:${now}`,
        `DTSTART;VALUE=DATE:${dtStart}`,
        `DTEND;VALUE=DATE:${dtEnd}`,
        `SUMMARY:${escapeIcal(titleOf(task))}`,
        task.description ? `DESCRIPTION:${escapeIcal(task.description)}` : "",
        `CATEGORIES:${task.type}`,
        "END:VEVENT",
      ].filter(Boolean).join("\r\n");
    });

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Smallholder//Self-Sufficiency Planner//EN",
    `X-WR-CALNAME:${escapeIcal(calendarName)}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadIcal(
  tasks: TaskItem[],
  titleOf: (task: TaskItem) => string,
  filename: string = "smallholder-tasks.ics",
): void {
  const ical = tasksToIcal(tasks, titleOf);
  const blob = new Blob([ical], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
