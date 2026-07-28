import type { Garden, Bed, CellPlanting } from "@/types/garden";
import type { Plant } from "@/types/plant";
import type { GeneratedTask, TaskType } from "@/types/task";
import { getFrostProtectionWeeks } from "@/types/garden";
import { addDays, addWeeks, format, parseISO } from "date-fns";

/**
 * The task list for a date is a pure function of (plantings x rules x today),
 * recomputed on render. Nothing here is stored: a task that no longer applies
 * is not marked done, it simply stops being generated.
 *
 * Two things follow from that, and both are the point:
 *  - Adopting the app mid-season works. A cell with a plantedDate is in the
 *    ground, so its sowing tasks are never generated, and its harvest date is
 *    worked out from when it actually went in rather than from a frost date.
 *  - Later rule sets (maintenance, pick windows) are more rules in this
 *    function, and time scrubbing is this function called with another date.
 */

/** How far ahead to look. Beyond this a task is not yet worth showing. */
export const HORIZON_DAYS = 120;

/** How long a missed sowing stays worth nagging about before the window shuts. */
const SOWING_GRACE_DAYS = 21;

/** Slack past the end of a harvest window, since a crop overruns its estimate. */
const HARVEST_SLACK_DAYS = 14;

export interface TaskGenerationContext {
  today: Date;
  lastFrostDate: string;
  horizonDays?: number;
}

/**
 * Cells are geometry; a planting is what a gardener acts on. Twelve tomato
 * cells are one sowing job, so tasks are keyed to the group — same bed, same
 * plant, same planting date — not to each cell. That group is the shape the
 * Level 3 planting read-model will formalize; this is its natural key.
 */
function plantingGroupKey(bed: Bed, cell: CellPlanting): string {
  return `${bed.id}:${cell.plantId}:${cell.plantedDate ?? "planned"}`;
}

export function plantingTaskKey(groupKey: string, type: TaskType, cycleIndex: number): string {
  return `${groupKey}:${type}:${cycleIndex}`;
}

/** The group a task key belongs to — the key minus its `:type:cycle` tail. */
export function taskGroupKey(taskKey: string): string {
  return taskKey.split(":").slice(0, -2).join(":");
}

/**
 * Every planting group that currently exists, whatever its dates. Used to
 * retire verdicts about plantings that are gone, without depending on whether
 * their task happens to fall inside today's horizon.
 */
export function livePlantingGroupKeys(
  gardens: Garden[],
  plantMap: Map<string, Plant>,
): Set<string> {
  const keys = new Set<string>();
  for (const garden of gardens) {
    for (const bed of garden.beds) {
      for (const group of groupPlantings(bed, plantMap)) keys.add(group.key);
    }
  }
  return keys;
}

interface PlantingGroup {
  key: string;
  bed: Bed;
  plant: Plant;
  plantedDate?: string;
  cellCount: number;
}

function groupPlantings(bed: Bed, plantMap: Map<string, Plant>): PlantingGroup[] {
  const groups = new Map<string, PlantingGroup>();
  for (const cell of bed.cells) {
    const plant = plantMap.get(cell.plantId);
    if (!plant) continue;
    const key = plantingGroupKey(bed, cell);
    const existing = groups.get(key);
    if (existing) {
      existing.cellCount++;
    } else {
      groups.set(key, {
        key,
        bed,
        plant,
        plantedDate: cell.plantedDate,
        cellCount: 1,
      });
    }
  }
  return [...groups.values()];
}

/** The bed's own frost date: shelter buys weeks against the garden's. */
function bedFrostDate(bed: Bed, lastFrostDate: string): Date {
  return addWeeks(parseISO(lastFrostDate), -getFrostProtectionWeeks(bed));
}

/**
 * When a planting goes in the ground if the gardener has not said. This is the
 * same base the season timeline draws its harvest bar from, shared so the two
 * cannot disagree — they did, and the task list was the one that lost: a bed
 * plan with no dates entered showed harvest bars on the timeline and produced
 * no tasks at all.
 *
 * MIGRATION DEBT, along with prePlantingTasks below: both read the frost
 * offsets CLAUDE.md declares dead. Real windows come from the climate engine
 * (Level 3) against each plant's ClimateNeeds. These two functions are the
 * seam it replaces; nothing else in this file reads an offset.
 */
