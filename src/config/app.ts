/**
 * App-wide branding — the ONE place to personalize the app for your family.
 *
 * Change `name` to something like "Les histoires de Léa" and the browser tab,
 * home screen and printed booklet all follow. Hero names live in
 * `src/config/characters.ts` (and can also be managed in-app at /parents).
 */
export const appConfig = {
  /** Display name: browser tab, home header. */
  name: "Petites histoires",
  /** One-line description (meta description tag). */
  description: "Un endroit calme pour inventer des histoires.",
  /**
   * Discreet footer printed on the A5 booklet, and the fallback story title
   * when the model returns none.
   */
  storyLabel: "Une petite histoire",
} as const;
