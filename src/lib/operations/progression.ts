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

import type { Palier } from "~/lib/operations/types";

export const DEFAULT_SERIE_SIZE = 3;

export const PALIERS: readonly Palier[] = [
  {
    id: "add-sans-retenue",
    ordre: 1,
    label: "Additions posées sans retenue",
    constraints: {
      op: "addition",
      aDigits: { min: 2, max: 2 },
      bDigits: { min: 1, max: 2 },
      carries: "none",
    },
    fondu: "opaque",
  },
  {
    id: "add-retenue",
    ordre: 2,
    label: "Additions posées avec retenue",
    constraints: {
      op: "addition",
      aDigits: { min: 2, max: 2 },
      bDigits: { min: 2, max: 2 },
      carries: "some",
    },
    fondu: "opaque",
  },
  {
    id: "add-grands-nombres",
    ordre: 3,
    label: "Additions posées jusqu'aux milliers",
    constraints: {
      op: "addition",
      aDigits: { min: 3, max: 4 },
      bDigits: { min: 2, max: 3 },
      carries: "any",
    },
    fondu: "translucide",
  },
  {
    id: "sous-sans-emprunt",
    ordre: 4,
    label: "Soustractions posées sans emprunt",
    constraints: {
      op: "soustraction",
      aDigits: { min: 2, max: 2 },
      bDigits: { min: 1, max: 2 },
      borrows: "none",
    },
    fondu: "opaque",
  },
  {
    id: "sous-emprunt",
    ordre: 5,
    label: "Soustractions posées avec emprunt",
    constraints: {
      op: "soustraction",
      aDigits: { min: 2, max: 3 },
      bDigits: { min: 2, max: 2 },
      borrows: "some",
    },
    fondu: "translucide",
  },
  {
    id: "mult-1-chiffre",
    ordre: 6,
    label: "Multiplications posées à 1 chiffre",
    constraints: {
      op: "multiplication",
      aDigits: { min: 2, max: 2 },
      bDigits: { min: 1, max: 1 },
      carries: "any",
    },
    fondu: "opaque",
  },
  {
    id: "mult-abstraite",
    ordre: 7,
    label: "Multiplications posées, sans le matériel",
    constraints: {
      op: "multiplication",
      aDigits: { min: 2, max: 3 },
      bDigits: { min: 1, max: 1 },
      carries: "any",
    },
    fondu: "absent",
  },
] as const;

export const DEFAULT_PALIER_ID = PALIERS[0].id;

export function palierById(id: string): Palier | undefined {
  return PALIERS.find((p) => p.id === id);
}

/** Palier effectif : id inconnu (vieille valeur, cache) → premier palier. */
export function resolvePalier(id: string | null | undefined): Palier {
  return (id && palierById(id)) || PALIERS[0];
}
