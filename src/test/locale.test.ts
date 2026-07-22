import { describe, it, expect, beforeEach } from "vitest";
import {
  DEFAULT_LOCALE,
  STORAGE_KEY,
  getStoredLocale,
  isSupportedLocale,
} from "@/lib/locale";

function persistLocale(value: unknown) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ state: { locale: value } }));
}

describe("isSupportedLocale", () => {
  it("accepts every shipped locale", () => {
    for (const locale of ["en", "de", "es", "fr"]) {
      expect(isSupportedLocale(locale)).toBe(true);
    }
  });

  it("rejects locales we do not ship", () => {
    expect(isSupportedLocale("zh")).toBe(false);
    expect(isSupportedLocale("nl")).toBe(false);
  });

  it("rejects region-tagged forms, which callers must narrow first", () => {
    expect(isSupportedLocale("en-GB")).toBe(false);
    expect(isSupportedLocale("de-AT")).toBe(false);
  });

  it("rejects non-strings", () => {
    expect(isSupportedLocale(undefined)).toBe(false);
    expect(isSupportedLocale(null)).toBe(false);
    expect(isSupportedLocale(42)).toBe(false);
  });
});

describe("getStoredLocale", () => {
  beforeEach(() => localStorage.clear());

  it("returns nothing when the user has never chosen", () => {
    expect(getStoredLocale()).toBeUndefined();
  });

  it("returns a previously chosen locale so it can outrank detection", () => {
    persistLocale("fr");
    expect(getStoredLocale()).toBe("fr");
  });

  it("ignores a persisted locale we no longer ship", () => {
    persistLocale("zh");
    expect(getStoredLocale()).toBeUndefined();
  });

  it("survives a corrupt blob rather than throwing at startup", () => {
    localStorage.setItem(STORAGE_KEY, "{not json");
    expect(getStoredLocale()).toBeUndefined();
  });

  it("survives a blob with no settings in it", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ state: {} }));
    expect(getStoredLocale()).toBeUndefined();
  });
});

describe("DEFAULT_LOCALE", () => {
  it("is English, not upstream's German", () => {
    expect(DEFAULT_LOCALE).toBe("en");
  });
});
