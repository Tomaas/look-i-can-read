/**
 * READING-AIDS assertion script — lettres muettes + liaisons.
 *
 * Pins the annotation rules behind the reader's reading aids. Golden format:
 * silent runs in parentheses, mandatory-liaison gaps as ‿ — every expected
 * string below was hand-checked against the actual pronunciation before
 * being pinned (précision > rappel: a wrong gray letter or arc is a bug, a
 * missing one is acceptable recall loss).
 *
 * No test runner is configured in this app, so this is a standalone runnable
 * assertion (same pattern as media-store.golden.ts):
 *   bun run src/lib/reading-aids/__tests__/reading-aids.golden.ts
 * (wired as `bun run test:reading-aids`). Exits non-zero on any failure.
 * The module is pure (no env import) — no SKIP_ENV_VALIDATION needed.
 */

import {
  annotateParagraph,
  annotationToPlainText,
  annotationToString,
} from "~/lib/reading-aids";
import {
  H_ASPIRE_WORDS,
  H_MUET_WORDS,
  SIGHT_WORD_MASKS,
} from "~/lib/reading-aids/lexicon";

let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) {
    console.log(`✓ ${name}`);
  } else {
    failures += 1;
    console.error(`✗ ${name}${detail ? `\n  ${detail}` : ""}`);
  }
}

const corpus: string[] = [];
function gold(input: string, expected: string) {
  corpus.push(input);
  const got = annotationToString(annotateParagraph(input));
  check(`"${input}" → "${expected}"`, got === expected, `got "${got}"`);
}

/* ------------------------- Liaisons obligatoires ------------------------- */

gold("Ils arrivent.", "Ils‿arriv(ent).");
gold("nous avons", "nous‿avon(s)");
gold("ils ont", "ils‿on(t)");
gold("on a", "on‿a");
gold("Les amis jouent.", "Les‿ami(s) jou(ent).");
gold("deux oiseaux", "deux‿oiseau(x)");
gold("ses deux amis", "se(s) deux‿ami(s)");
gold("un petit ours", "un petit‿ours");
gold("un grand arbre", "un grand‿arbr(e)");
gold("des petites oreilles", "de(s) petit(e)s‿oreill(es)");
gold("dans une forêt", "dans‿un(e) forê(t)");
gold("très utile", "très‿util(e)");
gold("tout à coup", "tout‿à cou(p)");
gold("quand il pleut", "quand‿il pleu(t)");
gold("bien au chaud", "bien‿au chau(d)");
gold("chez Adèle", "chez‿Adèl(e)");
gold("C'est un hérisson.", "C'e(s)t‿un (h)érisson.");
gold("les yeux", "les‿yeu(x)");
gold("les heures", "les‿(h)eur(es)");
gold(
  "Elles écoutent, puis elles chantent.",
  "Ell(e)s‿écout(ent), pui(s) ell(es) chant(ent)."
);

/* -------------------- Liaisons refusées (précision) ---------------------- */

// Adjectif attribut: pas de déterminant devant → pas d'arc.
gold("Il est grand aussi.", "Il e(st) gran(d) aussi.");
// H aspiré: default-deny, jamais de liaison vers un h inconnu.
gold("les hiboux", "le(s) (h)ibou(x)");
gold("le hibou", "le (h)ibou");
// « et » ne liaise jamais.
gold("et alors", "e(t) alor(s)");
// Liaison facultative (non obligatoire) → pas d'arc, précision d'abord.
gold("sept ours", "sept ours");
// « plus » ambigu (négatif vs comparatif) → ni arc ni gris.
gold("Je n'en veux plus.", "Je n'en veu(x) plus.");
// La ponctuation tue la liaison.
gold("les, amis", "le(s), ami(s)");
// Les chiffres ne liaisent pas.
gold("3 amis", "3 ami(s)");

/* --------------------------- Lettres muettes ----------------------------- */

