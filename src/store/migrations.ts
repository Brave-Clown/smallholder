import type { Bed, Garden, SeasonArchive } from "@/types/garden";
import { genId } from "@/lib/ids";

/**
 * The slice of persisted state old versions actually need reshaping. Kept out
 * of the store module so migrations are testable without constructing one.
 */
export interface PersistedState {
  gardens?: Garden[];
  seasonArchives?: SeasonArchive[];
}

/** Backfills identity onto beds and plantings stored before they had any. */
function identifyBeds(beds: Bed[], fallbackStamp: string): Bed[] {
  return beds.map((b) => ({
    ...b,
    updatedAt: b.updatedAt ?? fallbackStamp,
    cells: b.cells.map((c) => ({ ...c, id: c.id ?? genId() })),
  }));
}

export function migratePersisted(persisted: unknown, version: number): PersistedState {
  const state = (persisted ?? {}) as PersistedState;

  if (version < 2 && state.gardens) {
    state.gardens = state.gardens.map((g) => ({
      ...g,
      beds: g.beds.map((b) => ({
        ...b,
        environmentType: b.environmentType ?? "outdoor_bed",
      })),
    }));
  }

  if (version < 3 && state.gardens) {
    const currentYear = String(new Date().getFullYear());
    state.gardens = state.gardens.map((g) => ({
      ...g,
      season: g.season ?? currentYear,
    }));
    if (!state.seasonArchives) {
      state.seasonArchives = [];
    }
  }

  if (version < 4) {
    if (state.gardens) {
      state.gardens = state.gardens.map((g) => ({
        ...g,
        beds: identifyBeds(g.beds, g.updatedAt ?? g.createdAt),
      }));
    }
    // Archived beds keep their plantings, so they need identity too — rotation
    // memory will read them.
    if (state.seasonArchives) {
      state.seasonArchives = state.seasonArchives.map((a) => ({
        ...a,
        beds: identifyBeds(a.beds, a.archivedAt),
      }));
    }
  }

  return state;
}
