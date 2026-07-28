import { describe, it, expect } from "vitest";
import { environmentEffects } from "@/lib/environmentEffects";
import { ENV_SUN_MAP } from "@/lib/placementValidation";
import {
  ENVIRONMENT_ICONS,
  ENVIRONMENT_FROST_PROTECTION,
  getFrostProtectionWeeks,
  type Bed,
  type EnvironmentType,
} from "@/types/garden";

const ALL: EnvironmentType[] = Object.keys(ENVIRONMENT_ICONS) as EnvironmentType[];

function makeBed(over: Partial<Bed> = {}): Bed {
  return {
    id: "b1", name: "Bed", x: 0, y: 0, width: 4, height: 3,
    updatedAt: "2026-01-01T00:00:00.000Z", cells: [], environmentType: "outdoor_bed", ...over,
  };
}

const keys = (bed: Bed) => environmentEffects(bed).map((e) => e.messageKey);

describe("environmentEffects", () => {
  it("says something about frost for every environment, never nothing", () => {
    for (const environmentType of ALL) {
      const k = keys(makeBed({ environmentType }));
      const frostLines = k.filter((x) => x.endsWith("frost") || x.endsWith("noFrost"));
      expect(frostLines, environmentType).toHaveLength(1);
    }
  });

  it("reports the same frost weeks the engine actually applies", () => {
    for (const environmentType of ALL) {
      const bed = makeBed({ environmentType });
      const weeks = getFrostProtectionWeeks(bed);
      const frost = environmentEffects(bed).find((e) => e.messageKey.endsWith("frost"));
      if (weeks > 0) {
        // `count`, not `weeks`, so i18next can pluralise "1 week" correctly.
        expect(frost?.params?.count, environmentType).toBe(weeks);
      } else {
        expect(keys(bed), environmentType).toContain("planner.environmentEffects.noFrost");
      }
    }
  });

  it("tracks config-driven protection rather than the table default", () => {
    const gh = makeBed({
      environmentType: "greenhouse",
      greenhouseConfig: {
        material: "glass", heated: true, ventilation: "manual",
        minTempC: 5, maxTempC: 35, frostProtectionWeeks: 6,
      },
    });
    // The table says 0 for greenhouse; the config is what counts.
    expect(ENVIRONMENT_FROST_PROTECTION.greenhouse).toBe(0);
    expect(environmentEffects(gh).find((e) => e.messageKey.endsWith("frost"))?.params?.count).toBe(6);
  });

  it("mentions sun exactly for the environments the validator remaps", () => {
    for (const environmentType of ALL) {
      const k = keys(makeBed({ environmentType }));
      const sunLines = k.filter((x) => x.includes(".sun_"));
      const mapped = ENV_SUN_MAP[environmentType];
      if (mapped) {
        expect(sunLines, environmentType).toEqual([`planner.environmentEffects.sun_${mapped}`]);
      } else {
        expect(sunLines, environmentType).toHaveLength(0);
      }
    }
  });

  it("explains the pot-volume gate only for containers", () => {
    const container = makeBed({ environmentType: "container", containerConfig: { volumeLiters: 30, material: "plastic" } });
    const effect = environmentEffects(container).find((e) => e.messageKey.endsWith("containerVolume"));
    expect(effect?.params?.litres).toBe(30);
    expect(keys(makeBed({ environmentType: "outdoor_bed" })).some((k) => k.endsWith("containerVolume"))).toBe(false);
  });

  it("promises heat alerts only for a configured greenhouse, matching weatherAlerts", () => {
    const configured = makeBed({
      environmentType: "greenhouse",
      greenhouseConfig: {
        material: "glass", heated: false, ventilation: "manual",
        minTempC: 4, maxTempC: 32, frostProtectionWeeks: 4,
      },
    });
    const effect = environmentEffects(configured).find((e) => e.messageKey.endsWith("heatAlerts"));
    expect(effect?.params).toEqual({ min: 4, max: 32 });
    // weatherAlerts filters on `greenhouseConfig` being present, so an
    // unconfigured greenhouse must not claim alerts it will never get.
    const bare = makeBed({ environmentType: "greenhouse" });
    expect(keys(bare).some((k) => k.endsWith("heatAlerts"))).toBe(false);
  });
});
