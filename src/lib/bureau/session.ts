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

// Repli mémoire quand le stockage est en panne (mode privé, quota,
// désactivé) : la session vit alors ICI le temps de l'onglet — sans lui, la
// gate re-présenterait le portrait à CHAQUE ouverture d'app et le rituel
// deviendrait une barrière répétée (contrat du module, red-team pré-landing).
let sessionMemoire = false;

/** Lit la session — localStorage d'abord, repli mémoire, échec silencieux. */
export function lireSessionOuverte(): boolean {
  let stockee = false;
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    stockee = raw ? estSessionOuverte(JSON.parse(raw) as unknown) : false;
  } catch {
    stockee = false;
  }
  // `||` et non un simple fallback sur throw : un setItem avalé (quota plein)
  // avec un getItem qui marche laisserait sinon la session fermée juste
  // après le clic sur le portrait.
  return sessionMemoire || stockee;
}

/** Le clic sur le portrait : la session s'ouvre. */
export function ouvrirSession() {
  sessionMemoire = true;
  try {
    window.localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ ouverte: true, v: 1 })
    );
  } catch {
    // Stockage indisponible — la session vit en mémoire, sans erreur.
  }
}

/**
 * « Ranger le bureau » (ceo-review T2-A) — jamais « éteindre » : rien ne
 * s'éteint réellement, et un mot qui ment mé-enseigne. Clé retirée = fermé.
 */
export function rangerBureau() {
  sessionMemoire = false;
  try {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Stockage indisponible — la clé illisible vaut déjà « fermé ».
  }
}
