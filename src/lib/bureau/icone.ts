/**
 * Machine à états de sélection d'une icône de bureau — module PUR,
 * golden-testé (eng-review D19-A ; remplace l'ancienne « fonction de seuil »,
 * supprimée par T5 : le double-clic est l'événement NATIF `dblclick` du
 * système, jamais un timing maison — c'est le geste de l'OS réel qui doit
 * transférer).
 *
 * Sans horloge : la golden épingle les transitions. Invariants verrouillés —
 * la sélection ne se perd JAMAIS sur un second clic (le double-clic raté
 * laisse l'icône sélectionnée, « Ouvrir » visible), et `ouverte` est
 * absorbant (la navigation est en vol, plus rien ne la dispute).
 */

export type EtatIcone = "repos" | "selectionnee" | "ouverte";

export type EvenementIcone = "click" | "dblclick" | "enter" | "clickAilleurs";

export function transitionIcone(
  etat: EtatIcone,
  evenement: EvenementIcone
): EtatIcone {
  if (etat === "ouverte") {
    return "ouverte";
  }
  switch (evenement) {
    case "click":
      // repos → sélectionnée ; sélectionnée → sélectionnée (jamais perdue).
      return "selectionnee";
    case "dblclick":
    case "enter":
      return "ouverte";
    case "clickAilleurs":
      return "repos";
    default:
      return etat;
  }
}
