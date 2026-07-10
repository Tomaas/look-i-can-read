import { useEffect, useState } from "react";

/**
 * Optional "lettres attachées" (cursive) reading mode. The story BODY text can
 * switch between the rounded default and a faithful French school cursive so
 * the child can practise reading joined handwriting. Persisted per-device in
 * localStorage; SSR-safe (defaults to "rounded" on the server / first paint,
 * then hydrates the saved choice).
 *
 * This is a pure display preference — it changes nothing about generation,
 * adds no stakes, no progress, no reward. It is OFF by default.
 */
export type ReadingFont = "rounded" | "cursive";

const STORAGE_KEY = "stories:reading-font";

function readStored(): ReadingFont {
  if (typeof window === "undefined") {
    return "rounded";
  }
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "cursive"
      ? "cursive"
      : "rounded";
  } catch {
    // Private mode / disabled storage — degrade to the default, never throw.
    return "rounded";
  }
}

export interface UseReadingFont {
  /** The active reading font. "rounded" on the server and until hydration. */
  font: ReadingFont;
  /** True when reading in cursive — convenient for the toggle's pressed state. */
  isCursive: boolean;
  /** Flip between rounded and cursive, persisting the choice. */
  toggle: () => void;
}

export function useReadingFont(): UseReadingFont {
  // Start "rounded" so SSR and the first client render match (no hydration
  // mismatch), then sync the stored choice in an effect.
  const [font, setFont] = useState<ReadingFont>("rounded");

  useEffect(() => {
    setFont(readStored());
  }, []);

  const toggle = () => {
    setFont((prev) => {
      const next: ReadingFont = prev === "cursive" ? "rounded" : "cursive";
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Persistence is best-effort; the in-memory toggle still works.
      }
      return next;
    });
  };

  return { font, isCursive: font === "cursive", toggle };
}
