/**
 * App-wide branding — the ONE place to personalize the app for your family.
 *
 * Set `VITE_CHILD_NAME=Léa` (in `.env.local` or your host's env vars) and the
 * browser tab, home screen and printed booklet all become "L'atelier de
 * Léa" / "Une histoire de Léa" — no code change, so a public fork stays
 * generic. `VITE_APP_NAME` / `VITE_APP_DESCRIPTION` / `VITE_STORY_LABEL`
 * override the full strings when the derived phrasing doesn't fit. The values
 * below are the fallbacks. Hero names live in `src/config/characters.ts` (and
 * can also be managed in-app at /parents).
 */

/**
 * French elision: "de" contracts to "d'" before a vowel sound — "l'atelier
 * d'Arsène" but "de Léa". Vowels (accented included) and mute h elide; names
 * where that's wrong (h aspiré, semi-consonant Y like "de Yann") can use the
 * full-string override vars instead.
 */
const ELIDING_INITIAL = /^[aàâäæeéèêëiîïoôöœuùûüh]/i;

function withDe(name: string): string {
  return ELIDING_INITIAL.test(name) ? `d'${name}` : `de ${name}`;
}

const childName: string = (import.meta.env.VITE_CHILD_NAME || "").trim();

export const appConfig = {
  /** One-line description (meta description tag). */
  description:
    import.meta.env.VITE_APP_DESCRIPTION ||
    "Un endroit calme pour lire, inventer et calculer.",
  /** Display name: browser tab, home header. */
  name:
    import.meta.env.VITE_APP_NAME ||
    (childName ? `L'atelier ${withDe(childName)}` : "Le petit atelier"),
  /**
   * Discreet footer printed on the A5 booklet, and the fallback story title
   * when the model returns none.
   */
  storyLabel:
    import.meta.env.VITE_STORY_LABEL ||
    (childName ? `Une histoire ${withDe(childName)}` : "Une petite histoire"),
} as const;
