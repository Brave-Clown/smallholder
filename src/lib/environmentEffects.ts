import type { Bed } from "@/types/garden";
import { getFrostProtectionWeeks } from "@/types/garden";
import { ENV_SUN_MAP } from "@/lib/placementValidation";

/**
 * What picking a bed environment actually changes, derived from the rules
 * themselves rather than restated alongside them — a hand-written blurb per
 * type would drift away from ENVIRONMENT_FROST_PROTECTION and ENV_SUN_MAP the
 * first time either is edited.
 */
export interface EnvironmentEffect {
  messageKey: string;
  params?: Record<string, string | number>;
}

export function environmentEffects(bed: Bed): EnvironmentEffect[] {
  const effects: EnvironmentEffect[] = [];

  const weeks = getFrostProtectionWeeks(bed);
  effects.push(
    weeks > 0
      ? { messageKey: "planner.environmentEffects.frost", params: { count: weeks } }
      : { messageKey: "planner.environmentEffects.noFrost" }
  );

  const sun = ENV_SUN_MAP[bed.environmentType];
  if (sun) effects.push({ messageKey: `planner.environmentEffects.sun_${sun}` });

  if (bed.environmentType === "container") {
    effects.push({
      messageKey: "planner.environmentEffects.containerVolume",
      params: { litres: bed.containerConfig?.volumeLiters ?? 0 },
    });
  }

  // weatherAlerts only inspects greenhouses, and only configured ones.
  if (bed.environmentType === "greenhouse" && bed.greenhouseConfig) {
    effects.push({
      messageKey: "planner.environmentEffects.heatAlerts",
      params: { min: bed.greenhouseConfig.minTempC, max: bed.greenhouseConfig.maxTempC },
    });
  }

  return effects;
}
