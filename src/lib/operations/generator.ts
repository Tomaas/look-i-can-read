/**
 * Générateur déterministe d'opérations posées. Aucun LLM, aucun réseau :
 * un PRNG seedé (mulberry32) + un échantillonnage sous contraintes borné.
 *
 * Garanties (golden-testées) :
 *  - même seed + mêmes contraintes → même opération (déterminisme total) ;
 *  - une soustraction n'est JAMAIS négative (a ≥ b par construction) ;
 *  - tout résultat ≤ MAX_RESULT (9999, le rang vert-mille du matériel) ;
 *  - une contrainte insatisfaisable lève UnsatisfiableConstraintError après
 *    un nombre borné d'essais — jamais de boucle infinie.
 */

import {
  type GeneratedOperation,
  type GenerationConstraints,
  MAX_RESULT,
} from "~/lib/operations/types";

export class UnsatisfiableConstraintError extends Error {
  constructor(constraints: GenerationConstraints, attempts: number) {
    super(
      `Contrainte insatisfaisable après ${attempts} essais: ${JSON.stringify(constraints)}`,
    );
    this.name = "UnsatisfiableConstraintError";
  }
}

const MAX_ATTEMPTS = 500;

/** mulberry32 — PRNG 32 bits minuscule et rapide, standard pour les goldens. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function intInRange(rand: () => number, min: number, max: number): number {
  return min + Math.floor(rand() * (max - min + 1));
}

function numberWithDigits(rand: () => number, digits: number): number {
  if (digits === 1) {
    return intInRange(rand, 1, 9);
  }
  const min = 10 ** (digits - 1);
  const max = 10 ** digits - 1;
  return intInRange(rand, min, max);
}

/** Compte les retenues d'une addition posée colonne par colonne. */
export function countCarries(a: number, b: number): number {
  let carries = 0;
  let carry = 0;
  let x = a;
  let y = b;
  while (x > 0 || y > 0) {
    const sum = (x % 10) + (y % 10) + carry;
    carry = sum >= 10 ? 1 : 0;
    carries += carry;
    x = Math.floor(x / 10);
    y = Math.floor(y / 10);
  }
  return carries;
}

/** Compte les retenues d'une multiplication posée à 1 chiffre. */
export function countMultCarries(a: number, b: number): number {
  let carries = 0;
  let carry = 0;
  let x = a;
  while (x > 0) {
    const prod = (x % 10) * b + carry;
    carry = Math.floor(prod / 10);
    if (carry > 0) {
      carries++;
    }
    x = Math.floor(x / 10);
  }
  return carries;
}

/** Compte les emprunts d'une soustraction posée (a ≥ b requis). */
export function countBorrows(a: number, b: number): number {
  let borrows = 0;
  let borrow = 0;
  let x = a;
  let y = b;
  while (y > 0 || borrow > 0) {
    const top = (x % 10) - borrow;
    const bottom = y % 10;
    borrow = top < bottom ? 1 : 0;
    borrows += borrow;
    x = Math.floor(x / 10);
    y = Math.floor(y / 10);
  }
  return borrows;
}

function matchesQuota(
  quota: "none" | "some" | "any" | undefined,
  count: number,
): boolean {
  if (quota === "none") {
    return count === 0;
  }
  if (quota === "some") {
    return count > 0;
  }
  return true;
}

type Candidate = Omit<GeneratedOperation, "seed"> | null;

function tryAddition(
  a: number,
  b: number,
  c: GenerationConstraints,
): Candidate {
  const expected = a + b;
  if (expected > MAX_RESULT) {
    return null;
  }
  const carries = countCarries(a, b);
  if (!matchesQuota(c.carries, carries)) {
    return null;
  }
  return { op: "addition", a, b, expected, carries };
}

function trySoustraction(
  a: number,
  b: number,
  c: GenerationConstraints,
): Candidate {
  // Le diminuende est toujours le plus grand : jamais de résultat négatif.
  const [top, bottom] = a >= b ? [a, b] : [b, a];
  if (top === bottom) {
    return null; // 0 n'apprend rien à poser
  }
  const borrows = countBorrows(top, bottom);
  if (!matchesQuota(c.borrows, borrows)) {
    return null;
  }
  return {
    op: "soustraction",
    a: top,
    b: bottom,
    expected: top - bottom,
    carries: borrows,
  };
}

function tryMultiplication(
  a: number,
  b: number,
  c: GenerationConstraints,
): Candidate {
  // v1 : b à 1 chiffre imposé par les paliers ; ×1 n'apprend rien à poser.
  const expected = a * b;
  if (expected > MAX_RESULT || b < 2) {
    return null;
  }
  const carries = countMultCarries(a, b);
  if (!matchesQuota(c.carries, carries)) {
    return null;
  }
  return { op: "multiplication", a, b, expected, carries };
}

const TRY_BY_OP = {
  addition: tryAddition,
  soustraction: trySoustraction,
  multiplication: tryMultiplication,
} as const;

/**
 * Génère une opération satisfaisant les contraintes du palier.
 * Rejection sampling borné : simple, uniforme sur l'espace admissible, et
 * l'échec est un signal (contrainte mal écrite) plutôt qu'un blocage.
 */
export function generateOperation(
  constraints: GenerationConstraints,
  seed: number,
): GeneratedOperation {
  const rand = mulberry32(seed);
  const tryOp = TRY_BY_OP[constraints.op];
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const aDigits = intInRange(
      rand,
      constraints.aDigits.min,
      constraints.aDigits.max,
    );
    const bDigits = intInRange(
      rand,
      constraints.bDigits.min,
      constraints.bDigits.max,
    );
    const a = numberWithDigits(rand, aDigits);
    const b = numberWithDigits(rand, bDigits);
    const candidate = tryOp(a, b, constraints);
    if (candidate) {
      return { ...candidate, seed };
    }
  }
  throw new UnsatisfiableConstraintError(constraints, MAX_ATTEMPTS);
}

/**
 * Une série = N opérations d'un même palier (la "série qui se range").
 * Seeds dérivées du seed de série — déterminisme de bout en bout.
 */
export function generateSerie(
  constraints: GenerationConstraints,
  serieSeed: number,
  count: number,
): GeneratedOperation[] {
  const ops: GeneratedOperation[] = [];
  for (let i = 0; i < count; i++) {
    ops.push(generateOperation(constraints, (serieSeed * 31 + i * 7919) >>> 0));
  }
  return ops;
}
