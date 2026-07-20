/**
 * GOLDEN single-item prompt-identity assertion (codex #4).
 *
 * The CP/CE1 readability work depends on the EXACT current wording of the hero +
 * element prompt lines. The multi-hero/multi-element refactor MUST keep a single
 * hero + single element producing BYTE-IDENTICAL prompt text to pre-multi `main`.
 * This script pins that contract for BOTH the classic and dynamic providers.
 *
 * No test runner is configured in this app, so this is a standalone runnable
 * assertion: `bun run src/server/providers/text/__tests__/prompt-identity.golden.ts`
 * (wired as `bun run test:golden`). It exits non-zero on any mismatch.
 *
 * The expected strings below are the LITERALS the providers emitted on main:
 *   classic + dynamic user prompt:  `Héros : ${description}`
 *                                   `Élément surprise : ${promptHint}.`
 *   image prompt hero line:         `${imageHint}`  (was `hero?.imageHint ?? ""`)
 */

import { findLegacyHero } from "~/config/characters";
import { elementsUserBlock } from "~/server/providers/text/element-prompt";
import {
  heroesImageLine,
  heroesUserBlock,
  heroesVisualAnchorBlock,
  outfitImageLine,
} from "~/server/providers/text/hero-prompt";
import type { ElementContext, HeroContext } from "~/server/providers/types";

const HERO: HeroContext = {
  imageHint: "Jules est un petit garçon de 5 ans aux cheveux bruns.",
  label: "Jules",
  promptHint:
    "Jules, un petit garçon de 5 ans, curieux, gentil et malin. Il adore les animaux, construire des cabanes et regarder les étoiles.",
};
const ELEMENT: ElementContext = {
  label: "un sushi géant",
  promptHint: "un sushi géant et rigolo",
};

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

// ── Single hero / single element: BYTE-IDENTICAL to pre-multi main ───────────
expectEqual(
  "single hero user line == 'Héros : ' + description",
  heroesUserBlock([HERO]),
  `Héros : ${HERO.promptHint}`
);
expectEqual(
  "single element user line == 'Élément surprise : ' + promptHint + '.'",
  elementsUserBlock([ELEMENT]),
  `Élément surprise : ${ELEMENT.promptHint}.`
);
expectEqual(
  "single hero image line == imageHint",
  heroesImageLine([HERO]),
  HERO.imageHint
);

// ── Multi sanity: both heroes/elements named, grouping language present ───────
const HERO2: HeroContext = {
  imageHint: "une petite fille aux cheveux bruns",
  label: "Mona",
  promptHint: "Mona, la grande sœur de Jules, gentille et courageuse.",
};
const ELEMENT2: ElementContext = {
  label: "une clé magique",
  promptHint: "une clé magique qui ouvre des portes surprenantes et douces",
};

const multiHero = heroesUserBlock([HERO, HERO2]);
if (
  multiHero.includes(HERO.promptHint) &&
  multiHero.includes(HERO2.promptHint)
) {
  console.log("✓ multi-hero block contains both descriptions");
} else {
  failures += 1;
  console.error("✗ multi-hero block must contain BOTH guiding descriptions");
}
if (multiHero.includes("Nomme chaque héros")) {
  console.log("✓ multi-hero block carries the naming nudge");
} else {
  failures += 1;
  console.error("✗ multi-hero block must carry the 'name each hero' nudge");
}

const multiElement = elementsUserBlock([ELEMENT, ELEMENT2]);
if (
  multiElement.startsWith("Éléments surprise :") &&
  multiElement.includes(ELEMENT.promptHint) &&
  multiElement.includes(ELEMENT2.promptHint)
) {
  console.log("✓ multi-element block lists both elements");
} else {
  failures += 1;
  console.error(
    "✗ multi-element block must list both elements (plural header)"
  );
}

const multiImage = heroesImageLine([HERO, HERO2]);
if (
  multiImage.includes(HERO.imageHint) &&
  multiImage.includes(HERO2.imageHint)
) {
  console.log("✓ multi-hero image line contains both image hints");
} else {
  failures += 1;
  console.error("✗ multi-hero image line must contain both image hints");
}

// ── Outfit image line: separate line, never touches heroesImageLine identity ──
// The frozen outfit is injected as its OWN image-prompt line (not folded into
// heroesImageLine), so the single-hero byte-identity above stays intact.
if (heroesImageLine([HERO]) === HERO.imageHint) {
  console.log(
    "✓ heroesImageLine still byte-identical (outfit is a separate line)"
  );
} else {
  failures += 1;
  console.error("✗ outfit work must NOT alter heroesImageLine byte-identity");
}
{
  const line = outfitImageLine("Jules en pull bleu ; Mona en veste verte");
  if (
    line.includes("Jules en pull bleu ; Mona en veste verte") &&
    line.includes("IDENTIQUE") &&
    line.includes("référence")
  ) {
    console.log(
      "✓ outfit line carries the wardrobe + keep-identical + reference-override posture"
    );
  } else {
    failures += 1;
    console.error(
      `✗ outfit line missing wardrobe/posture: ${JSON.stringify(line)}`
    );
  }
}
if (outfitImageLine(null) === "" && outfitImageLine("") === "") {
  console.log('✓ outfit line is omitted ("") when there is no frozen outfit');
} else {
  failures += 1;
  console.error(
    '✗ outfit line must be "" for null/empty outfit (graceful fallback)'
  );
}

// ── Outfit-gen anchor: the default hero's clothing reaches the wardrobe prompt ─
// The generator must REUSE clothing already pinned in a hero's imageHint (not
// invent a contradictory one), so its input prompt must carry those tokens.
{
  const hero = findLegacyHero("jules");
  if (hero) {
    const block = heroesVisualAnchorBlock([hero]);
    if (
      block.includes("pull bleu et pantalon beige") &&
      block.includes("reprends TELS QUELS")
    ) {
      console.log(
        "✓ anchor block feeds the hero's canonical clothing to the outfit generator"
      );
    } else {
      failures += 1;
      console.error(
        `✗ anchor block missing the hero's clothing tokens: ${JSON.stringify(block)}`
      );
    }
  } else {
    failures += 1;
    console.error("✗ findLegacyHero('jules') must resolve for the anchor test");
  }
}
if (heroesVisualAnchorBlock([]) === "") {
  console.log('✓ anchor block is "" with no heroes');
} else {
  failures += 1;
  console.error('✗ anchor block must be "" with no heroes');
}

if (failures > 0) {
  console.error(`\nGOLDEN FAILED: ${failures} mismatch(es).`);
  process.exit(1);
}
console.log("\nGOLDEN OK: single hero+element prompt output is unchanged.");
