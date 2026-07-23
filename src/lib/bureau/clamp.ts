/**
 * Bornage de la fenêtre du bureau — module PUR, golden-testé (test:bureau).
 *
 * Lecture STRICTE du clamp (eng-review D23-A) : la barre de titre reste
 * ENTIÈREMENT visible en toute circonstance — jamais d'état « fenêtre
 * perdue » pour un enfant de 5 ans. Le corps de la fenêtre peut déborder du
 * bas de l'écran, la poignée qui la ramène, jamais. Le MÊME modifier re-borne
 * au redimensionnement du viewport (ceo-review D11-A) : l'invariant tient au
 * drag ET au resize.
 */

export interface Position {
  x: number;
  y: number;
}

export interface Taille {
  height: number;
  width: number;
}

/**
 * (position, taille fenêtre, viewport, hauteur de barre) → position bornée.
 *
 * - x ∈ [0, viewport.width − fenêtre.width] : la barre entière reste dans
 *   l'écran en largeur. Viewport plus étroit que la fenêtre (cas dégradé) →
 *   x = 0, alignée à gauche — le maximum visible possible.
 * - y ∈ [0, viewport.height − barre] : le haut ne sort jamais, et il reste
 *   toujours au moins la barre complète visible en bas.
 */
export function clampFenetrePosition(
  position: Position,
  fenetre: Taille,
  viewport: Taille,
  titleBarHeight: number
): Position {
  const maxX = Math.max(0, viewport.width - fenetre.width);
  const maxY = Math.max(0, viewport.height - titleBarHeight);
  return {
    x: Math.min(Math.max(position.x, 0), maxX),
    y: Math.min(Math.max(position.y, 0), maxY),
  };
}

/**
 * Re-bornage d'une position COMMITTÉE (resize du viewport, drag annulé) —
 * la règle répétée côté composant, écrite UNE fois :
 *
 * - `prev` null (fenêtre centrée par le CSS de chaque ouverture) → null,
 *   rien à re-borner ;
 * - no-op → MÊME référence : `setPosition(prev => prev)` ne re-rend pas —
 *   aucun re-rendu à chaque event resize quand la fenêtre est loin des
 *   bords.
 *
 * L'invariant « barre entièrement visible » reste celui de
 * `clampFenetrePosition` (D23-A) : ce helper n'ajoute que la discipline de
 * commit (null-passthrough + identité de référence).
 */
export function reclampCommitted(
  prev: Position | null,
  fenetre: Taille,
  viewport: Taille,
  titleBarHeight: number
): Position | null {
  if (!prev) {
    return prev;
  }
  const bornee = clampFenetrePosition(prev, fenetre, viewport, titleBarHeight);
  return bornee.x === prev.x && bornee.y === prev.y ? prev : bornee;
}
