/**
 * La session du bureau — un RITUEL, pas une sécurité (prémisse 3).
 *
 * localStorage seul, aucune donnée en DB : la machine accueille l'enfant,
 * elle ne rapporte jamais sur lui. Panne de stockage = silence — la session
 * vit alors en mémoire le temps de l'onglet, l'enfant ne voit jamais d'erreur.
 *
 * Duplication CONSCIENTE (eng-review D18-A) : les helpers readJson/writeJson
 * répètent le pattern local de /calcul (_bureau/calcul/index.tsx) — on ne
 * factorise PAS maintenant (prémisse 6 : /calcul intouché) ; l'unification
 * en lib/storage.ts se fera à la tranche 5, la prochaine fois que /calcul
 * est légitimement ouvert.
 */

export const SESSION_STORAGE_KEY = "bureau:session";

/**
 * Garde de forme PURE (golden-testée) : n'importe quel contenu déjà parsé de
 * `bureau:session` (absent, corrompu, mauvais type, version future) → un
 * booléen, jamais d'exception. Seul un `ouverte: true` littéral ouvre — une
 * version future qui garde ce champ reste lisible, tout le reste vaut fermé.
 */
export function estSessionOuverte(raw: unknown): boolean {
  return (
    typeof raw === "object" &&
    raw !== null &&
    (raw as { ouverte?: unknown }).ouverte === true
  );
}

/** Lit la session depuis localStorage — fermée par défaut, échec silencieux. */
export function lireSessionOuverte(): boolean {
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? estSessionOuverte(JSON.parse(raw) as unknown) : false;
  } catch {
    return false;
  }
}

/** Le clic sur le portrait : la session s'ouvre. */
export function ouvrirSession() {
  try {
    window.localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ ouverte: true, v: 1 })
    );
  } catch {
    // Stockage indisponible — la session vivra en mémoire, sans erreur.
  }
}

/**
 * « Ranger le bureau » (ceo-review T2-A) — jamais « éteindre » : rien ne
 * s'éteint réellement, et un mot qui ment mé-enseigne. Clé retirée = fermé.
 */
export function rangerBureau() {
  try {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Stockage indisponible — la clé illisible vaut déjà « fermé ».
  }
}
