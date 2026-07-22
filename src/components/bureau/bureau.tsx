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
import { useEffect, useState } from "react";
import { APPS_BUREAU } from "~/components/bureau/apps";
import { IconeBureau } from "~/components/bureau/icone";
import { Button } from "~/components/ui/button";
import {
  type EtatIcone,
  type EvenementIcone,
  transitionIcone,
} from "~/lib/bureau/icone";

export function Bureau({ onRanger }: { onRanger: () => void }) {
  const navigate = useNavigate();
  const [selection, setSelection] = useState<string | null>(null);
  // « ouverte » est absorbant (machine D19-A) : la navigation est en vol,
  // plus aucun événement ne la dispute.
  const [ouverte, setOuverte] = useState(false);

  // « Clic ailleurs » → repos : un pointeur posé hors de toute icône (fond du
  // bureau, bouton Ranger…) relâche la sélection, comme sur le vrai OS. Le
  // handler passe par la machine avec l'état RÉEL (deps [ouverte]) : pendant
  // une ouverture en vol, `ouverte` absorbe et la sélection reste.
  useEffect(() => {
    function surPointeur(event: PointerEvent) {
      const cible = event.target instanceof Element ? event.target : null;
      if (cible?.closest("[data-icone-bureau]")) {
        return;
      }
      const etat: EtatIcone = ouverte ? "ouverte" : "selectionnee";
      if (transitionIcone(etat, "clickAilleurs") === "repos") {
        setSelection(null);
      }
    }
    document.addEventListener("pointerdown", surPointeur);
    return () => document.removeEventListener("pointerdown", surPointeur);
  }, [ouverte]);

  function surEvenement(
    id: string,
    to: (typeof APPS_BUREAU)[number]["to"],
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
        {APPS_BUREAU.map((app) => (
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
