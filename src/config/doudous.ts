/**
 * Selectable doudous (comforting companions). A doudou is a soft, reassuring
 * presence that accompanies the hero through the story and comes home safe — it
 * is NEVER a source of jeopardy, never lost, never in danger (the calm contract).
 *
 * `promptHint` is injected into the story TEXT prompt (how the doudou is
 * present and comforting); `imageHint` is injected into the IMAGE prompt (how
 * it looks beside the hero in the illustration). `label` + `emoji` drive the
 * picker button.
 *
 * This file is the IMMUTABLE legacy fallback (exactly like `src/config/places.ts`):
 * the DB `doudous` table is seeded from it idempotently, and a story's frozen
 * snapshot falls back to it by id so editing/deleting a doudou never alters an
 * already-created story.
 */
export interface Doudou {
  emoji: string;
  id: string;
  imageHint: string;
  label: string;
  promptHint: string;
}

export const doudous: Doudou[] = [
  {
    emoji: "🧸",
    id: "doudou-tout-doux",
    imageHint:
      "un doudou en tissu moelleux, aux couleurs pastel et tendres, blotti contre l'enfant",
    label: "un doudou tout doux",
    promptHint:
      "un doudou moelleux et tout chaud, qui accompagne le héros, le rassure d'une petite présence tendre, et reste blotti près de lui jusqu'au bout",
  },
  {
    emoji: "🐰",
    id: "petit-lapin",
    imageHint:
      "une peluche lapin aux longues oreilles tombantes, couleur crème, serrée contre l'enfant",
    label: "un petit lapin en peluche",
    promptHint:
      "un petit lapin en peluche aux longues oreilles souples, compagnon calme et câlin qui suit le héros pas à pas et veille tendrement sur lui",
  },
  {
    emoji: "🐻",
    id: "ours-calin",
    imageHint:
      "un ours en peluche tout rond et moelleux, au pelage beige, qui fait un câlin à l'enfant",
    label: "un ours câlin",
    promptHint:
      "un ours en peluche tout rond et câlin, présence chaude et rassurante qui marche au côté du héros et lui offre de gros câlins",
  },
  {
    emoji: "🐱",
    id: "petit-chat",
    imageHint:
      "un petit chat en peluche au pelage gris, lové paisiblement près de l'enfant",
    label: "un petit chat tout doux",
    promptHint:
      "un petit chat en peluche au pelage soyeux, qui ronronne tout bas et reste lové près du héros pour le réconforter",
  },
  {
    emoji: "⭐",
    id: "etoile-douce",
    imageHint:
      "une étoile en tissu moelleuse, jaune pâle, qui scintille près de l'enfant",
    label: "une étoile douce",
    promptHint:
      "une petite étoile en tissu qui brille faiblement, veilleuse tendre qui accompagne le héros et répand une lumière calme et rassurante",
  },
];

export function findDoudou(id: string): Doudou | undefined {
  return doudous.find((d) => d.id === id);
}
