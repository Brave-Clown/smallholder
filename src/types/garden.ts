export type EnvironmentType =
  | "outdoor_bed"
  | "raised_bed"
  | "greenhouse"
  | "cold_frame"
  | "polytunnel"
  | "container"
  | "windowsill"
  | "vertical";

export interface GreenhouseConfig {
  material: "glass" | "polycarbonate" | "plastic";
  heated: boolean;
  heatingType?: "electric" | "gas" | "passive_solar";
  ventilation: "manual" | "automatic";
  minTempC: number;
  maxTempC: number;
  frostProtectionWeeks: number;
}

export interface ContainerConfig {
  volumeLiters: number;
  material: "terracotta" | "plastic" | "fabric" | "wood" | "metal";
}

export interface RaisedBedConfig {
  heightCm: number;
}

export interface ColdFrameConfig {
  frostProtectionWeeks: number;
}

export interface CellPlanting {
  // Stable identity, independent of where the planting sits in the grid.
  // Task state is keyed by this, so moving a plant carries its history with
  // it and re-gridding a bed does not orphan it.
  id: string;
  cellX: number;
  cellY: number;
  plantId: string;
  variety?: string;
  plantedDate?: string;
  notes?: string;
  // The gardener has seen this cell's companion warning and chosen to keep the
  // planting. Suppresses the marker for this cell only.
  overrideWarnings?: boolean;
}

/**
 * A planting before the store gives it identity. Layout engines and file
 * imports build these; `setCell`/`setBedCells` mint the id, so identity has
 * exactly one source.
 */
export type CellPlantingDraft = Omit<CellPlanting, "id"> & { id?: string };

export interface Bed {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  updatedAt: string;
  cells: CellPlanting[];
  notes?: string;
  paths?: string[]; // "x-y" keys for path cells
  // Undefined inherits the app-wide default, so gardens made before beds had
  // their own size keep their geometry without a migration.
  cellSizeCm?: number;
  environmentType: EnvironmentType;
  greenhouseConfig?: GreenhouseConfig;
  containerConfig?: ContainerConfig;
  raisedBedConfig?: RaisedBedConfig;
  coldFrameConfig?: ColdFrameConfig;
}

/**
 * A bed whose plantings may not have identity yet — what a layout engine holds
 * mid-generation and what the New Bed preview builds. `Bed` satisfies it, so
 * the validators accept either.
 */
export type BedDraft = Omit<Bed, "cells"> & { cells: CellPlantingDraft[] };

export interface Garden {
  id: string;
  name: string;
  beds: Bed[];
  season: string; // e.g. "2026"
  createdAt: string;
  updatedAt: string;
}

export interface SeasonArchive {
  season: string;
  gardenId: string;
  gardenName: string;
  beds: Bed[];
  archivedAt: string;
}

export const ENVIRONMENT_ICONS: Record<EnvironmentType, string> = {
  outdoor_bed: "\ud83c\udf31",
  raised_bed: "\ud83e\uddf1",
  greenhouse: "\ud83c\udfe1",
  cold_frame: "\u2744\ufe0f",
  polytunnel: "\ud83c\udf08",
  container: "\ud83e\udeb4",
  windowsill: "\ud83e\uddf4",
  vertical: "\u2b06\ufe0f",
};

export const ENVIRONMENT_FROST_PROTECTION: Record<EnvironmentType, number> = {
  outdoor_bed: 0,
  raised_bed: 1,
  greenhouse: 0,  // uses config value
  cold_frame: 0,  // uses config value
  polytunnel: 3,
  container: 0,
  windowsill: 8,
  vertical: 0,
};

export function getFrostProtectionWeeks(bed: Bed): number {
  if (bed.environmentType === "greenhouse" && bed.greenhouseConfig) {
    return bed.greenhouseConfig.frostProtectionWeeks;
  }
  if (bed.environmentType === "cold_frame" && bed.coldFrameConfig) {
    return bed.coldFrameConfig.frostProtectionWeeks;
  }
  return ENVIRONMENT_FROST_PROTECTION[bed.environmentType];
}
