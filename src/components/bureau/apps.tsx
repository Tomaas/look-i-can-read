/**
 * Le registre UNIQUE des apps du bureau — icône, libellé, teinte, chemin.
 * Consommé par le bureau (les icônes) ET par la layout _bureau (le titre de
 * fenêtre = libellé + pictogramme de l'icône) : renommer une app ou changer
 * son glyphe ne peut plus désynchroniser l'icône de sa barre de titre
 * (finding maintainability pré-landing).
 *
 * /parents n'y figure JAMAIS : hors de l'OS, hors de la grammaire enfant.
 */

import { BookHeart, Grid3x3, Leaf, type LucideIcon } from "lucide-react";
import type { TeinteIcone } from "~/components/bureau/icone";

export interface AppBureau {
  icone: LucideIcon;
  id: string;
  libelle: string;
  teinte: TeinteIcone;
  to: "/aventure" | "/calcul" | "/bibliotheque";
}

// Chaque app a sa teinte de la palette calme (tuile d'application, comme les
// icônes d'un vrai OS) — sauge pour les histoires, sable pour les calculs,
// ocre pâle pour la bibliothèque. Jamais de couleur hors palette.
export const APPS_BUREAU: readonly AppBureau[] = [
  {
    icone: Leaf,
    id: "histoires",
    libelle: "Histoires",
    teinte: {
      glyphe: "text-accent-foreground",
      tuile:
        "border-accent-foreground/15 bg-gradient-to-b from-accent/55 to-accent",
    },
    to: "/aventure",
  },
  {
    icone: Grid3x3,
    id: "calculs",
    libelle: "Calculs",
    teinte: {
      glyphe: "text-secondary-foreground",
      tuile:
        "border-secondary-foreground/15 bg-gradient-to-b from-secondary/55 to-secondary",
    },
    to: "/calcul",
  },
  {
    icone: BookHeart,
    id: "bibliotheque",
    libelle: "Bibliothèque",
    teinte: {
      glyphe: "text-primary",
      tuile: "border-primary/20 bg-gradient-to-b from-primary/10 to-primary/25",
    },
    to: "/bibliotheque",
  },
];

/**
 * L'app dont la fenêtre est ouverte pour ce chemin — le titre de la fenêtre
 * est le libellé de l'icône du bureau. Repli sur la première app (Histoires)
 * pour les chemins profonds de sa famille (/aventure/$id).
 */
export function appPourChemin(pathname: string): AppBureau {
  return (
    APPS_BUREAU.find((app) => pathname.startsWith(app.to)) ?? APPS_BUREAU[0]
  );
}