// -ent: forme verbale non ambiguë (lexique) OU ils/elles → verbe entier ;
// lexique nom/adverbe → t seul ; sinon RIEN.
gold("doucement", "doucemen(t)");
gold("vraiment", "vraimen(t)");
gold("moment", "momen(t)");
// Verbes pluriels après un sujet nommé (le cas réel des histoires multi-héros).
gold(
  "Adèle et Justine arrivent au parc.",
  "Adèl(e) e(t) Justin(e) arriv(ent) au parc."
);
gold(
  "Adèle et Justine s'assoient là.",
  "Adèl(e) e(t) Justin(e) s'assoi(ent) là."
);
gold("Les tortues montent.", "Le(s) tortu(es) mont(ent).");
// Contre-exemples : nom en -ent → t seul ; forme ambiguë hors lexique → rien.
gold("le serpent avance", "le serpen(t) avanc(e)");
gold("Il est content.", "Il e(st) conten(t).");
gold("Les poules couvent.", "Le(s) poul(es) couvent.");

// « plus » contextuel : s gris devant consonne (h aspiré connu inclus)…
gold("le plus joli coin du parc", "le plu(s) joli coin du parc");
gold("un joli pont plus haut", "un joli pon(t) plu(s) (h)au(t)");
gold(
  "Ils ne montent plus vers le pont.",
  "Il(s) ne mont(ent) plu(s) ver(s) le pon(t)."
);
// …mais RIEN dans les contextes ambigus (fin de phrase, voyelle/h muet =
// liaison possible, quantité, arithmétique).
gold("plus agréable", "plus agréabl(e)");
gold("Il en veut plus que moi.", "Il en veu(t) plus que moi.");
gold("plus de jeux", "plus de jeu(x)");
gold("deux plus deux", "deu(x) plus deu(x)");
// e muet + pluriels.
gold("une pomme", "un(e) pomm(e)");
gold("des feuilles vertes", "de(s) feuill(es) vert(es)");
// Cascade consonne + s pluriel.
gold("les chats", "le(s) cha(ts)");
gold("les champs", "le(s) cham(ps)");
// Consonnes finales + exceptions prononcées.
gold("le nez", "le ne(z)");
gold("assez", "asse(z)");
gold("beaucoup", "beaucou(p)");
gold("le loup", "le lou(p)");
gold("un étang", "un‿étan(g)");
gold("son poing", "son poin(g)");
gold("le camping", "le camping");
gold("le renard", "le renar(d)");
gold("le sud", "le sud");
gold("six", "six");
// Sight words.
gold("longtemps", "lon(g)tem(ps)");
gold("le gentil renard", "le genti(l) renar(d)");
// Élision + h, trait d'union, ponctuation riche.
gold("l'histoire", "l'(h)istoir(e)");
gold("aujourd'hui", "aujourd'(h)ui");
gold("peut-être", "peut-êtr(e)");
gold("« Oui ! » dit le renard.", "« Oui ! » di(t) le renar(d).");

/* ------------------------- Checks structurels ---------------------------- */

for (const input of corpus) {
  const plain = annotationToPlainText(annotateParagraph(input));
  check(`concat invariant: "${input}"`, plain === input, `got "${plain}"`);
}

check(
  "H_MUET_WORDS et H_ASPIRE_WORDS sont disjoints",
  [...H_ASPIRE_WORDS].every((w) => !H_MUET_WORDS.has(w))
);

for (const word of H_ASPIRE_WORDS) {
  const tokens = annotateParagraph(`les ${word}`);
  const arc = tokens.some((t) => t.kind === "gap" && t.liaison);
  check(`h aspiré « ${word} » bloque la liaison après « les »`, !arc);
}

for (const [word, mask] of SIGHT_WORD_MASKS) {
  check(
    `sight mask « ${word} » a la bonne longueur et alphabet`,
    mask.length === word.length && /^[.x]+$/.test(mask),
    `mask "${mask}"`
  );
}

if (failures > 0) {
  console.error(`\n${failures} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll reading-aids assertions passed");
