/**
 * Plant & Climate Schema v2 — clean break from upstream.
 *
 * Design decisions baked in here:
 *  - Frost-offset fields (sowIndoorsWeeks etc.) are GONE. ClimateNeeds is
 *    required on every plant, so the window engine has exactly one code path.
 *  - Botanical family lives ON the plant (the hardcoded id->family map dies).
 *  - Lifecycle is a first-class split: annuals and perennials have different
 *    maturity/yield shapes instead of the old harvestDaysMax>=365 hack.
 *  - Built to scale to hundreds of plants: scientific name for disambiguation,
 *    i18n name map instead of bundled translation keys, provenance +
 *    data-quality flags, emoji as the default icon (SVG optional).
 */

// ---------------------------------------------------------------------------
// Climate profile (per location, derived from ERA5 history; user-overridable)
// ---------------------------------------------------------------------------

export interface FrostDates {
  p10: string; // ISO date — 10% risk remaining (gambler)
  p50: string; // median
  p90: string; // conservative / "safe"
}

export interface ClimateProfile {
  latitude: number;
  longitude: number;
  elevationM?: number;
  /** 52 entries, index 0 = ISO week 1. Derived from daily ERA5 history. */
  weeklyNormals: Array<{ tMinC: number; tMaxC: number }>;
  frost: {
    lastSpring: FrostDates | null; // null = frost-free climate
    firstFall: FrostDates | null;
  };
  /** Mean annual chill hours (0–7°C accumulation) — needed for perennials. */
  chillHours?: number;
  source: "derived_era5" | "manual";
  /** User tweaks layered over derived values (microclimate corrections). */
  overrides?: Partial<Pick<ClimateProfile, "frost" | "chillHours">>;
}

// ---------------------------------------------------------------------------
// Per-plant climate contract (REQUIRED on every plant)
// ---------------------------------------------------------------------------

export type FrostTolerance = "tender" | "half_hardy" | "hardy" | "very_hardy";
export type Photoperiod = "short_day" | "long_day" | "day_neutral";

export interface ClimateNeeds {
  /** Soil temp floor for direct-sown germination (°C). */
  soilGerminationMinC?: number;
  /**
   * Soil temp CEILING for germination — critical for warm-climate fall
   * sowing (lettuce and spinach won't germinate in hot August soil).
   */
  soilGerminationMaxC?: number;
  frostTolerance: FrostTolerance;
  /** Air-temp band for meaningful growth; outside it the crop stalls. */
  growthRangeC: [number, number];
  /** Sustained daily highs above this = bolt / quality failure / crop loss. */
  heatCeilingC?: number;
  /** Flowering trigger. short_day = winged bean; long_day = spinach bolting. */
  photoperiod?: Photoperiod;
  /**
   * Cold accumulation REQUIRED between planting and maturity.
   * This is how fall garlic planting emerges from the engine instead of
   * being a special case: no vernalization window = no bulbing window.
   */
  vernalization?: { weeks: number; belowC: number };
  /** Perennials: winter kill temperature (universal alternative to USDA zones). */
  minWinterTempC?: number;
  /** Perennials: chill hours needed to fruit properly (variety-averaged). */
  chillHoursMin?: number;
}

// ---------------------------------------------------------------------------
// Plant v2
// ---------------------------------------------------------------------------

export type Lifecycle = "annual" | "biennial" | "perennial";
export type GrowthHabit =
  | "bush" | "vine" | "upright" | "rosette" | "root" | "bulb"
  | "cane" | "shrub" | "tree" | "groundcover";

export type BotanicalFamily =
  | "solanaceae" | "cucurbitaceae" | "fabaceae" | "brassicaceae"
  | "apiaceae" | "amaryllidaceae" | "asteraceae" | "amaranthaceae"
  | "poaceae" | "lamiaceae" | "rosaceae" | "ericaceae"
  | "grossulariaceae" | "asparagaceae" | "convolvulaceae" // sweet potato
  | "malvaceae" | "rutaceae" | "lauraceae" | "moraceae"   // okra, citrus, avocado, fig
  | "other";

