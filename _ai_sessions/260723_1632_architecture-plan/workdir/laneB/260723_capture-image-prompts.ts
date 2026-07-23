/**
 * BEFORE-capture for candidate 3 (extract buildSegmentImagePrompt).
 *
 * Replicates VERBATIM the inline prompt assembly of
 * src/server/dynamic-functions.ts (generateSegmentImage, pre-refactor) over a
 * representative fixture set, and prints the assembled prompts as JSON. Run
 * BEFORE the refactor to freeze the expected bytes, and AFTER (against the
 * extracted builder, see the golden) to prove byte-identity.
 *
 *   bun run _ai_sessions/260723_1632_architecture-plan/workdir/laneB/260723_capture-image-prompts.ts
 */

import { imageStyleSuffix } from "~/config/style";
import { doudouImageLine } from "~/server/providers/text/doudou-prompt";
import {
  heroesImageLine,
  outfitImageLine,
} from "~/server/providers/text/hero-prompt";
import type { DoudouContext, HeroContext } from "~/server/providers/types";

interface Fixture {
  name: string;
  doudous: DoudouContext[];
  hasReference: boolean;
  heroes: HeroContext[];
  outfit: string | null;
  paragraphs: string[];
  place: { label: string; promptHint: string };
  sceneHint: string | null;
  visualWorld: string | null;
}

const HERO: HeroContext = {
  imageHint: "Jules est un petit garçon de 5 ans aux cheveux bruns.",
  label: "Jules",
  promptHint: "Jules, un petit garçon de 5 ans, curieux, gentil et malin.",
};
const HERO2: HeroContext = {
  imageHint: "une petite fille aux cheveux bruns",
  label: "Mona",
  promptHint: "Mona, la grande sœur de Jules.",
};
const DOUDOU: DoudouContext = {
  imageHint: "un petit lapin en tissu beige",
  label: "Lapinou",
  promptHint: "Lapinou, son doudou lapin tout calme",
};
const DOUDOU2: DoudouContext = {
  imageHint: "un ours en peluche brun",
  label: "Nounours",
  promptHint: "Nounours, son ours en peluche",
};

export const FIXTURES: Fixture[] = [
  {
    doudous: [DOUDOU],
    hasReference: false,
    heroes: [HERO],
    name: "beat0 — no reference, place-hint fallback, no visual world",
    outfit: null,
    paragraphs: [
      "Jules marche vers le grand chêne.",
      "Puis il ramasse une jolie feuille.",
    ],
    place: { label: "La forêt", promptHint: "dans une forêt ensoleillée" },
    sceneHint: null,
    visualWorld: null,
  },
  {
    doudous: [DOUDOU, DOUDOU2],
    hasReference: true,
    heroes: [HERO, HERO2],
    name: "later beat — reference, sceneHint PRIORITY over place, visual world, outfit, multi hero, doudou sliced to 1",
    outfit: "Jules en pull bleu ; Mona en veste verte",
    paragraphs: ["Alors la barque glisse sur l'eau calme."],
    place: { label: "La forêt", promptHint: "dans une forêt ensoleillée" },
    sceneHint: "Une rivière paisible au soleil couchant, une petite barque",
    visualWorld: "fin d'après-midi d'été, lumière dorée, ciel dégagé",
  },
  {
    doudous: [],
    hasReference: false,
    heroes: [HERO],
    name: "no sceneHint, empty place hint — scene line omitted",
    outfit: null,
    paragraphs: ["Jules regarde les étoiles."],
    place: { label: "", promptHint: "" },
    sceneHint: null,
    visualWorld: null,
  },
  {
    doudous: [DOUDOU],
    hasReference: true,
    heroes: [HERO],
    name: "visual-world DEFAULT case — no sceneHint, place + visualWorld present",
    outfit: null,
    paragraphs: ["Puis Jules retrouve le sentier."],
    place: { label: "La forêt", promptHint: "dans une forêt ensoleillée" },
    sceneHint: null,
    visualWorld: "matin de printemps, lumière claire",
  },
];

// ── VERBATIM copy of the inline assembly (dynamic-functions.ts:745–789) ──────
function assembleBefore(f: Fixture): string {
  const segment = { paragraphs: f.paragraphs, sceneHint: f.sceneHint };
  const story = { visualWorld: f.visualWorld };
  const { heroes, place, doudous, outfit } = f;
  const referenceImage = f.hasReference ? new Uint8Array([1]) : undefined;

  let sceneLine = "";
  if (segment.sceneHint) {
    sceneLine = `La scène : ${segment.sceneHint}`;
  } else if (place.promptHint) {
    sceneLine = `La scène se passe ${place.promptHint}.`;
  }

  const ambianceLine = story.visualWorld
    ? `Ambiance générale de l'histoire (sauf indication contraire de la scène) : ${story.visualWorld}.`
    : "";

  const outfitLine = outfitImageLine(outfit);

  const prompt = [
    referenceImage
      ? "Reprends EXACTEMENT les personnages de l'image fournie (visages, coiffures, vêtements, proportions) et son style — mais PAS son décor ni son cadrage. Dessine le lieu où l'histoire se trouve MAINTENANT (voir « La scène » ci-dessous), même s'il ne ressemble plus à celui de l'image fournie :"
      : "Illustration pour un bout d'une histoire d'enfant, tendre et rassurante.",
    segment.paragraphs.join(" "),
    sceneLine,
    ambianceLine,
    outfitLine,
    heroesImageLine(heroes),
    doudouImageLine(doudous.slice(0, 1)),
    imageStyleSuffix,
  ]
    .filter(Boolean)
    .join(" ");
  return prompt;
}

const out: Record<string, string> = {};
for (const f of FIXTURES) {
  out[f.name] = assembleBefore(f);
}
console.log(JSON.stringify(out, null, 2));
