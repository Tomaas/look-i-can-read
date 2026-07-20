/**
 * L'étagère de plateaux — le geste de choix de la mini-app calcul.
 *
 * Composant PRÉSENTATIONNEL (les données viennent de la route) : une planche,
 * un plateau par famille ACTIVÉE (une famille non activée n'existe pas à
 * l'écran — prémisse 3, jamais de plateau grisé ni de cadenas), dans l'ordre
 * canonique FAMILLES. Chaque plateau montre sa scène FIXE (design-review
 * T1/D-1A : la constance rend le plateau reconnaissable — mêmes objets, même
 * compte, jamais de nombres) : objets dominants → signe en médaillon → phrase
 * en sous-titre. Le plateau « sorti » (série en cours) est décalé de 18px
 * avec une ombre douce, RIEN d'autre (même taille, même luminosité — au-delà
 * ce serait une suggestion, D-3 bornée).
 *
 * Écran ⇄ classe : la règle « le plateau ne se nomme pas » est VISUELLE ;
 * pour un lecteur d'écran chaque plateau est un bouton qui se nomme
 * (« Prendre le plateau des additions — série en cours »), scène en
 * aria-hidden (D-7A/F15).
 *
 * Responsive (D-7A/F14) : les plateaux se compriment (clamp) et ne passent
 * JAMAIS à la ligne — un plateau sous la planche flotterait dans le vide ;
 * sous ~480px l'étagère s'empile verticalement, une planche sous CHAQUE
 * plateau. Les 18px du décalage « sorti » sont réservés dans la hauteur.
 */

import { palette } from "~/config/style";
import { cn } from "~/lib/cn";
import { FAMILLE_NOMS, type Operation } from "~/lib/operations";

export interface TrayInfo {
  op: Operation;
  /** Série en cours reprenable (prédicat complet, jamais « la clé existe »). */
  sorti: boolean;
}

// Le décalage « sorti » : ces DEUX classes portent le même 18px — le plateau
// descend d'autant que la rangée réserve, la planche ne bouge jamais.
// (Littéraux Tailwind obligatoires : le scanner JIT ne voit pas une
// interpolation — modifier les deux ensemble.)
const SORTI_SHIFT_CLASS = "translate-y-[18px]";
const SORTI_RESERVE_CLASS = "pb-[18px]";

const SIGNES: Record<Operation, string> = {
  addition: "+",
  multiplication: "×",
  soustraction: "−",
};

/** Gabarits FIXES, sans nombres ; variante sans doudou écrite (D-3A/F8). */
function phraseFor(op: Operation, hero: string, doudou: string | null): string {
  if (op === "addition") {
    return `${hero} range des marrons`;
  }
  if (op === "soustraction") {
    return doudou
      ? `${hero} en donne à ${doudou}`
      : `${hero} en range dans sa boîte`;
  }
  return `${hero} remplit des paniers`;
}

/* --------------------------- Scènes SVG maison --------------------------- */
/* Dessinées dans la palette de l'app (D-5A : pas d'OpenMoji — formes douces,
   traits encre, aucun contour noir), comptes d'objets GELÉS (D-1A/F19) :
   4 marrons, 1 doudou, 2 paniers. */

function MarronsScene() {
  // 4 marrons — compte gelé.
  const marron = (cx: number, cy: number, r: number) => (
    <g key={`${cx}-${cy}`}>
      <circle cx={cx} cy={cy} fill={palette.primary} r={r} />
      <circle
        cx={cx}
        cy={cy}
        fill="none"
        opacity={0.45}
        r={r}
        stroke={palette.ink}
        strokeWidth={1.5}
      />
      <path
        d={`M ${cx - r * 0.5} ${cy - r * 0.55} Q ${cx} ${cy - r * 1.1} ${cx + r * 0.5} ${cy - r * 0.55}`}
        fill={palette.background}
        opacity={0.8}
      />
    </g>
  );
  return (
    <svg
      aria-hidden="true"
      className="h-16 w-full"
      role="presentation"
      viewBox="0 0 120 64"
    >
      {marron(28, 42, 13)}
      {marron(58, 34, 15)}
      {marron(88, 44, 12)}
      {marron(60, 52, 10)}
    </svg>
  );
}

function DoudouScene() {
  // 1 doudou — compte gelé.
  return (
    <svg
      aria-hidden="true"
      className="h-16 w-full"
      role="presentation"
      viewBox="0 0 120 64"
    >
      <g opacity={0.9}>
        {/* oreilles */}
        <circle cx={46} cy={18} fill={palette.primary} r={7} />
        <circle cx={74} cy={18} fill={palette.primary} r={7} />
        {/* tête */}
        <circle cx={60} cy={28} fill={palette.primary} r={14} />
        <circle cx={55} cy={26} fill={palette.ink} opacity={0.6} r={1.6} />
        <circle cx={65} cy={26} fill={palette.ink} opacity={0.6} r={1.6} />
        <path
          d="M 56 33 Q 60 36 64 33"
          fill="none"
          opacity={0.6}
          stroke={palette.ink}
          strokeLinecap="round"
          strokeWidth={1.5}
        />
        {/* corps */}
        <ellipse cx={60} cy={50} fill={palette.primary} rx={16} ry={12} />
        <ellipse
          cx={60}
          cy={52}
          fill={palette.background}
          opacity={0.7}
          rx={8}
          ry={6}
        />
      </g>
    </svg>
  );
}

