import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { defaultPreferences } from "@/domain/preferences";
import type { Preferences } from "@/domain/preferences";
import { localPreferencesRepository } from "@/data/repositories";

interface PreferencesContextValue {
  prefs: Preferences;
  ready: boolean;
  updatePrefs: (patch: Partial<Preferences>) => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function deviceLocale(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale;
  } catch {
    return "en";
  }
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const defaults = useMemo(() => defaultPreferences(deviceLocale()), []);
  const [prefs, setPrefs] = useState<Preferences>(defaults);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    localPreferencesRepository
      .load(defaults)
      .then((loaded) => {
        if (!cancelled) setPrefs(loaded);
      })
      .catch((error: unknown) => {
        // Corrupt or unreadable preferences: fall back to defaults instead of blocking the app.
        console.warn("Failed to load preferences", error);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [defaults]);

  // A ref keeps the latest value so updates never read stale state
  // and the save side effect stays outside React's state updater.
  const latest = useRef(prefs);
  latest.current = prefs;

  const updatePrefs = useCallback((patch: Partial<Preferences>) => {
    const next = { ...latest.current, ...patch };
    latest.current = next;
    setPrefs(next);
    localPreferencesRepository.save(next).catch((error: unknown) => {
      console.warn("Failed to save preferences", error);
    });
  }, []);

  const value = useMemo(() => ({ prefs, ready, updatePrefs }), [prefs, ready, updatePrefs]);
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used inside <PreferencesProvider>");
  return ctx;
}