export type PropagationMethod =
  | "direct_sow" | "transplant" | "cutting" | "bare_root" | "sets" | "tuber" | "crown";

/** Annuals & biennials: the engine walks these days through the climate. */
export interface AnnualMaturity {
  kind: "annual";
  daysToMaturityMin: number;
  daysToMaturityMax: number;
  /** How long the plant keeps producing once mature (pick window). */
  harvestWindowDays?: number;
  /** kg per m² per season — for the sufficiency calculator. */
  expectedYieldKgPerM2?: number;
}

/** Perennials: establishment ramp + month-anchored harvest. */
export interface PerennialMaturity {
  kind: "perennial";
  yearsToFirstHarvest: number;
  yearsToFullYield: number;
  /** 1–12; hemisphere-flipped by the engine for southern latitudes. */
  harvestMonths: number[];
  /** kg per PLANT per year at full maturity (not per m²). */
  expectedYieldKgPerPlant?: number;
}

export interface PlantV2 {
  id: string;                       // slug, unique across builtin + custom + packs
  scientificName?: string;          // disambiguation matters at hundreds-scale
  names: { en: string; [locale: string]: string };
  category: "vegetable" | "fruit" | "herb" | "grain" | "berry" | "tree";
  family: BotanicalFamily;          // rotation logic reads THIS now
  lifecycle: Lifecycle;
  habit: GrowthHabit;               // vine beans finally expressible
  needsTrellis?: boolean;

  climate: ClimateNeeds;            // REQUIRED — the engine contract

  propagation: {
    methods: PropagationMethod[];
    /** Weeks of indoor growth before transplant-ready (replaces frost offsets). */
    indoorLeadWeeks?: number;
    /** Replaces the hardcoded succession preset table. */
    successionIntervalWeeks?: number;
  };

  spacing: {
    inRowCm: number;
    betweenRowCm: number;
    /** Trees/shrubs: mature canopy diameter — a tree is not a 30cm grid cell. */
    matureCanopyM?: number;
  };

  maturity: AnnualMaturity | PerennialMaturity;

  sun: { minDirectHours: number };  // pairs with the per-bed sunHours field
  waterNeed: "low" | "medium" | "high";

  nutritionPer100g?: {
    calories: number; proteinG: number; vitaminCMg: number; fiberG: number;
  };

  /**
   * Companion data strategy at scale: per-plant id arrays don't survive
   * hundreds of plants (n² folklore). Keep specific curated pairs here,
   * but the matrix/validator should ALSO apply family-level rules from a
   * separate small table (e.g., alliums vs legumes). Pairs override rules.
   */
  companions?: string[];
  antagonists?: string[];

  preservationMethods?: Array<"canning" | "freezing" | "fermenting" | "drying" | "root_cellar">;
  seedSaving?: { difficulty: "easy" | "moderate" | "advanced"; isolationDistanceM?: number; seedViabilityYears: number };

  icon: string;                     // emoji default; svgIcon optional at scale
  svgIcon?: string;
  color: string;

  // Provenance — non-negotiable once community packs and hundreds of entries exist
  dataQuality: "verified" | "draft" | "community";
  source?: string;                  // pack name, "builtin", contributor, etc.
}

// ---------------------------------------------------------------------------
// Engine output — what the UI, calendar, and task generator consume
// ---------------------------------------------------------------------------

export interface PlantingWindow {
  plantId: string;
  method: "direct_sow" | "transplant"; // indoor-start date is back-computed
  start: string;                       // ISO dates for the chosen risk level
  end: string;
  indoorStart?: string;
  /** Surface this in the UI. It's the teaching layer. */
  limitedBy: "frost" | "heat" | "germination_soil_temp" | "daylight" | "vernalization" | "season_end";
  risk: "safe" | "median" | "gamble";
}
