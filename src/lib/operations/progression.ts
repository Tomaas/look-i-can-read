/**
 * Échelle des paliers — purement DESCRIPTIVE (décision eng-review T2-A).
 *
 * Aucune évaluation de l'enfant ne vit ici : pas d'EMA, pas de mesure de
 * justesse, pas de temps (un confort mesuré au chrono serait un timer
 * caché — interdit par la contrainte calme). Le palier courant est un choix
 * du parent (/parents/calcul), comme l'éducatrice décide des présentations ;
 * le fondu du matériel est attaché au palier et ne redescend donc jamais
 * tout seul (le retour des timbres après une séance difficile serait un
 * signal d'échec visible).
 *
 * L'ordre suit la progression Montessori validée au design doc :
 * additions sans retenue → avec retenues → soustractions → multiplications.
 */

import type { Operation, Palier } from "~/lib/operations/types";

export const DEFAULT_SERIE_SIZE = 3;
/** Bornes de la taille de série — source unique pour l'UI ET la validation zod. */
export const MIN_SERIE_SIZE = 1;
export const MAX_SERIE_SIZE = 6;

export const PALIERS: readonly Palier[] = [
  {
    constraints: {
      aDigits: { max: 2, min: 2 },
      bDigits: { max: 2, min: 1 },
      carries: "none",
      op: "addition",
    },
    fondu: "opaque",
    id: "add-sans-retenue",
    label: "Additions posées sans retenue",
    ordre: 1,
  },
  {
    constraints: {
      aDigits: { max: 2, min: 2 },
      bDigits: { max: 2, min: 2 },
      carries: "some",
      op: "addition",
    },
    fondu: "opaque",
    id: "add-retenue",
    label: "Additions posées avec retenue",
    ordre: 2,
  },
  {
    constraints: {
      aDigits: { max: 4, min: 3 },
      bDigits: { max: 3, min: 2 },
      carries: "any",
      op: "addition",
    },
    fondu: "translucide",
    id: "add-grands-nombres",
    label: "Additions posées jusqu'aux milliers",
    ordre: 3,
  },
  {
    constraints: {
      aDigits: { max: 2, min: 2 },
      bDigits: { max: 2, min: 1 },
      borrows: "none",
      op: "soustraction",
    },
    fondu: "opaque",
    id: "sous-sans-emprunt",
    label: "Soustractions posées sans emprunt",
    ordre: 4,
  },
  {
    constraints: {
      aDigits: { max: 3, min: 2 },
      bDigits: { max: 2, min: 2 },
      borrows: "some",
      op: "soustraction",
    },
    fondu: "translucide",
    id: "sous-emprunt",
    label: "Soustractions posées avec emprunt",
    ordre: 5,
  },
  {
    constraints: {
      aDigits: { max: 2, min: 2 },
      bDigits: { max: 1, min: 1 },
      carries: "any",
      op: "multiplication",
    },
    fondu: "opaque",
    id: "mult-1-chiffre",
    label: "Multiplications posées à 1 chiffre",
    ordre: 6,
  },
  {
    constraints: {
      aDigits: { max: 3, min: 2 },
      bDigits: { max: 1, min: 1 },
      carries: "any",
      op: "multiplication",
    },
    fondu: "absent",
    id: "mult-abstraite",
    label: "Multiplications posées, sans le matériel",
    ordre: 7,
  },
] as const;

export const DEFAULT_PALIER_ID = PALIERS[0].id;

/**
 * Ordre CANONIQUE des familles d'opérations — l'unique vérité d'ordre :
 * les plateaux de l'étagère /calcul, les cartes de /parents/calcul et la
 * lecture de la taille de série (settingsFromRows) s'alignent tous dessus.
 * Jamais réordonné (un ordre qui bouge serait un signal — contrainte calme).
 */
export const FAMILLES: readonly Operation[] = [
  "addition",
  "soustraction",
  "multiplication",
];

export function palierById(id: string): Palier | undefined {
  return PALIERS.find((p) => p.id === id);
}

/** Palier effectif : id inconnu (vieille valeur, cache) → premier palier. */
export function resolvePalier(id: string | null | undefined): Palier {
  return (id && palierById(id)) || PALIERS[0];
}

/** Les paliers d'une famille, dans l'ordre pédagogique (échelle T2-A). */
export function paliersByFamille(op: Operation): Palier[] {
  return PALIERS.filter((p) => p.constraints.op === op);
}

/**
 * Le palier appartient-il à la famille ? Prédicat pur du refine zod de
 * sauvegarde (T7) — un réglage incohérent est REFUSÉ à l'écriture plutôt que
 * « réparé » en silence à la lecture (un palier qui change dans le dos du
 * parent est interdit par la philosophie du palier manuel).
 */
export function isPalierOfFamille(
  op: Operation,
  id: string | null | undefined
): boolean {
  const palier = id ? palierById(id) : undefined;
  return palier !== undefined && palier.constraints.op === op;
}

/**
 * Palier effectif AU SEIN d'une famille : id inconnu, null, ou appartenant à
 * une autre famille (ligne DB éditée à la main, cache périmé) → premier
 * palier de la famille. Même contrat que resolvePalier : jamais d'erreur.
 */
export function resolvePalierForFamille(
  op: Operation,
  id: string | null | undefined
): Palier {
  const palier = id ? palierById(id) : undefined;
  return palier && palier.constraints.op === op
    ? palier
    : paliersByFamille(op)[0];
}

/**
 * Famille d'un palier — id inconnu → famille du premier palier (addition).
 * C'est le pivot du pont de clé legacy (une série sauvegardée avant
 * l'étagère ne connaît que son palierId) et de la migration 0010.
 */
export function familleOfPalier(id: string | null | undefined): Operation {
  return resolvePalier(id).constraints.op;
}

/**
 * Taille de série sûre, quelle que soit la source (cache localStorage édité,
 * ligne DB modifiée à la main…) : une valeur non bornée partirait dans une
 * génération sans fin sur la page enfant. Toujours passer par ici.
 */
export function clampSerieSize(value: unknown): number {
  const n =
    typeof value === "number" && Number.isFinite(value)
      ? Math.round(value)
      : DEFAULT_SERIE_SIZE;
  return Math.min(MAX_SERIE_SIZE, Math.max(MIN_SERIE_SIZE, n));
}
