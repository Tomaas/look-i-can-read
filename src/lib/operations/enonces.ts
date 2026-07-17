/**
 * Énoncés à gabarits (décision eng-review D11-C) — le monde d'Arsène dans
 * les nombres, SANS LLM : des phrases déterministes assemblées depuis des
 * gabarits fixes + les entités de la famille (héros, doudou), seedées.
 *
 * Garde-fou de sobriété : UNE phrase courte au-dessus de l'opération,
 * jamais de mini-histoire. Les mots sont calmes par construction (ranger,
 * apporter, cueillir…) — aucun terme de forbidden-terms.ts ne peut
 * apparaître puisque rien n'est généré librement.
 *
 * Pur : les noms d'entités sont PASSÉS en argument (jamais lus en DB ici).
 */

import { mulberry32 } from "~/lib/operations/generator";
import type { GeneratedOperation } from "~/lib/operations/types";

export interface EnonceEntities {
  /** Prénom du héros (obligatoire — l'enfant de la famille). */
  hero: string;
  /** Nom du doudou, s'il existe. */
  doudou?: string;
}

/** Objets calmes et dénombrables, au pluriel (on en manipule toujours ≥ 2). */
const OBJETS = [
  "marrons",
  "billes",
  "coquillages",
  "feuilles",
  "cailloux",
  "pommes",
  "fleurs",
  "plumes",
  "noisettes",
  "boutons",
] as const;

function pick<T>(rand: () => number, items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)];
}

/**
 * Une phrase d'habillage pour l'opération, déterministe (op.seed).
 * Le compagnon (doudou) n'apparaît que s'il est fourni.
 */
/** Décorrèle le PRNG des énoncés du flux du générateur (même seed d'op). */
const ENONCE_SEED_SALT = 0x5f3759df;

export function enonceFor(
  op: GeneratedOperation,
  entities: EnonceEntities,
): string {
  const rand = mulberry32(op.seed ^ ENONCE_SEED_SALT);
  const objet = pick(rand, OBJETS);
  const hero = entities.hero;
  const compagnon = entities.doudou;

  if (op.op === "addition") {
    return compagnon && rand() < 0.5
      ? `${hero} range ${op.a} ${objet}, ${compagnon} en apporte ${op.b}.`
      : `${hero} a ${op.a} ${objet} et en trouve encore ${op.b}.`;
  }

  if (op.op === "soustraction") {
    return compagnon && rand() < 0.5
      ? `${hero} a ${op.a} ${objet} et en donne ${op.b} à ${compagnon}.`
      : `${hero} a cueilli ${op.a} ${objet} et en range ${op.b} dans sa boîte.`;
  }

  // multiplication
  return `${hero} remplit ${op.b} paniers de ${op.a} ${objet}.`;
}
