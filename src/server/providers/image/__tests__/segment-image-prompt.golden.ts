/**
 * GOLDEN segment-image prompt-identity assertion (plan candidate 3).
 *
 * `buildSegmentImagePrompt` extracts the illustration prompt that
 * `dynamic-functions.ts` used to assemble inline (scene · ambiance · outfit ·
 * heroes · doudou · style). The refactor's contract: for the same inputs the
 * assembled prompt is BYTE-IDENTICAL to the pre-refactor inline code. The
 * EXPECTED strings below were captured by running the VERBATIM pre-refactor
 * assembly over these exact fixtures (see the lane report in _ai_sessions/) —
 * they are the frozen "before" bytes, not a re-derivation.
 *
 * The fixture set covers the documented priority rules:
 *  - sceneHint PRIORITY over the frozen place hint;
 *  - place-hint fallback when the beat has no sceneHint;
 *  - visual_world as the DEFAULT ambiance (present/absent);
 *  - reference vs no-reference opening clause;
 *  - frozen outfit line (present/absent);
 *  - multi-hero grouping + doudou sliced to the FIRST one;
 *  - scene line omitted entirely when neither sceneHint nor place hint exist.
 *
 * No test runner is configured in this app, so this is a standalone runnable
 * assertion (same pattern as prompt-identity.golden.ts, chained into
 * `bun run test:golden`). It exits non-zero on any mismatch. Pure — no env,
 * no DB, no network.
 */

import { buildSegmentImagePrompt } from "~/server/providers/image/segment-prompt";
import type { DoudouContext, HeroContext } from "~/server/providers/types";

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
const PLACE = { label: "La forêt", promptHint: "dans une forêt ensoleillée" };

let failures = 0;
function expectEqual(name: string, actual: string, expected: string) {
  if (actual === expected) {
    console.log(`✓ ${name}`);
  } else {
    failures += 1;
    console.error(
      `✗ ${name}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`
    );
  }
}

// ── 1. Beat 0: no reference, place-hint fallback, no visual world ────────────
expectEqual(
  "beat0 — no reference, place-hint fallback, no visual world",
  buildSegmentImagePrompt(
    { visualWorld: null },
    {
      paragraphs: [
        "Jules marche vers le grand chêne.",
        "Puis il ramasse une jolie feuille.",
      ],
      sceneHint: null,
    },
    false,
    { doudous: [DOUDOU], heroes: [HERO], outfit: null, place: PLACE }
  ),
  "Illustration pour un bout d'une histoire d'enfant, tendre et rassurante. Jules marche vers le grand chêne. Puis il ramasse une jolie feuille. La scène se passe dans une forêt ensoleillée. Jules est un petit garçon de 5 ans aux cheveux bruns. Avec un petit lapin en tissu beige, tendrement près de l'enfant. Style studio Ghibli. Pas de texte dans l'image. Pas de visage photoréaliste. Ambiance calme, rassurante et merveilleuse, adaptée à un enfant de 5 ans."
);

// ── 2. Later beat: sceneHint PRIORITY over place, full context ───────────────
expectEqual(
  "later beat — reference, sceneHint priority, visual world, outfit, multi hero, doudou sliced to 1",
  buildSegmentImagePrompt(
    { visualWorld: "fin d'après-midi d'été, lumière dorée, ciel dégagé" },
    {
      paragraphs: ["Alors la barque glisse sur l'eau calme."],
      sceneHint: "Une rivière paisible au soleil couchant, une petite barque",
    },
    true,
    {
      doudous: [DOUDOU, DOUDOU2],
      heroes: [HERO, HERO2],
      outfit: "Jules en pull bleu ; Mona en veste verte",
      place: PLACE,
    }
  ),
  "Reprends EXACTEMENT les personnages de l'image fournie (visages, coiffures, vêtements, proportions) et son style — mais PAS son décor ni son cadrage. Dessine le lieu où l'histoire se trouve MAINTENANT (voir « La scène » ci-dessous), même s'il ne ressemble plus à celui de l'image fournie : Alors la barque glisse sur l'eau calme. La scène : Une rivière paisible au soleil couchant, une petite barque Ambiance générale de l'histoire (sauf indication contraire de la scène) : fin d'après-midi d'été, lumière dorée, ciel dégagé. Tenue des personnages, à garder IDENTIQUE d'une image à l'autre (sauf si l'image de référence montre déjà leurs vêtements) : Jules en pull bleu ; Mona en veste verte. Jules est un petit garçon de 5 ans aux cheveux bruns. et une petite fille aux cheveux bruns, tous ensemble dans la scène. Avec un petit lapin en tissu beige, tendrement près de l'enfant. Style studio Ghibli. Pas de texte dans l'image. Pas de visage photoréaliste. Ambiance calme, rassurante et merveilleuse, adaptée à un enfant de 5 ans."
);

// ── 3. No sceneHint AND empty place hint → scene line omitted ────────────────
expectEqual(
  "no sceneHint, empty place hint — scene line omitted",
  buildSegmentImagePrompt(
    { visualWorld: null },
    { paragraphs: ["Jules regarde les étoiles."], sceneHint: null },
    false,
    {
      doudous: [],
      heroes: [HERO],
      outfit: null,
      place: { label: "", promptHint: "" },
    }
  ),
  "Illustration pour un bout d'une histoire d'enfant, tendre et rassurante. Jules regarde les étoiles. Jules est un petit garçon de 5 ans aux cheveux bruns. Style studio Ghibli. Pas de texte dans l'image. Pas de visage photoréaliste. Ambiance calme, rassurante et merveilleuse, adaptée à un enfant de 5 ans."
);

// ── 4. visual_world DEFAULT: no sceneHint, place + visualWorld present ───────
expectEqual(
  "visual-world DEFAULT case — no sceneHint, place + visualWorld present",
  buildSegmentImagePrompt(
    { visualWorld: "matin de printemps, lumière claire" },
    { paragraphs: ["Puis Jules retrouve le sentier."], sceneHint: null },
    true,
    { doudous: [DOUDOU], heroes: [HERO], outfit: null, place: PLACE }
  ),
  "Reprends EXACTEMENT les personnages de l'image fournie (visages, coiffures, vêtements, proportions) et son style — mais PAS son décor ni son cadrage. Dessine le lieu où l'histoire se trouve MAINTENANT (voir « La scène » ci-dessous), même s'il ne ressemble plus à celui de l'image fournie : Puis Jules retrouve le sentier. La scène se passe dans une forêt ensoleillée. Ambiance générale de l'histoire (sauf indication contraire de la scène) : matin de printemps, lumière claire. Jules est un petit garçon de 5 ans aux cheveux bruns. Avec un petit lapin en tissu beige, tendrement près de l'enfant. Style studio Ghibli. Pas de texte dans l'image. Pas de visage photoréaliste. Ambiance calme, rassurante et merveilleuse, adaptée à un enfant de 5 ans."
);

if (failures > 0) {
  console.error(`\nSEGMENT-IMAGE GOLDEN FAILED: ${failures} mismatch(es).`);
  process.exit(1);
}
console.log(
  "\nSEGMENT-IMAGE GOLDEN OK: the extracted builder is byte-identical to the pre-refactor inline prompt."
);
