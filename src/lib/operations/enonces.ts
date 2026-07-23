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
 * Variété (UX 2026-07-23) : chaque famille tire dans PLUSIEURS gabarits et
 * la multiplication dans plusieurs contenants — plus de « toujours des
 * paniers ». Le tirage reste seedé par l'opération : une série interrompue
 * régénère mot pour mot les mêmes énoncés — à VERSION DE CODE et CONFIG
 * D'ENTITÉS constantes (un déploiement qui change les pools, lui, re-mot
 * les énoncés d'une série en vol ; les opérations, elles, ne bougent pas).
 * Le module héberge aussi
 * varianteDuJour, le tirage jour-par-jour des variantes de l'ÉTAGÈRE
 * (consommé par tray-shelf.tsx) — même monde, même exigence de pureté.
 *
 * Pur : les noms d'entités sont PASSÉS en argument (jamais lus en DB ici).
 */

import { mulberry32 } from "~/lib/operations/generator";
import type { GeneratedOperation } from "~/lib/operations/types";

export interface EnonceEntities {
  /** Nom du doudou, s'il existe. */
  doudou?: string;
  /** Prénom du héros (obligatoire — l'enfant de la famille). */
  hero: string;
}

/** Objets calmes et dénombrables, au pluriel (on en manipule toujours ≥ 2).
    Exporté pour que le golden dérive son normaliseur de gabarits d'ICI —
    un objet ajouté ne peut pas faire dériver le test silencieusement. */
export const OBJETS = [
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

/** Contenants calmes pour la multiplication, au pluriel (toujours ≥ 2). */
const CONTENANTS = ["paniers", "boîtes", "corbeilles", "sacs", "bols"] as const;

function pick<T>(rand: () => number, items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)];
}

/**
 * Une phrase d'habillage pour l'opération, déterministe (op.seed).
 * Le compagnon (doudou) n'apparaît que s'il est fourni.
 */
/** Décorrèle le PRNG des énoncés du flux du générateur (même seed d'op). */
const ENONCE_SEED_SALT = 0x5f_37_59_df;

export function enonceFor(
  op: GeneratedOperation,
  entities: EnonceEntities
): string {
  const rand = mulberry32(op.seed ^ ENONCE_SEED_SALT);
  const objet = pick(rand, OBJETS);
  const { hero, doudou: compagnon } = entities;
  // Tirage de branche TOUJOURS consommé, doudou ou pas : la présence du
  // compagnon ne décale jamais le flux PRNG — le libellé des variantes solo
  // est invariant à la config d'entités (red-team 2026-07-23).
  const coin = rand();

  if (op.op === "addition") {
    if (compagnon && coin < 0.5) {
      return pick(rand, [
        `${hero} range ${op.a} ${objet}, ${compagnon} en apporte ${op.b}.`,
        `${hero} pose ${op.a} ${objet}, ${compagnon} en pose ${op.b} à côté.`,
      ]);
    }
    return pick(rand, [
      `${hero} a ${op.a} ${objet} et en trouve encore ${op.b}.`,
      `${hero} ramasse ${op.a} ${objet}, puis encore ${op.b}.`,
      `${hero} range ${op.a} ${objet} et encore ${op.b}.`,
    ]);
  }

  if (op.op === "soustraction") {
    if (compagnon && coin < 0.5) {
      return pick(rand, [
        `${hero} a ${op.a} ${objet} et en donne ${op.b} à ${compagnon}.`,
        `${hero} a ${op.a} ${objet} et en offre ${op.b} à ${compagnon}.`,
        `${hero} a ${op.a} ${objet} et en prête ${op.b} à ${compagnon}.`,
      ]);
    }
    return pick(rand, [
      `${hero} a cueilli ${op.a} ${objet} et en range ${op.b} dans sa boîte.`,
      `${hero} a ${op.a} ${objet} et en pose ${op.b} sur l'étagère.`,
      `${hero} a ${op.a} ${objet} et en rapporte ${op.b} à la maison.`,
    ]);
  }

  // multiplication — le contenant varie aussi (jamais « toujours des paniers »).
  const contenant = pick(rand, CONTENANTS);
  return pick(rand, [
    `${hero} remplit ${op.b} ${contenant} de ${op.a} ${objet}.`,
    `${hero} prépare ${op.b} ${contenant} de ${op.a} ${objet}.`,
  ]);
}

/**
 * Variante « du jour » d'un plateau de l'étagère (UX 2026-07-23) : les scènes
 * ne sont plus figées à vie — la variante change avec le JOUR (l'étagère est
 * préparée pendant la nuit, comme les plateaux d'une classe), jamais sous les
 * yeux de l'enfant : même jour → même étagère, aucun flicker, un rendu
 * déterministe et testable. `jourKey` est une clé de jour locale
 * (ex. « 2026-7-23 ») fournie par l'appelant — la lib reste pure.
 */
export function varianteDuJour(
  famille: string,
  jourKey: string,
  count: number
): number {
  if (count <= 1) {
    return 0;
  }
  const graine = `${famille}:${jourKey}`;
  let h = 0;
  for (let i = 0; i < graine.length; i += 1) {
    // Petit hachage polynomial sans bitwise (h reste < 2^32, exact en double).
    h = (h * 31 + graine.charCodeAt(i)) % 4_294_967_296;
  }
  return h % count;
}
