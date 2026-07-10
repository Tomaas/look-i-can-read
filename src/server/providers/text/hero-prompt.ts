import type { HeroContext } from "~/server/providers/types";

/**
 * Hero prompt fragments, shared by the classic + dynamic text providers so the
 * framing is identical. Heroes are MULTI-select (cap 2): `heroes[0]` is the
 * PRIMARY hero whose name is a hard safety contract; secondaries are a soft
 * readability nudge only.
 *
 * SINGLE-HERO IDENTITY (codex #4): for exactly one hero, every builder emits
 * BYTE-IDENTICAL output to the pre-multi single-hero code, so an old single-hero
 * story (and the overwhelming common case) reads exactly as before. The golden
 * test in `__tests__` pins this. Only multi-hero adds extra grouping/naming
 * language.
 */

/**
 * The user-prompt line(s) for the hero(es).
 * - 1 hero → exactly `Héros : ${promptHint}` (identical to the old single line).
 * - ≥2 → `Les héros : …` joining each guiding description, plus a gentle rule to
 *   name each hero naturally (the proven doudou phrasing) so a short CP/CE1 story
 *   stays readable without dropping a protagonist.
 */
export function heroesUserBlock(heroes: HeroContext[]): string {
  const hints = heroes.map((h) => h.promptHint).filter(Boolean);
  if (hints.length === 0) {
    return "";
  }
  if (hints.length === 1) {
    return `Héros : ${hints[0]}`;
  }
  const joined = `${hints.slice(0, -1).join(" ; ")} ; et ${hints.at(-1)}`;
  return (
    `Les héros : ${joined}. ` +
    "Ils vivent l'aventure ensemble. " +
    "Nomme chaque héros au moins une fois, naturellement au fil de l'histoire " +
    "(pas forcément à chaque fois, sans alourdir les phrases)."
  );
}

/**
 * The IMAGE-prompt fragment for the hero(es): each beside the others in the
 * scene. "" when there is none.
 * - 1 hero → exactly the hero's `imageHint` (identical to the old `hero.imageHint`).
 * - ≥2 → join with commas + "et" and ask for them grouped together so a busy
 *   illustration stays coherent (same trick as `doudouImageLine`).
 */
export function heroesImageLine(heroes: HeroContext[]): string {
  const hints = heroes.map((h) => h.imageHint).filter(Boolean);
  if (hints.length === 0) {
    return "";
  }
  if (hints.length === 1) {
    return hints[0];
  }
  const joined = `${hints.slice(0, -1).join(", ")} et ${hints.at(-1)}`;
  return `${joined}, tous ensemble dans la scène.`;
}

/**
 * The IMAGE-prompt line for the story's frozen outfit — the heroes' wardrobe,
 * generated once at creation and kept identical across every illustration.
 *
 * Framed as a DEFAULT the reference image overrides (same soft posture as the
 * visual-world `ambianceLine`): on beat 0 there is no reference image yet, so
 * this text anchors the clothing; on later beats the reference image is the
 * stronger anchor and the outfit text just backs it up. "" when there is no
 * frozen outfit (older stories / safety-scan drop) → the line is omitted and
 * the image is built exactly as before.
 */
export function outfitImageLine(outfit: string | null): string {
  if (!outfit) {
    return "";
  }
  return (
    "Tenue des personnages, à garder IDENTIQUE d'une image à l'autre " +
    `(sauf si l'image de référence montre déjà leurs vêtements) : ${outfit}.`
  );
}

/**
 * The arc/outfit-generation anchor block: each hero's FIXED visual reference
 * (`imageHint`). The wardrobe generator only sees `promptHint` otherwise (see
 * heroesUserBlock), so it would INVENT clothing blind to a hero's canonical
 * imageHint — e.g. the default hero's "pull bleu et pantalon beige" — while
 * `heroesImageLine` injects that same imageHint clause into the SAME image
 * prompt, producing two contradictory outfits at beat 0 (no reference image yet
 * to arbitrate). Feeding the imageHints here + instructing verbatim reuse (see
 * buildSystem) makes the generated outfit and heroesImageLine agree by
 * construction. Heroes whose imageHint fixes no clothing get invented clothing.
 * "" when there is no hero.
 */
export function heroesVisualAnchorBlock(heroes: HeroContext[]): string {
  const lines = heroes
    .map((h) => (h.imageHint ? `- ${h.label} : ${h.imageHint}` : ""))
    .filter(Boolean);
  if (lines.length === 0) {
    return "";
  }
  return (
    "Repères visuels déjà fixés des héros (reprends TELS QUELS les vêtements " +
    "qui y figurent, n'invente des vêtements que pour un héros qui n'en a " +
    `pas) :\n${lines.join("\n")}`
  );
}

/**
 * The PRIMARY hero's name, threaded into the safety validation (codex #5). The
 * named-hero check is a hard contract for `heroes[0]` only; secondaries are not
 * validation-required (a 5-sentence story can't always name everyone without
 * hurting readability).
 */
export function primaryHeroName(heroes: HeroContext[]): string {
  return heroes[0]?.label ?? "";
}