export function impliedPlantingDate(plant: Plant, bedFrost: Date): Date {
  if (plant.transplantWeeks !== null) return addWeeks(bedFrost, plant.transplantWeeks);
  if (plant.sowOutdoorsWeeks !== null) return addWeeks(bedFrost, plant.sowOutdoorsWeeks);
  return bedFrost;
}

interface RuleResult {
  type: TaskType;
  dueDate: string;
  expiresOn: string;
  estimated?: boolean;
}

function prePlantingTasks(group: PlantingGroup, lastFrostDate: string): RuleResult[] {
  const frostDate = bedFrostDate(group.bed, lastFrostDate);
  const out: RuleResult[] = [];

  const offsets: Array<[TaskType, number | null]> = [
    ["sow_indoors", group.plant.sowIndoorsWeeks],
    ["sow_outdoors", group.plant.sowOutdoorsWeeks],
    ["transplant", group.plant.transplantWeeks],
  ];

  for (const [type, weeks] of offsets) {
    if (weeks === null) continue;
    const due = addWeeks(frostDate, weeks);
    out.push({
      type,
      dueDate: format(due, "yyyy-MM-dd"),
      expiresOn: format(addDays(due, SOWING_GRACE_DAYS), "yyyy-MM-dd"),
    });
  }
  return out;
}

/**
 * Harvest applies to every planting, not just the dated ones. A recorded
 * plantedDate is the truth when it exists; without one the date is worked out
 * from the plan and flagged `estimated`, so the list says something useful
 * about a bed nobody has typed dates into — which is most beds.
 *
 * Perennials are skipped either way: harvestDaysMax >= 365 is the placeholder
 * the lifecycle split exists to kill, and "harvest your blueberry 730 days
 * after planting" is worse than saying nothing. They get real harvest months
 * once PerennialMaturity lands with the schema v2 migration.
 */
function harvestTasks(group: PlantingGroup, lastFrostDate: string): RuleResult[] {
  if (group.plant.harvestDaysMax >= 365) return [];

  const estimated = !group.plantedDate;
  const base = group.plantedDate
    ? parseISO(group.plantedDate)
    : impliedPlantingDate(group.plant, bedFrostDate(group.bed, lastFrostDate));
  if (Number.isNaN(base.getTime())) return [];

  return [{
    type: "harvest",
    dueDate: format(addDays(base, group.plant.harvestDaysMin), "yyyy-MM-dd"),
    // The crop is in the ground until the window closes, so the task stays
    // relevant well past its due date — unlike a missed sowing.
    expiresOn: format(addDays(base, group.plant.harvestDaysMax + HARVEST_SLACK_DAYS), "yyyy-MM-dd"),
    ...(estimated ? { estimated: true } : {}),
  }];
}

export function generateTasks(
  gardens: Garden[],
  plantMap: Map<string, Plant>,
  ctx: TaskGenerationContext,
): GeneratedTask[] {
  const today = format(ctx.today, "yyyy-MM-dd");
  const horizon = format(addDays(ctx.today, ctx.horizonDays ?? HORIZON_DAYS), "yyyy-MM-dd");
  const tasks: GeneratedTask[] = [];

  for (const garden of gardens) {
    for (const bed of garden.beds) {
      for (const group of groupPlantings(bed, plantMap)) {
        // A planting in the ground is past its sowing, so those tasks are not
        // generated at all rather than generated and back-dated. Harvest
        // applies either way — that is what a bed full of undated plantings
        // has to show for itself.
        const rules = [
          ...(group.plantedDate ? [] : prePlantingTasks(group, ctx.lastFrostDate)),
          ...harvestTasks(group, ctx.lastFrostDate),
        ];

        for (const rule of rules) {
          if (rule.dueDate > horizon) continue;
          if (rule.expiresOn < today) continue;
          tasks.push({
            id: plantingTaskKey(group.key, rule.type, 0),
            gardenId: garden.id,
            bedId: bed.id,
            bedName: bed.name,
            plantId: group.plant.id,
            type: rule.type,
            cycleIndex: 0,
            dueDate: rule.dueDate,
            expiresOn: rule.expiresOn,
            cellCount: group.cellCount,
            ...(rule.estimated ? { estimated: true } : {}),
          });
        }
      }
    }
  }

  return tasks.sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.id.localeCompare(b.id));
}
