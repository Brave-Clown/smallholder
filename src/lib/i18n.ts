import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import HttpBackend from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, getStoredLocale } from "./locale";

const storedLocale = getStoredLocale();

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    // Only pin a language when the user has already chosen one. Leaving it
    // unset is what lets the detector run for a first-time visitor.
    ...(storedLocale ? { lng: storedLocale } : {}),
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: SUPPORTED_LOCALES,
    // Browsers report "en-GB" / "de-AT"; we only ship base languages.
    load: "languageOnly",
    detection: {
      // Navigator only. The Zustand store is the record of a deliberate
      // choice, and caching would give the detector a competing copy of it.
      order: ["navigator"],
      caches: [],
    },
    backend: {
      loadPath: `${import.meta.env.BASE_URL}locales/{{lng}}/{{ns}}.json`,
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
