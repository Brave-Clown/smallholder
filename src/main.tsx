import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import { ToastProvider } from "./components/ui/Toast";
import { initTheme } from "./lib/theme";
import i18n from "./lib/i18n";
import { getStoredLocale, isSupportedLocale } from "./lib/locale";
import { useStore } from "./store";
import "./index.css";
import App from "./App";

initTheme();

// A first-time visitor's language comes from the detector, so mirror it into
// the store. Without this the onboarding wizard renders in the detected
// language while highlighting the default one.
if (!getStoredLocale() && isSupportedLocale(i18n.resolvedLanguage)) {
  useStore.getState().setLocale(i18n.resolvedLanguage);
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <Suspense fallback={<div className="flex h-screen items-center justify-center text-gray-400">Loading...</div>}>
          <App />
        </Suspense>
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>
);