function PaniersScene() {
  // 2 paniers — compte gelé.
  const panier = (cx: number) => (
    <g key={cx}>
      <path
        d={`M ${cx - 18} 34 L ${cx + 18} 34 L ${cx + 13} 52 Q ${cx} 56 ${cx - 13} 52 Z`}
        fill={palette.accent}
      />
      <path
        d={`M ${cx - 18} 34 L ${cx + 18} 34 L ${cx + 13} 52 Q ${cx} 56 ${cx - 13} 52 Z`}
        fill="none"
        opacity={0.5}
        stroke={palette.ink}
        strokeWidth={1.5}
      />
      <path
        d={`M ${cx - 10} 34 Q ${cx} 20 ${cx + 10} 34`}
        fill="none"
        opacity={0.6}
        stroke={palette.ink}
        strokeWidth={2}
      />
    </g>
  );
  return (
    <svg
      aria-hidden="true"
      className="h-16 w-full"
      role="presentation"
      viewBox="0 0 120 64"
    >
      {panier(38)}
      {panier(82)}
    </svg>
  );
}

const SCENES: Record<Operation, () => React.ReactNode> = {
  addition: MarronsScene,
  multiplication: PaniersScene,
  soustraction: DoudouScene,
};

/* -------------------------------- Étagère -------------------------------- */

/** La planche — trait encre doux, jamais un conteneur. */
function Plank({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("h-1 w-full rounded-full bg-foreground/25", className)}
    />
  );
}

export function TrayShelf({
  trays,
  heroName,
  doudouName,
  onTake,
}: {
  trays: TrayInfo[];
  heroName: string | null;
  doudouName: string | null;
  onTake: (op: Operation) => void;
}) {
  return (
    <div className="flex w-full flex-1 flex-col justify-center">
      {/* Rangée d'étagère (≥ sm) : plateaux compressibles, JAMAIS de wrap ;
          les 18px du décalage « sorti » sont réservés (pb) pour que la
          planche ne bouge pas selon l'état. */}
      <div className="w-full max-sm:hidden">
        <div
          className={cn(
            "flex flex-nowrap items-end justify-center gap-6",
            SORTI_RESERVE_CLASS
          )}
        >
          {trays.map((tray) => (
            <Tray
              doudouName={doudouName}
              heroName={heroName}
              key={tray.op}
              onTake={onTake}
              tray={tray}
            />
          ))}
        </div>
        <Plank />
      </div>
      {/* Empilement (< sm) : une planche sous CHAQUE plateau. */}
      <div className="flex w-full flex-col items-center gap-8 sm:hidden">
        {trays.map((tray) => (
          <div className="flex w-full flex-col items-center" key={tray.op}>
            <div className={SORTI_RESERVE_CLASS}>
              <Tray
                doudouName={doudouName}
                heroName={heroName}
                onTake={onTake}
                tray={tray}
              />
            </div>
            <Plank className="max-w-72" />
          </div>
        ))}
      </div>
    </div>
  );
}

function Tray({
  tray,
  heroName,
  doudouName,
  onTake,
}: {
  tray: TrayInfo;
  heroName: string | null;
  doudouName: string | null;
  onTake: (op: Operation) => void;
}) {
  const Scene = SCENES[tray.op];
  return (
    <button
      aria-label={`Prendre le plateau des ${FAMILLE_NOMS[tray.op]}${tray.sorti ? " — série en cours" : ""}`}
      className={cn(
        // Le plateau ENTIER est la cible (D-7A/F18), ≥160px de haut ; même
        // grammaire que les portes de l'accueil : crème, bord encre doux,
        // rounded-2xl, focus ring existant.
        "flex min-h-40 w-[clamp(160px,28vw,240px)] shrink flex-col items-center justify-between gap-2 rounded-2xl border bg-card px-4 py-4",
        "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        // Retour au pointeur (design review : la seule surface interactive
        // sans hover de l'app) — une ombre douce, pas une suggestion.
        "hover:shadow-sm",
        "transition duration-300 motion-reduce:transition-none",
        // « Sorti » : décalage + ombre douce UNIQUEMENT (D-1A/F3).
        tray.sorti && cn(SORTI_SHIFT_CLASS, "shadow-md")
      )}
      onClick={() => onTake(tray.op)}
      type="button"
    >
      {/* La scène ne se nomme pas à l'écran ; elle est muette pour ARIA. */}
      <span aria-hidden="true" className="w-full">
        <Scene />
      </span>
      {heroName ? (
        <span aria-hidden="true" className="text-base text-muted-foreground">
          {phraseFor(tray.op, heroName, doudouName)}
        </span>
      ) : null}
      <span
        aria-hidden="true"
        className="flex size-11 items-center justify-center rounded-full border border-primary border-dashed text-2xl text-primary"
      >
        {SIGNES[tray.op]}
      </span>
    </button>
  );
}
