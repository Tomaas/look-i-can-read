/**
 * App-wide branding — the ONE place to personalize the app for your family.
 *
 * Set `VITE_APP_NAME` to something like "Les histoires de Léa" (in `.env.local`
 * or your host's env vars) and the browser tab, home screen and printed booklet
 * all follow — no code change, so a public fork stays generic. The values below
 * are the fallbacks. Hero names live in `src/config/characters.ts` (and can
 * also be managed in-app at /parents).
 */
export const appConfig = {
  /** Display name: browser tab, home header. */
  name: import.meta.env.VITE_APP_NAME || "Petites histoires",
  /** One-line description (meta description tag). */
  description:
    import.meta.env.VITE_APP_DESCRIPTION ||
    "Un endroit calme pour inventer des histoires.",
  /**
   * Discreet footer printed on the A5 booklet, and the fallback story title
   * when the model returns none.
   */
  storyLabel: import.meta.env.VITE_STORY_LABEL || "Une petite histoire",
} as const;
