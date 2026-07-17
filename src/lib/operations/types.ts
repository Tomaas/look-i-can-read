/**
 * Types partagés de la mini-app opérations (calcul posé façon jeu des timbres
 * Montessori). Tout ce dossier est PUR : aucune lecture d'env, de DB ou de
 * DOM — c'est la condition des golden tests et de la règle "le contrôle de
 * l'erreur vit dans le matériel, pas dans un juge".
 *
 * Rangs = couleurs du vrai matériel : vert (unités), bleu (dizaines),
 * rouge (centaines), vert-mille (milliers). Résultats bornés à 9999.
 */

export type Operation = "addition" | "soustraction" | "multiplication";

/**
 * 0 = unités, 1 = dizaines, 2 = centaines, 3 = milliers.
 * RÉSERVÉ TRANCHE 5 : Rank/RANK_LABELS/RANK_COLORS ne sont consommés par
 * aucun composant aujourd'hui — ils sont l'API du futur stamp-board
 * (plateau de timbres, gate rentrée) et sont épinglés par les goldens
 * pour que la tranche 5 hérite des bonnes couleurs du matériel.
 */
export type Rank = 0 | 1 | 2 | 3;

export const RANK_LABELS: Record<Rank, string> = {
  0: "unités",
  1: "dizaines",
  2: "centaines",
  3: "milliers",
};

/** Couleurs du matériel Montessori — la seule vérité visuelle des rangs. */
export const RANK_COLORS: Record<Rank, string> = {
  0: "vert",
  1: "bleu",
  2: "rouge",
  3: "vert-mille",
};

export const MAX_RESULT = 9999;

/**
 * Quota de retenues/emprunts d'une contrainte : "none" l'interdit, "some" en
 * exige au moins un(e), "any" laisse faire. Type unique — ne pas re-déclarer
 * l'union ailleurs (la sémantique vit dans matchesQuota, generator.ts).
 */
export type Quota = "none" | "some" | "any";

/**
 * Contraintes de génération d'une opération, décrites par palier.
 */
export interface GenerationConstraints {
  op: Operation;
  /** Nombre de chiffres du premier opérande (min/max inclus). */
  aDigits: { min: number; max: number };
  /** Nombre de chiffres du second opérande. Multiplication v1 : 1 chiffre. */
  bDigits: { min: number; max: number };
  carries?: Quota;
  borrows?: Quota;
}

export interface GeneratedOperation {
  op: Operation;
  a: number;
  b: number;
  expected: number;
  /** Nombre de retenues (addition/multiplication) ou d'emprunts (soustraction). */
  carries: number;
  seed: number;
}

/**
 * Fondu du matériel, attaché au palier choisi par le parent (jamais auto).
 * RÉSERVÉ TRANCHE 5 : consommé par le futur stamp-board (opacité des
 * timbres) ; aujourd'hui seul "absent"/"optionnel" vs présent distinguerait
 * l'atelier écriture libre — la donnée est déclarée dès maintenant pour que
 * les paliers n'aient pas à être re-migrés quand le matériel arrive.
 */
export type Fondu = "opaque" | "translucide" | "optionnel" | "absent";

export interface Palier {
  id: string;
  /** Ordre pédagogique global (échelle unique, jamais affichée à l'enfant). */
  ordre: number;
  /** Libellé côté /parents uniquement. */
  label: string;
  constraints: GenerationConstraints;
  fondu: Fondu;
}
