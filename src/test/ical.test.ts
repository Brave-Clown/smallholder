import { describe, it, expect } from "vitest";
import { tasksToIcal } from "@/lib/ical";
import type { TaskItem } from "@/types/task";

describe("iCal export", () => {
  const tasks: TaskItem[] = [
    {
      id: "t1",
      origin: "manual",
      gardenId: "g1",
      type: "sow_outdoors",
      title: "Sow Carrots",
      dueDate: "2026-05-15",
      status: "pending",
    },
    {
      id: "t2",
      origin: "manual",
      gardenId: "g1",
      type: "harvest",
      title: "Harvest Tomatoes",
      description: "Check for ripe ones",
      dueDate: "2026-08-20",
      status: "done",
      completedDate: "2026-08-20",
    },
    {
      id: "bed1:tomato:2026-06-01:harvest:0",
      origin: "generated",
      gardenId: "g1",
      bedId: "bed1",
      bedName: "Bed 1",
      plantId: "tomato",
      type: "harvest",
      dueDate: "2026-08-01",
      status: "pending",
    },
  ];

  const titleOf = (task: TaskItem) =>
    task.origin === "manual" ? task.title! : `${task.plantId} - ${task.bedName}`;

  it("should generate valid iCal format", () => {
    const ical = tasksToIcal(tasks, titleOf);
    expect(ical).toContain("BEGIN:VCALENDAR");
    expect(ical).toContain("END:VCALENDAR");
    expect(ical).toContain("VERSION:2.0");
    expect(ical).toContain("PRODID:-//Smallholder");
  });

  it("should only include incomplete tasks", () => {
    const ical = tasksToIcal(tasks, titleOf);
    expect(ical).toContain("Sow Carrots");
    expect(ical).not.toContain("Harvest Tomatoes"); // completed
  });

  it("should format dates correctly", () => {
    const ical = tasksToIcal(tasks, titleOf);
    expect(ical).toContain("DTSTART;VALUE=DATE:20260515");
    expect(ical).toContain("DTEND;VALUE=DATE:20260516"); // next day
  });

  it("should include task category", () => {
    const ical = tasksToIcal(tasks, titleOf);
    expect(ical).toContain("CATEGORIES:sow_outdoors");
  });

  it("names generated tasks the same way the list does", () => {
    const ical = tasksToIcal(tasks, titleOf);
    expect(ical).toContain("SUMMARY:tomato - Bed 1");
  });

  // A generated task's id is its stable key, so a calendar that already has
  // the event updates it instead of gaining a second copy.
  it("uses the task's own key as the event UID", () => {
    const ical = tasksToIcal(tasks, titleOf);
    expect(ical).toContain("UID:bed1:tomato:2026-06-01:harvest:0@smallholder");
  });

  it("should handle empty task list", () => {
    const ical = tasksToIcal([], titleOf);
    expect(ical).toContain("BEGIN:VCALENDAR");
    expect(ical).toContain("END:VCALENDAR");
    expect(ical).not.toContain("BEGIN:VEVENT");
  });
});
