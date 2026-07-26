import type { Bed, CellPlanting, EnvironmentType } from "@/types/garden";
import { ENVIRONMENT_ICONS } from "@/types/garden";

/**
 * Normalizes the garden JSON the planner's own export button writes. The file
 * is untrusted input — hand-edited, from an older build, or not ours at all —
 * so every field is checked rather than cast.
 *
 * Ids are deliberately dropped: the store mints fresh ones on import, so a file
 * without them still loads.
 */

export interface ImportedBed extends Omit<Bed, "id" | "cells"> {
  cells: CellPlanting[];
}

export interface ImportedGarden {
  name: string;
  beds: ImportedBed[];
}

function isNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function str(v: unknown): string | undefined {
  return typeof v === "string" && v !== "" ? v : undefined;
}

function normalizeCell(raw: unknown): CellPlanting | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Record<string, unknown>;
  const plantId = str(c.plantId);
  if (!plantId || !isNum(c.cellX) || !isNum(c.cellY)) return null;

  const variety = str(c.variety);
  const plantedDate = str(c.plantedDate);
  const notes = str(c.notes);
  return {
    cellX: c.cellX,
    cellY: c.cellY,
    plantId,
    ...(variety ? { variety } : {}),
    ...(plantedDate ? { plantedDate } : {}),
    ...(notes ? { notes } : {}),
    ...(c.overrideWarnings === true ? { overrideWarnings: true } : {}),
  };
}

function normalizeBed(raw: unknown): ImportedBed | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as Record<string, unknown>;
  const name = str(b.name);
  if (!name || !isNum(b.width) || !isNum(b.height)) return null;
  if (b.width < 1 || b.height < 1) return null;

  const envType = str(b.environmentType);
  const environmentType: EnvironmentType =
    envType && envType in ENVIRONMENT_ICONS ? (envType as EnvironmentType) : "outdoor_bed";

  const cells = Array.isArray(b.cells)
    ? b.cells.map(normalizeCell).filter((c): c is CellPlanting => c !== null)
    : [];
  const paths = Array.isArray(b.paths) ? b.paths.filter((p): p is string => typeof p === "string") : [];
  const notes = str(b.notes);

  // Environment configs ride through as-is: the UI already falls back to a
  // default whenever one is missing or malformed.
  return {
    name,
    x: isNum(b.x) ? b.x : 0,
    y: isNum(b.y) ? b.y : 0,
    width: Math.round(b.width),
    height: Math.round(b.height),
    environmentType,
    cells,
    ...(paths.length ? { paths } : {}),
    ...(notes ? { notes } : {}),
    // Omitted means "inherit the app default", so only carry a real value.
    ...(isNum(b.cellSizeCm) && b.cellSizeCm > 0 ? { cellSizeCm: b.cellSizeCm } : {}),
    ...(b.greenhouseConfig ? { greenhouseConfig: b.greenhouseConfig as Bed["greenhouseConfig"] } : {}),
    ...(b.containerConfig ? { containerConfig: b.containerConfig as Bed["containerConfig"] } : {}),
    ...(b.raisedBedConfig ? { raisedBedConfig: b.raisedBedConfig as Bed["raisedBedConfig"] } : {}),
    ...(b.coldFrameConfig ? { coldFrameConfig: b.coldFrameConfig as Bed["coldFrameConfig"] } : {}),
  };
}

/** Returns null when the file yields no usable garden, so callers can report one error. */
export function parseGardensJson(raw: unknown): ImportedGarden[] | null {
  if (!Array.isArray(raw)) return null;

  const gardens: ImportedGarden[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const g = entry as Record<string, unknown>;
    const name = str(g.name);
    if (!name || !Array.isArray(g.beds)) continue;
    gardens.push({
      name,
      beds: g.beds.map(normalizeBed).filter((b): b is ImportedBed => b !== null),
    });
  }

  return gardens.length ? gardens : null;
}
