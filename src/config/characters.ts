/**
 * Selectable heroes — SAMPLE DATA, customize for your family!
 *
 * Replace these with your own child, siblings and friends: this file seeds the
 * `heroes` table on first run, and heroes can also be managed in-app at
 * `/parents/heroes`. The default hero is the one pre-selected in the wizard.
 *
 * `description` is injected into the story prompt so the hero feels right.
 * `emoji` is the fallback avatar shown on the picker button (no images yet).
 */
export interface Character {
  id: string;
  name: string;
  emoji: string;
  description: string;
  // Optional appearance detail injected into image prompts (classic + dynamic)
  // so every illustration of this hero looks consistent.
  imageHint?: string;
  isDefault?: boolean;
}

export const characters: Character[] = [
  {
    id: "jules",
    name: "Jules",
    emoji: "🦊",
    description:
      "Jules, un petit garçon de 5 ans, curieux, gentil et malin. Il adore les animaux, construire des cabanes et regarder les étoiles.",
    // Fixed visual anchors (age, hair, clothes) keep the character recognizable
    // across independently-generated illustrations.
    imageHint:
      "Jules est un petit garçon de 5 ans, cheveux bruns courts, yeux marron, pull bleu et pantalon beige.",
    isDefault: true,
  },
  {
    id: "mona",
    name: "Mona",
    emoji: "🐻",
    description: "Mona, la grande sœur de Jules, gentille et courageuse.",
  },
  {
    id: "zoe",
    name: "Zoé",
    emoji: "🦋",
    description: "Zoé, une copine de Jules, joyeuse et pleine d'idées.",
  },
  {
    id: "nino",
    name: "Nino",
    emoji: "🦁",
    description: "Nino, un copain de Jules, rigolo et plein d'énergie.",
  },
  {
    id: "surprise",
    name: "Pixel",
    emoji: "🐉",
    description:
      "Pixel, un gentil petit dragon merveilleux, curieux et qui adore aider. (C'est le héros « surprise ».)",
  },
];

export const defaultCharacter =
  characters.find((c) => c.isDefault) ?? characters[0];

export function findCharacter(id: string): Character | undefined {
  return characters.find((c) => c.id === id);
}

/**
 * A gentle generic appearance for config heroes that have no `imageHint` of
 * their own (only the default hero does). The DB `heroes.imageHint` column is
 * NOT NULL (mirroring doudous), so the seed needs a non-empty default; a parent
 * can refine it later in the hero form.
 */
export const DEFAULT_HERO_IMAGE_HINT =
  "un enfant doux et attachant au visage tendre";

/**
 * Heroes mapped to the DB `heroes` table shape (`label`/`promptHint`/`imageHint`),
 * REUSING each config id. This is the IMMUTABLE legacy fallback (exactly like
 * `src/config/doudous.ts` for doudous): the DB `heroes` table is seeded from it
 * idempotently, and a story's frozen snapshot falls back to it by id so editing
 * or deleting a hero never alters an already-created story. Config heroes with
 * no `imageHint` get the gentle generic default.
 */
export const legacyHeroes: Array<{
  id: string;
  label: string;
  emoji: string;
  promptHint: string;
  imageHint: string;
}> = characters.map((c) => ({
  id: c.id,
  label: c.name,
  emoji: c.emoji,
  promptHint: c.description,
  imageHint: c.imageHint ?? DEFAULT_HERO_IMAGE_HINT,
}));

/** Legacy hero (DB shape) by id, for the frozen-context config fallback. */
export function findLegacyHero(id: string) {
  return legacyHeroes.find((h) => h.id === id);
}
