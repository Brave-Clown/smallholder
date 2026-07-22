export const SUPPORTED_LOCALES = ["en", "de", "es", "fr"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

/**
 * Fallback when the browser asks for something we don't ship. English rather
 * than upstream's German: this fork is written in English and most visitors
 * won't be German speakers.
 */
export const DEFAULT_LOCALE: Locale = "en";

/** Zustand persist key. Renaming it discards existing data — see Level 2. */
export const STORAGE_KEY = "gardener-storage";

export function isSupportedLocale(value: unknown): value is Locale {
  return typeof value === "string" && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/**
 * The user's own past choice, which must beat browser detection. Read straight
 * from the persisted blob because this runs before the store hydrates.
 */
export function getStoredLocale(): Locale | undefined {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    const locale = data?.state?.locale;
    return isSupportedLocale(locale) ? locale : undefined;
  } catch {
    return undefined;
  }
}
