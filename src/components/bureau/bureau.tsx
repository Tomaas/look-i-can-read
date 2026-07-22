/**
 * Le bureau d'Arsène — un petit OS calme. Trois icônes (Histoires, Calculs,
 * Bibliothèque), un fond lavis crème, et le rituel « Ranger le bureau »
 * discret dans un coin. Le design par l'espace négatif : PAS de barre des
 * tâches, d'horloge, de corbeille, de badges, de notifications, de sons, de
 * multi-fenêtres — un vrai OS épuré jusqu'à l'essentiel calme.
 *
 * /parents est HORS de l'OS : aucune icône, accès inchangé par l'URL —
 * jamais dans la grammaire enfant.
 */

import { useNavigate } from "@tanstack/react-router";
import { BookHeart, Grid3x3, Leaf, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { IconeBureau, type TeinteIcone } from "~/components/bureau/icone";
import { Button } from "~/components/ui/button";
import {
  type EtatIcone,
  type EvenementIcone,
  transitionIcone,
} from "~/lib/bureau/icone";

// Chaque app a sa teinte de la palette calme (tuile d'application, comme les
// icônes d'un vrai OS) — sauge pour les histoires, sable pour les calculs,
// ocre pâle pour la bibliothèque. Jamais de couleur hors palette.
const ICONES_BUREAU: ReadonlyArray<{
  icone: LucideIcon;
  id: string;
  libelle: string;
  teinte: TeinteIcone;
  to: "/aventure" | "/calcul" | "/bibliotheque";
}> = [
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

export function Bureau({ onRanger }: { onRanger: () => void }) {
  const navigate = useNavigate();
  const [selection, setSelection] = useState<string | null>(null);
  // « ouverte » est absorbant (machine D19-A) : la navigation est en vol,
  // plus aucun événement ne la dispute.
  const [ouverte, setOuverte] = useState(false);

  // « Clic ailleurs » → repos : un pointeur posé hors de toute icône (fond du
  // bureau, bouton Ranger…) relâche la sélection, comme sur le vrai OS.
  useEffect(() => {
    function surPointeur(event: PointerEvent) {
      const cible = event.target instanceof Element ? event.target : null;
      if (!cible?.closest("[data-icone-bureau]")) {
        setSelection((prev) =>
          prev !== null &&
          transitionIcone("selectionnee", "clickAilleurs") === "repos"
            ? null
            : prev
        );
      }
    }
    document.addEventListener("pointerdown", surPointeur);
    return () => document.removeEventListener("pointerdown", surPointeur);
  }, []);

  function surEvenement(
    id: string,
    to: (typeof ICONES_BUREAU)[number]["to"],
    evenement: EvenementIcone
  ) {
    let etat: EtatIcone = selection === id ? "selectionnee" : "repos";
    if (ouverte) {
      etat = "ouverte";
    }
    const suivant = transitionIcone(etat, evenement);
    if (suivant === "ouverte" && !ouverte) {
      setOuverte(true);
      navigate({ to });
      return;
    }
    if (suivant === "selectionnee") {
      setSelection(id);
    }
  }

  return (
    <div className="bureau-fond flex min-h-screen flex-col">
      {/* Les icônes s'empilent en colonne depuis le coin haut-gauche, comme
          sur un vrai bureau (la grammaire spatiale doit transférer aussi). */}
      <div className="flex flex-1 flex-col flex-wrap content-start items-start gap-6 p-8">
        {ICONES_BUREAU.map((app) => (
          <IconeBureau
            icone={app.icone}
            key={app.id}
            libelle={app.libelle}
            onEvenement={(evenement) => surEvenement(app.id, app.to, evenement)}
            selectionnee={selection === app.id}
            teinte={app.teinte}
          />
        ))}
      </div>
      <div className="flex justify-end p-6">
        <Button
          className="gap-2 text-lg text-muted-foreground"
          onClick={onRanger}
          variant="ghost"
        >
          Ranger le bureau
        </Button>
      </div>
    </div>
  );
}
