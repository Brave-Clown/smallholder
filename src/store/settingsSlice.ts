import type { StateCreator } from "zustand";
import { DEFAULT_LOCALE, type Locale } from "@/lib/locale";
import { toggleBedCollapse, type BedViewMode } from "@/lib/bedView";

export interface AlertConfig {
  frostAlertEnabled: boolean;
  frostThresholdC: number;
  wateringReminders: boolean;
  greenhouseAlerts: boolean;
  weeklyDigest: boolean;
}

export interface SettingsSlice {
  locale: Locale;
  weatherApiKey: string;
  locationLat: number | null;
  locationLon: number | null;
  locationName: string;
  lastFrostDate: string;
  gridCellSizeCm: number;
  backendUrl: string | null;
  theme: "light" | "dark" | "system";
  bedViewMode: BedViewMode;
  collapsedBedIds: string[];
  alerts: AlertConfig;
  lastBackupDate: string | null;
  setLocale: (locale: Locale) => void;
  setWeatherApiKey: (key: string) => void;
  setLocation: (lat: number, lon: number, name: string) => void;
  setLastFrostDate: (date: string) => void;
  setTheme: (theme: "light" | "dark" | "system") => void;
  setBackendUrl: (url: string | null) => void;
  setGridCellSizeCm: (size: number) => void;
  setBedViewMode: (mode: BedViewMode) => void;
  toggleBedCollapsed: (bedId: string, allBedIds: string[]) => void;
  setAlerts: (alerts: Partial<AlertConfig>) => void;
  setLastBackupDate: (date: string) => void;
}

export const createSettingsSlice: StateCreator<SettingsSlice> = (set) => ({
  // Overwritten by persist rehydration for a returning user, and by the
  // detector sync in main.tsx for a new one.
  locale: DEFAULT_LOCALE,
  weatherApiKey: "",
  locationLat: null,
  locationLon: null,
  locationName: "",
  lastFrostDate: "2026-05-15",
  gridCellSizeCm: 30,
  backendUrl: null,
  theme: "system",
  // All beds open, at every bed count, until the user says otherwise.
  bedViewMode: "all",
  collapsedBedIds: [],
  alerts: {
    frostAlertEnabled: true,
    frostThresholdC: 2,
    wateringReminders: true,
    greenhouseAlerts: true,
    weeklyDigest: true,
  },
  lastBackupDate: null,
  setLocale: (locale) => set({ locale }),
  setWeatherApiKey: (weatherApiKey) => set({ weatherApiKey }),
  setLocation: (locationLat, locationLon, locationName) =>
    set({ locationLat, locationLon, locationName }),
  setLastFrostDate: (lastFrostDate) => set({ lastFrostDate }),
  setTheme: (theme) => set({ theme }),
  setBackendUrl: (backendUrl) => set({ backendUrl }),
  setGridCellSizeCm: (gridCellSizeCm) => set({ gridCellSizeCm }),
  // Switching modes starts that mode clean: "all" opens everything, "one"
  // falls back on the first bed. Neither inherits the other's collapsed set.
  setBedViewMode: (bedViewMode) => set({ bedViewMode, collapsedBedIds: [] }),
  toggleBedCollapsed: (bedId, allBedIds) =>
    set((state) => ({
      collapsedBedIds: toggleBedCollapse(state.bedViewMode, state.collapsedBedIds, allBedIds, bedId),
    })),
  setAlerts: (updates) =>
    set((state) => ({ alerts: { ...state.alerts, ...updates } })),
  setLastBackupDate: (lastBackupDate) => set({ lastBackupDate }),
});
