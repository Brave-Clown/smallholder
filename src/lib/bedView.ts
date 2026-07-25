/**
 * How the planner shows a garden's beds.
 *
 * "all" — every bed expanded unless the gardener collapsed that one. This is
 * the default at any bed count; nothing switches away from it automatically.
 * "one" — accordion: at most one bed open, opening a bed closes the rest.
 *
 * The mode and the collapsed set are separate on purpose. A single nullable
 * "which bed is open" field cannot express both, and overloading its null to
 * mean "all open" is what made clicking bed A collapse bed B instead of A.
 */
export type BedViewMode = "all" | "one";

/** Which beds render expanded, given the mode and what the gardener collapsed. */
export function expandedBedIds(
  mode: BedViewMode,
  collapsedBedIds: readonly string[],
  allBedIds: readonly string[]
): Set<string> {
  const collapsed = new Set(collapsedBedIds);
  const open = allBedIds.filter((id) => !collapsed.has(id));
  // In accordion mode the collapsed set can still name several open beds — a
  // bed added after the mode was set, say. Bed order breaks the tie.
  return new Set(mode === "one" ? open.slice(0, 1) : open);
}

/** The collapsed set after clicking one bed's header. */
export function toggleBedCollapse(
  mode: BedViewMode,
  collapsedBedIds: readonly string[],
  allBedIds: readonly string[],
  bedId: string
): string[] {
  const isOpen = expandedBedIds(mode, collapsedBedIds, allBedIds).has(bedId);
  if (mode === "one") {
    return isOpen ? [...allBedIds] : allBedIds.filter((id) => id !== bedId);
  }
  return isOpen
    ? [...collapsedBedIds, bedId]
    : collapsedBedIds.filter((id) => id !== bedId);
}
