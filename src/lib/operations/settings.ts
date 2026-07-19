/**
 * Réglages par famille d'opération — le cœur PUR de l'étagère de plateaux.
 *
 * La table math_skills porte une ligne par famille ACTIVÉE, keyée
 * `calcul-pose:<famille>` (décision eng-review 1B) : présence de ligne =
 * activée, absence = la famille n'existe pas à l'écran (prémisse 3 — jamais
 * de plateau grisé). Ce module transforme ces lignes en réglages sûrs, quelle
 * que soit la saleté de la source (ligne éditée à la main, cache localStorage
 * corrompu, palier d'une autre famille) — jamais d'erreur sur donnée sale,
 * comme resolvePalier avant lui.
 *
 * Pur : aucune lecture d'env, de DB ou de DOM (condition des golden tests).
 */

import {
  clampSerieSize,
  DEFAULT_SERIE_SIZE,
  FAMILLES,
  familleOfPalier,
  paliersByFamille,
  resolvePalierForFamille,
} from "~/lib/operations/progression";
import type { Operation } from "~/lib/operations/types";

/** Préfixe des clés de la table math_skills (une ligne par famille). */
export const SKILL_KEY_PREFIX = "calcul-pose:";

export function skillKeyOf(op: Operation): string {
  return `${SKILL_KEY_PREFIX}${op}`;
}

export interface FamilleSetting {
  op: Operation;
  /** Toujours un palier DE cette famille (réparé sinon). */
  palier: string;
}

/**
 * Réglages effectifs de la mini-app : la taille de série reste GLOBALE
 * (recopiée à l'identique sur chaque ligne à la sauvegarde, lue sur la
 * première ligne par ordre canonique des familles) ; `familles` liste les
 * familles activées, dans l'ordre canonique — jamais vide.
 */
export interface FamilySettings {
  serieSize: number;
  familles: FamilleSetting[];
}

/** La forme minimale d'une ligne math_skills dont ce module a besoin. */
export interface MathSkillRowLike {
  skill: string;
  palier: string;
  serieSize: number;
}

/** Table vide (install neuve) → « addition, premier palier, activée ». */
export function defaultFamilySettings(): FamilySettings {
  return {
    serieSize: DEFAULT_SERIE_SIZE,
    familles: [{ op: "addition", palier: paliersByFamille("addition")[0].id }],
  };
}

/**
 * Lignes DB → réglages. Porte TOUS les cas de bord tranchés en review :
 * table vide → défaut addition ; présence = activée ; palier réparé au sein
 * de sa famille ; serieSize lue sur la PREMIÈRE ligne par ordre canonique,
 * clampée ; ligne au skill inconnu (legacy pas migrée, clé exotique) ignorée.
 */
export function settingsFromRows(
  rows: readonly MathSkillRowLike[],
): FamilySettings {
  const familles: FamilleSetting[] = [];
  let serieSize: number | null = null;
  for (const op of FAMILLES) {
    const row = rows.find((r) => r.skill === skillKeyOf(op));
    if (!row) {
      continue;
    }
    familles.push({ op, palier: resolvePalierForFamille(op, row.palier).id });
    if (serieSize === null) {
      serieSize = clampSerieSize(row.serieSize);
    }
  }
  if (familles.length === 0) {
    return defaultFamilySettings();
  }
  return { serieSize: serieSize ?? DEFAULT_SERIE_SIZE, familles };
}

function isOperation(value: unknown): value is Operation {
  return (FAMILLES as readonly unknown[]).includes(value);
}

/**
 * Shape-guard du cache appareil (`calcul:settings`) : un cache d'un ancien
 * format, tronqué ou édité doit produire des réglages sûrs, jamais un crash
 * sur la page enfant. Chaque famille est dédupliquée, réordonnée dans l'ordre
 * canonique et son palier réparé ; une valeur méconnaissable → défauts.
 */
export function normalizeFamilySettings(value: unknown): FamilySettings {
  const raw = value as
    | { serieSize?: unknown; familles?: unknown }
    | null
    | undefined;
  const rawFamilles = Array.isArray(raw?.familles) ? raw.familles : [];
  const familles: FamilleSetting[] = [];
  for (const op of FAMILLES) {
    const entry = rawFamilles.find(
      (f: unknown) =>
        typeof f === "object" &&
        f !== null &&
        (f as { op?: unknown }).op === op,
    ) as { palier?: unknown } | undefined;
    if (!entry) {
      continue;
    }
    const palier = typeof entry.palier === "string" ? entry.palier : undefined;
    familles.push({ op, palier: resolvePalierForFamille(op, palier).id });
  }
  if (familles.length === 0) {
    return defaultFamilySettings();
  }
  return { serieSize: clampSerieSize(raw?.serieSize), familles };
}

/** Clé localStorage de la série en cours d'une famille (une par plateau). */
export function serieStorageKeyOf(op: Operation): string {
  return `calcul:serie:${op}`;
}

/** L'ancienne clé unique, d'avant l'étagère — lue une fois par le pont. */
export const LEGACY_SERIE_STATE_KEY = "calcul:serie";

/**
 * Pont de clé legacy (décisions 2A + T4) — cœur pur du test de régression
 * CRITIQUE : une série sauvegardée AVANT l'étagère (clé `calcul:serie`, sans
 * champ famille) est enrichie et re-rangée sous la clé de sa famille, dérivée
 * de son palierId. Le pont ne valide PAS la série (c'est le travail du
 * shape-guard normal derrière) : il déplace et enrichit, rien d'autre —
 * il refuse seulement ce qui n'a même pas la forme d'un état de série.
 */
export function bridgeLegacySerie(
  saved: unknown,
): { famille: Operation; state: Record<string, unknown> } | null {
  if (typeof saved !== "object" || saved === null) {
    return null;
  }
  const state = saved as Record<string, unknown>;
  if (typeof state.palierId !== "string" || !Array.isArray(state.perOp)) {
    return null;
  }
  const famille = isOperation(state.famille)
    ? state.famille
    : familleOfPalier(state.palierId);
  return { famille, state: { ...state, famille } };
}
