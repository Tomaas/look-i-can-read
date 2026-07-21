/**
 * L'icône de bureau — la première grammaire de l'OS réel (prémisse 4) :
 * simple clic = sélection (liseré sauge) + apparition d'un grand « Ouvrir »
 * dans un emplacement RÉSERVÉ sous l'icône — l'icône ne bouge pas d'un pixel
 * entre le premier et le second clic (T5). Double-clic = ouvre, via
 * l'événement NATIF `dblclick` (le délai du système, jamais un seuil
 * maison : c'est le geste de l'OS réel qui doit transférer). Entrée = ouvre.
 *
 * Cible ≥ 96 px ; l'observation d'Arsène (The Assignment) règle les tailles,
 * le rattrapage « Ouvrir » couvre le double-clic raté quel que soit son
 * geste. Les transitions passent par la machine à états PURE de
 * lib/bureau/icone.ts (eng-review D19-A), golden-testée.
 */

import type { LucideIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import type { EvenementIcone } from "~/lib/bureau/icone";
import { cn } from "~/lib/cn";

export interface IconeBureauProps {
  icone: LucideIcon;
  libelle: string;
  onEvenement: (evenement: EvenementIcone) => void;
  selectionnee: boolean;
}

export function IconeBureau({
  icone: Icone,
  libelle,
  onEvenement,
  selectionnee,
}: IconeBureauProps) {
  return (
    // data-icone-bureau : le « clic ailleurs » du bureau ignore tout ce qui
    // vit ici (l'icône ET son « Ouvrir » réservé).
    <div className="flex w-40 flex-col items-center gap-1" data-icone-bureau>
      <button
        className={cn(
          "flex size-32 flex-col items-center justify-center gap-2 rounded-3xl border-2 p-2 outline-none transition-colors duration-150 focus-visible:ring-4 focus-visible:ring-ring motion-reduce:transition-none",
          selectionnee
            ? "border-accent-foreground/40 bg-accent/50"
            : "border-transparent hover:bg-card/80"
        )}
        onClick={() => onEvenement("click")}
        onDoubleClick={() => onEvenement("dblclick")}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            // Sans preventDefault, le navigateur synthétise un click derrière
            // Entrée — l'icône se contenterait de se sélectionner.
            event.preventDefault();
            onEvenement("enter");
          }
        }}
        type="button"
      >
        <Icone aria-hidden="true" className="size-14 text-primary" />
        <span className="font-semibold text-xl leading-tight">{libelle}</span>
      </button>
      {/* Emplacement RÉSERVÉ (T5) : la hauteur existe toujours, seul le
          bouton apparaît — rien ne bouge entre les deux clics. */}
      <div className="flex h-14 items-center">
        {selectionnee ? (
          <Button
            className="h-11 rounded-2xl px-6 text-lg"
            onClick={() => onEvenement("enter")}
            size="lg"
          >
            Ouvrir
          </Button>
        ) : null}
      </div>
    </div>
  );
}
