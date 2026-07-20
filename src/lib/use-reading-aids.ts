import { useEffect, useState } from "react";

/**
 * The two CP-book reading aids of the story text — faded lettres muettes and
 * liaison arcs — each independently toggleable. Persisted per-device in
 * localStorage; SSR-safe (defaults to ON on the server / first paint, then
 * hydrates the saved choice, mirroring `useReadingFont`).
 *
 * These are pure display preferences — they change nothing about generation,
 * add no stakes, no progress, no reward. Both are ON by default (the aids
 * are the point of the reader), storing "off" disables one.
 */
const SILENT_KEY = "stories:aid-silent";
const LIAISON_KEY = "stories:aid-liaisons";

function readStored(key: string): boolean {
  if (typeof window === "undefined") {
    return true;
  }
  try {
    return window.localStorage.getItem(key) !== "off";
  } catch {
    // Private mode / disabled storage — degrade to the default, never throw.
    return true;
  }
}

function persist(key: string, enabled: boolean) {
  try {
    window.localStorage.setItem(key, enabled ? "on" : "off");
  } catch {
    // Persistence is best-effort; the in-memory toggle still works.
  }
}

/** Just the two display flags — what the text renderers consume. */
export interface ReadingAidsFlags {
  /** Draw the liaison arcs. ON on the server and until hydration. */
  showLiaisons: boolean;
  /** Fade the lettres muettes. ON on the server and until hydration. */
  showSilent: boolean;
}

export interface UseReadingAids extends ReadingAidsFlags {
  toggleLiaisons: () => void;
  toggleSilent: () => void;
}

export function useReadingAids(): UseReadingAids {
  // Start ON so SSR and the first client render match (no hydration
  // mismatch), then sync the stored choices in an effect.
  const [showSilent, setShowSilent] = useState(true);
  const [showLiaisons, setShowLiaisons] = useState(true);

  useEffect(() => {
    setShowSilent(readStored(SILENT_KEY));
    setShowLiaisons(readStored(LIAISON_KEY));
  }, []);

  const toggleSilent = () => {
    setShowSilent((prev) => {
      persist(SILENT_KEY, !prev);
      return !prev;
    });
  };

  const toggleLiaisons = () => {
    setShowLiaisons((prev) => {
      persist(LIAISON_KEY, !prev);
      return !prev;
    });
  };

  return { showLiaisons, showSilent, toggleLiaisons, toggleSilent };
}
