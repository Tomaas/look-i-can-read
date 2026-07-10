/**
 * Selectable "strange elements" that spark the story. `promptHint` is injected
 * into the story prompt; `label` and `emoji` drive the picker button.
 */
export interface StoryElement {
  id: string;
  label: string;
  emoji: string;
  promptHint: string;
}

export const elements: StoryElement[] = [
  {
    id: "sushi-geant",
    label: "un sushi géant",
    emoji: "🍣",
    promptHint: "un sushi géant et rigolo",
  },
  {
    id: "cle-magique",
    label: "une clé magique",
    emoji: "🗝️",
    promptHint:
      "une clé magique qui ouvre des portes surprenantes vers des endroits merveilleux",
  },
  {
    id: "animal-parle",
    label: "un animal qui parle",
    emoji: "🐦",
    promptHint: "un petit animal qui parle gentiment",
  },
  {
    id: "machine-bizarre",
    label: "une machine bizarre",
    emoji: "⚙️",
    promptHint: "une machine bizarre et amusante, pleine de boutons rigolos",
  },
  {
    id: "etoile-tombee",
    label: "une étoile tombée du ciel",
    emoji: "⭐",
    promptHint: "une étoile tombée du ciel, toute brillante et amicale",
  },
  {
    id: "tresor",
    label: "un trésor",
    emoji: "💎",
    promptHint: "un trésor scintillant caché tout près",
  },
];

export function findElement(id: string): StoryElement | undefined {
  return elements.find((e) => e.id === id);
}

/**
 * Elements mapped to the DB `elements` table shape (`label`/`promptHint`),
 * REUSING each config id. The config already uses those field names, so this is
 * a straight projection. IMMUTABLE legacy fallback (like `src/config/places.ts`
 * for places): the DB `elements` table is seeded from it idempotently, and a
 * story's frozen snapshot falls back to it by id so editing/deleting an element
 * never alters an already-created story.
 */
export const legacyElements: Array<{
  id: string;
  label: string;
  emoji: string;
  promptHint: string;
}> = elements.map((e) => ({
  id: e.id,
  label: e.label,
  emoji: e.emoji,
  promptHint: e.promptHint,
}));

/** Legacy element (DB shape) by id, for the frozen-context config fallback. */
export function findLegacyElement(id: string) {
  return legacyElements.find((e) => e.id === id);
}
