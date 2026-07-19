import {
  type CollisionDetection,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  type CellRef,
  ColumnGrid,
  emptyEntries,
  type GridEntries,
} from "~/components/calcul/column-grid";
import {
  DIGIT_TILE_CLASSES,
  SoftNumpad,
} from "~/components/calcul/soft-numpad";
import { type TrayInfo, TrayShelf } from "~/components/calcul/tray-shelf";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/cn";
import {
  bridgeLegacySerie,
  enonceFor,
  FAMILLES,
  type GeneratedOperation,
  generateSerie,
  LEGACY_SERIE_STATE_KEY,
  layoutOperation,
  newSerieSeed,
  normalizeFamilySettings,
  type Operation,
  type Palier,
  resolvePalier,
  resolvePalierForFamille,
  serieStorageKeyOf,
} from "~/lib/operations";
import { listDoudousFn } from "~/server/doudous-functions";
import { listHeroesFn } from "~/server/heroes-functions";
import { getMathSettingsFn, type MathSettings } from "~/server/math-functions";

/** 2A: a slow DB is treated like an unreachable one — short timeout, no error. */
function withTimeout<T>(
  promise: Promise<T>,
  fallback: T,
  ms = 3000,
): Promise<T> {
  return Promise.race([
    promise.catch(() => fallback),
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

export const Route = createFileRoute("/calcul/")({
  // Network resilience (eng-review 2A): a DB outage or hang NEVER blocks the
  // child — the loader swallows failures AND bounds waits with a short
  // timeout; the component falls back to the palier cached on this device.
  // The generator and grids are 100% local.
  loader: async () => {
    const [settings, heroes, doudous] = await Promise.all([
      withTimeout(getMathSettingsFn(), null),
      withTimeout(listHeroesFn(), []),
      withTimeout(listDoudousFn(), []),
    ]);
    return {
      settings,
      heroName: heroes[0]?.label ?? null,
      doudouName: doudous[0]?.label ?? null,
    };
  },
  component: CalculWorkshopPage,
});

const SETTINGS_CACHE_KEY = "calcul:settings";
// La série en cours vit sous UNE clé PAR FAMILLE (serieStorageKeyOf, décision
// 2A révisée : chaque plateau se souvient d'où il en était — rien n'est
// jamais rangé dans le dos de l'enfant). L'ancienne clé unique
// LEGACY_SERIE_STATE_KEY est migrée une fois par le pont (bridgeLegacySerie).

// 8px of travel before a drag starts: a plain tap stays a click. Hoisted so
// dnd-kit's useSensor memo keeps a stable options identity across renders.
const POINTER_ACTIVATION = { activationConstraint: { distance: 8 } };

/**
 * Forgiving drop detection for small fingers: precise when the fingertip is
 * inside a cell (pointerWithin), else the cell the tile overlaps most counts
 * (rectIntersection) — a near-miss inks the obvious cell instead of nothing.
 */
const forgivingCollision: CollisionDetection = (args) => {
  const within = pointerWithin(args);
  return within.length > 0 ? within : rectIntersection(args);
};

/** The droppable payload crosses dnd-kit untyped — validate, never cast. */
function isCellRef(value: unknown): value is CellRef {
  const cell = value as CellRef | null;
  return (
    typeof cell === "object" &&
    cell !== null &&
    (cell.row === "result" || cell.row === "carry") &&
    typeof cell.col === "number"
  );
}

/**
 * Pencil flow, shared by tap and drag: after a result digit, the pencil steps
 * to the next column leftwards; col 0 and carry cells keep the pencil put.
 */
function pencilAdvance(cell: CellRef): CellRef {
  return cell.row === "result" && cell.col > 0
    ? { row: "result", col: cell.col - 1 }
    : cell;
}

interface SerieState {
  famille: Operation;
  palierId: string;
  serieSize: number;
  seed: number;
  index: number;
  /**
   * Empreinte des opérations générées à la création de la série. À la
   * reprise, la régénération depuis (palier, seed) doit produire la MÊME
   * empreinte — sinon le générateur ou les contraintes du palier ont changé
   * depuis, et les chiffres écrits ne correspondraient plus aux opérations
   * affichées (corruption silencieuse) : on repart sur une série fraîche.
   */
  opsFingerprint: string;
  perOp: { entries: GridEntries; done: boolean }[];
}

function fingerprintOps(ops: GeneratedOperation[]): string {
  return ops.map((o) => `${o.op}:${o.a}:${o.b}`).join("|");
}

/**
 * Génération contenue : une contrainte de palier devenue insatisfaisable
 * (erreur de code future) ne doit JAMAIS montrer un écran d'erreur à
 * l'enfant — on retombe sur le premier palier, puis sur rien (l'atelier
 * rangé) si même lui échoue.
 */
function safeGenerateSerie(
  palier: Palier,
  seed: number,
  size: number,
): GeneratedOperation[] {
  try {
    return generateSerie(palier.constraints, seed, size);
  } catch {
    try {
      return generateSerie(resolvePalier(null).constraints, seed, size);
    } catch {
      return [];
    }
  }
}

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable (private mode…) — the session simply won't resume.
  }
}

/**
 * Shape guard for the resumed série: a corrupted or older-format cache must
 * fall back to a fresh série, never crash the child-facing page. The
 * « sorti » tray state uses THIS exact predicate (design-review D-3A/F5) —
 * never « the key exists » — so a sorti tray always resumes for real.
 */
function isResumableSerie(
  saved: SerieState | null,
  famille: Operation,
  palierId: string,
  serieSize: number,
): saved is SerieState {
  return (
    saved !== null &&
    saved.famille === famille &&
    saved.palierId === palierId &&
    saved.serieSize === serieSize &&
    typeof saved.seed === "number" &&
    typeof saved.index === "number" &&
    saved.index >= 0 &&
    saved.index < saved.serieSize &&
    Array.isArray(saved.perOp) &&
    saved.perOp.length === saved.serieSize &&
    typeof saved.opsFingerprint === "string" &&
    saved.perOp.every(
      (op) =>
        typeof op?.done === "boolean" &&
        Array.isArray(op?.entries?.result) &&
        op.entries.result.every((v) => v === null || typeof v === "string") &&
        Array.isArray(op?.entries?.carries) &&
        op.entries.carries.every((v) => v === null || typeof v === "string"),
    ) &&
    // La régénération doit reproduire exactement les opérations d'origine —
    // sinon les chiffres écrits appartiennent à d'autres calculs.
    fingerprintOps(
      safeGenerateSerie(
        resolvePalierForFamille(famille, saved.palierId),
        saved.seed,
        saved.serieSize,
      ),
    ) === saved.opsFingerprint
  );
}

/**
 * L'état « sorti » d'un plateau + reprise : lit la clé de la famille, valide
 * avec le prédicat complet, PURGE silencieusement une clé non reprenable
 * (palier changé par le parent, cache d'un autre format — l'éducatrice a
 * réorganisé l'étagère, exception assumée de la prémisse 4).
 */
function readResumableSerie(
  famille: Operation,
  palierId: string,
  serieSize: number,
): SerieState | null {
  const key = serieStorageKeyOf(famille);
  const saved = readJson<SerieState>(key);
  if (saved === null) {
    return null;
  }
  if (
    isResumableSerie(saved, famille, palierId, serieSize) &&
    saved.index < saved.serieSize
  ) {
    return saved;
  }
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Storage unavailable — reading already failed softly anyway.
  }
  return null;
}

/**
 * L'atelier des opérations posées — "la série qui se range" (eng-review T4-A).
 *
 * One opening = one short series of operations (parent-set size). The last
 * one finished, the workshop tidies itself: the page breathes, nothing new
 * arrives on its own. Reopening a series is a deliberate child gesture.
 *
 * V1 is the "écriture libre" mode (T3-C): the child writes freely like on
 * paper — nothing is judged while writing; at the end the solved operation
 * appears alongside for the child to compare. The stamp-game manipulation
 * (tranche 5) arrives after the school confirms the material.
 */
/**
 * Les trois temps de l'atelier : l'étagère (le choix), la série (le travail),
 * le moment « rangé » (la transition de fin, D-2A — jamais une destination).
 * Phase en état local, pas de route : le back matériel sort de l'atelier
 * (écart assumé D-8B), la flèche in-app fait le trajet fin.
 */
type Phase =
  | { kind: "shelf" }
  | { kind: "serie"; famille: Operation }
  | { kind: "tidied"; famille: Operation };

function CalculWorkshopPage() {
  const { settings: dbSettings, heroName, doudouName } = Route.useLoaderData();
  const [settings, setSettings] = useState<MathSettings | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "shelf" });
  const [serie, setSerie] = useState<SerieState | null>(null);
  const [selected, setSelected] = useState<CellRef | null>(null);
  // Digit currently being dragged from the numpad (drives the DragOverlay).
  const [dragDigit, setDragDigit] = useState<string | null>(null);
  // On touch, implicit pointer capture retargets the post-drag click onto the
  // numpad key — this one-shot flag swallows that ghost click so a drag never
  // ALSO writes into the selected cell. Consumed by the first suppressed
  // click; the fallback timer covers pointers that never emit one (a mouse
  // released away from the key).
  const dragJustEndedRef = useRef(false);
  // The operation index a drag started on: a drop landing after the tray
  // advanced (multi-touch) must never ink the NEXT operation's grid.
  const dragOpIndexRef = useRef<number | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, POINTER_ACTIVATION));

  // Settings: DB when reachable (and cache it), else device cache, else
  // defaults. NORMALIZED whatever the source (normalizeFamilySettings, pure
  // et golden-testée) — un cache édité ou un vieux format ne crashe jamais
  // la page enfant. Même effet : le pont de clé legacy (une seule fois) et
  // la purge des clés orphelines des familles désactivées (D-3A/F9).
  useEffect(() => {
    // Pont 2A/T4 : la série d'AVANT l'étagère est re-rangée sous la clé de
    // sa famille (dérivée de son palier) — jamais écrasante, puis l'ancienne
    // clé disparaît. Le shape-guard normal validera comme d'habitude.
    const legacy = bridgeLegacySerie(readJson<unknown>(LEGACY_SERIE_STATE_KEY));
    if (
      legacy &&
      readJson<unknown>(serieStorageKeyOf(legacy.famille)) === null
    ) {
      writeJson(serieStorageKeyOf(legacy.famille), legacy.state);
    }
    try {
      window.localStorage.removeItem(LEGACY_SERIE_STATE_KEY);
    } catch {
      // Storage unavailable — nothing to migrate anyway.
    }

    const normalized = normalizeFamilySettings(
      dbSettings ?? readJson<unknown>(SETTINGS_CACHE_KEY),
    );
    if (dbSettings) {
      writeJson(SETTINGS_CACHE_KEY, normalized);
    }
    for (const op of FAMILLES) {
      if (!normalized.familles.some((f) => f.op === op)) {
        try {
          window.localStorage.removeItem(serieStorageKeyOf(op));
        } catch {
          // Storage unavailable — the ghost key is unreadable anyway.
        }
      }
    }
    setSettings(normalized);
  }, [dbSettings]);

  // Persistance : chaque frappe est sauvegardée sous la clé de SA famille —
  // reposer le plateau ou fermer l'onglet ne perd jamais rien.
  useEffect(() => {
    if (serie) {
      writeJson(serieStorageKeyOf(serie.famille), serie);
    }
  }, [serie]);

  // Fin de série (D-2A) : le moment « rangé » est une TRANSITION vers
  // l'étagère (où le plateau est visiblement rangé), pas une destination.
  const finished =
    phase.kind === "serie" && serie !== null && serie.index >= serie.serieSize;
  useEffect(() => {
    if (finished && serie) {
      setPhase({ kind: "tidied", famille: serie.famille });
    }
  }, [finished, serie]);
  useEffect(() => {
    if (phase.kind !== "tidied") {
      return;
    }
    const timer = setTimeout(() => {
      try {
        window.localStorage.removeItem(serieStorageKeyOf(phase.famille));
      } catch {
        // Storage unavailable — la série finie ne reviendra pas non plus.
      }
      setSerie(null);
      setPhase({ kind: "shelf" });
    }, 1600);
    return () => clearTimeout(timer);
  }, [phase]);

  const palier = serie
    ? resolvePalierForFamille(serie.famille, serie.palierId)
    : resolvePalier(null);
  // Deps = the values that drive generation only (seed/size/palier) — the
  // serie OBJECT changes identity on every digit tap and must not retrigger
  // the rejection sampling.
  const serieSeed = serie?.seed;
  const serieSize = serie?.serieSize;
  const operations = useMemo(
    () =>
      serieSeed !== undefined && serieSize !== undefined
        ? safeGenerateSerie(palier, serieSeed, serieSize)
        : [],
    [serieSeed, serieSize, palier],
  );

  /** Prendre un plateau : reprise exacte si la série est reprenable, sinon
      série fraîche au palier parental de CETTE famille. */
  function takeTray(op: Operation) {
    if (!settings) {
      return;
    }
    const reglage = settings.familles.find((f) => f.op === op);
    const palierForOp = resolvePalierForFamille(op, reglage?.palier);
    const saved = readResumableSerie(op, palierForOp.id, settings.serieSize);
    setSelected(null);
    setSerie(saved ?? freshSerie(op, palierForOp, settings.serieSize));
    setPhase({ kind: "serie", famille: op });
  }

  /** « Reposer le plateau » (T2/D-4A) : retour à l'étagère, sans perte —
      la série est sauvegardée à chaque frappe. */
  function reposerPlateau() {
    setSelected(null);
    setSerie(null);
    setPhase({ kind: "shelf" });
  }

  if (!settings) {
    // First client render (hydration-safe): the calm background, nothing else.
    // L'étagère n'apparaît qu'une fois settings + localStorage résolus côté
    // client, en fondu d'ensemble — jamais de plateau qui saute (D-3A/F6).
    return <div className="min-h-[80vh]" />;
  }

  if (phase.kind === "shelf") {
    const trays: TrayInfo[] = settings.familles.map((f) => ({
      op: f.op,
      sorti:
        readResumableSerie(
          f.op,
          resolvePalierForFamille(f.op, f.palier).id,
          settings.serieSize,
        ) !== null,
    }));
    return (
      <WorkshopShell arrow={{ kind: "accueil" }}>
        <FadeIn>
          <TrayShelf
            doudouName={doudouName}
            heroName={heroName}
            onTake={takeTray}
            trays={trays}
          />
        </FadeIn>
      </WorkshopShell>
    );
  }

  if (phase.kind === "tidied" || !serie) {
    return (
      <WorkshopShell arrow={{ kind: "accueil" }}>
        <TidiedMoment />
      </WorkshopShell>
    );
  }

  const operation = finished ? null : operations[serie.index];
  const layout = operation ? layoutOperation(operation) : null;
  const current = finished ? null : serie.perOp[serie.index];

  function updateCurrent(update: Partial<SerieState["perOp"][number]>) {
    setSerie((prev) => {
      if (!prev) {
        return prev;
      }
      const perOp = prev.perOp.map((op, i) =>
        i === prev.index ? { ...op, ...update } : op,
      );
      return { ...prev, perOp };
    });
  }

  function setCell(cell: CellRef, value: string | null) {
    // Everything derives from prev INSIDE the updater (never the render-time
    // closure) and is bounds/done-guarded: a late drop or a second write in
    // the same event can never clobber state or ink a frozen answer.
    setSerie((prev) => {
      if (!prev) {
        return prev;
      }
      const op = prev.perOp[prev.index];
      if (!op || op.done) {
        return prev;
      }
      const rowKey = cell.row === "result" ? "result" : "carries";
      if (cell.col < 0 || cell.col >= op.entries[rowKey].length) {
        return prev;
      }
      const entries: GridEntries = {
        result: [...op.entries.result],
        carries: [...op.entries.carries],
      };
      entries[rowKey][cell.col] = value;
      const perOp = prev.perOp.map((o, i) =>
        i === prev.index ? { ...o, entries } : o,
      );
      return { ...prev, perOp };
    });
  }

  function writeDigit(digit: string) {
    if (dragJustEndedRef.current) {
      // The ghost click after a drag — swallow it and re-arm for real taps.
      dragJustEndedRef.current = false;
      return;
    }
    if (!selected) {
      return;
    }
    setCell(selected, digit);
    setSelected(pencilAdvance(selected));
  }

  function endDrag() {
    setDragDigit(null);
    dragOpIndexRef.current = null;
    dragJustEndedRef.current = true;
    // Browsers don't guarantee the ghost click lands before a 0ms timer, so
    // the flag is one-shot (see writeDigit) with a generous fallback window.
    setTimeout(() => {
      dragJustEndedRef.current = false;
    }, 300);
  }

  function handleDragStart(event: DragStartEvent) {
    const digit = event.active.data.current?.digit;
    setDragDigit(typeof digit === "string" ? digit : null);
    dragOpIndexRef.current = serie?.index ?? null;
    // Single-pencil metaphor: the lifted tile IS the pencil now — the old
    // selection halo goes out so only the hovered cell glows during the drag.
    setSelected(null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const dragOpIndex = dragOpIndexRef.current;
    endDrag();
    const digit = event.active.data.current?.digit;
    const cell = event.over?.data.current?.cell;
    if (typeof digit !== "string" || !isCellRef(cell)) {
      return;
    }
    // A drop only counts on the operation it started on, and only while that
    // operation is still being written — a drag surviving a "J'ai fini" or a
    // tray change (second finger) lands as a calm no-op.
    if (dragOpIndex === null || dragOpIndex !== serie?.index) {
      return;
    }
    if (!current || current.done) {
      return;
    }
    setCell(cell, digit);
    // Same pencil flow as a tap: the dropped cell becomes "where the pencil
    // is", stepping leftwards on the result line.
    setSelected(pencilAdvance(cell));
  }

  function erase() {
    if (!selected) {
      return;
    }
    setCell(selected, null);
  }

  function nextTray() {
    setSelected(null);
    setSerie((prev) => (prev ? { ...prev, index: prev.index + 1 } : prev));
  }

  if (finished || !(operation && layout && current)) {
    // Fin de série (ou série vide sur palier cassé — dégradation calme) :
    // le moment « rangé », puis l'effet ci-dessus ramène à l'étagère.
    return (
      <WorkshopShell arrow={{ kind: "accueil" }}>
        <TidiedMoment />
      </WorkshopShell>
    );
  }

  return (
    <WorkshopShell arrow={{ kind: "reposer", onReposer: reposerPlateau }}>
      {/* No tray/progress row (review decision 3B): the series is bounded but
          never counted in front of the child — the end simply arrives, like
          the end of a story. */}
      <DndContext
        collisionDetection={forgivingCollision}
        onDragCancel={endDrag}
        onDragEnd={handleDragEnd}
        onDragStart={handleDragStart}
        sensors={sensors}
      >
        {heroName ? (
          <p className="max-w-md text-center text-muted-foreground text-xl leading-relaxed">
            {enonceFor(operation, {
              hero: heroName,
              doudou: doudouName ?? undefined,
            })}
          </p>
        ) : null}

        <div className="flex flex-wrap items-start justify-center gap-6">
          <ColumnGrid
            entries={current.entries}
            layout={layout}
            onSelect={setSelected}
            selected={selected}
            variant="libre"
          />
          {current.done ? (
            <ColumnGrid layout={layout} variant="solution" />
          ) : null}
        </div>

        {current.done ? (
          <Button
            className="gap-2 text-muted-foreground text-xl"
            onClick={nextTray}
            variant="ghost"
          >
            {serie.index + 1 < serie.serieSize
              ? "Plateau suivant"
              : "Ranger l'atelier"}
          </Button>
        ) : (
          <>
            <SoftNumpad onDigit={writeDigit} onErase={erase} />
            <Button
              className="gap-2 text-muted-foreground text-xl"
              disabled={current.entries.result.every((d) => d === null)}
              onClick={() => {
                updateCurrent({ done: true });
                setSelected(null);
              }}
              variant="ghost"
            >
              J'ai fini, je compare
            </Button>
          </>
        )}
        {/* The dragged digit follows the finger as a tile — same ink as a key,
          a soft shadow, nothing else. No drop animation: the digit is simply
          inked in the cell, like a pencil lifting. */}
        <DragOverlay dropAnimation={null}>
          {dragDigit ? (
            <span
              className={cn(
                DIGIT_TILE_CLASSES,
                "flex items-center justify-center border bg-background shadow-md",
              )}
            >
              {dragDigit}
            </span>
          ) : null}
        </DragOverlay>
      </DndContext>
    </WorkshopShell>
  );
}

/**
 * Common frame — la flèche à deux niveaux (T2/D-4A), libellés IMPOSÉS :
 * deux « étagères » coexistent dans l'app (l'accueil à deux portes et
 * l'étagère de plateaux), les noms ne se recyclent pas. Zone tactile ≥44px.
 */
type ShellArrow =
  | { kind: "accueil" }
  | { kind: "reposer"; onReposer: () => void };

function WorkshopShell({
  arrow,
  children,
}: {
  arrow: ShellArrow;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[80vh] w-full max-w-3xl flex-col items-center gap-8 py-6">
      <div className="w-full">
        {arrow.kind === "accueil" ? (
          <Button
            aria-label="Retour à l'accueil"
            className="min-h-11 min-w-11 gap-2 text-lg text-muted-foreground"
            nativeButton={false}
            render={<Link aria-label="Retour à l'accueil" to="/" />}
            variant="ghost"
          >
            <ArrowLeft className="size-5" />
          </Button>
        ) : (
          <Button
            aria-label="Reposer le plateau"
            className="min-h-11 min-w-11 gap-2 text-lg text-muted-foreground"
            onClick={arrow.onReposer}
            variant="ghost"
          >
            <ArrowLeft className="size-5" />
          </Button>
        )}
      </div>
      {children}
    </div>
  );
}

/**
 * Le moment « rangé » (T4-A, révisé D-2A) : une TRANSITION, pas une
 * destination — 🌿 respire un instant, puis l'effet ramène à l'étagère où le
 * plateau est visiblement rangé. Aucun bouton : rien ne presse, rien ne
 * court-circuite le geste de choix.
 */
function TidiedMoment() {
  return (
    <FadeIn>
      <div className="flex flex-1 flex-col items-center justify-center gap-10 text-center">
        <p aria-hidden="true" className="text-6xl">
          🌿
        </p>
        <p className="text-2xl text-muted-foreground">L'atelier est rangé.</p>
      </div>
    </FadeIn>
  );
}

/**
 * Apparition en fondu d'ensemble (D-3A/F6) — dégrade en apparition
 * instantanée sous prefers-reduced-motion (jamais un écran resté invisible).
 */
function FadeIn({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(true);
  }, []);
  return (
    <div
      className={cn(
        "flex w-full flex-1 flex-col transition-opacity duration-300 motion-reduce:transition-none",
        visible ? "opacity-100" : "opacity-0 motion-reduce:opacity-100",
      )}
    >
      {children}
    </div>
  );
}

function freshSerie(
  famille: Operation,
  palier: Palier,
  serieSize: number,
): SerieState {
  // Le seed naît à la PRISE du plateau (T1 : plus de seed pré-engagé).
  const seed = newSerieSeed();
  const size = serieSize;
  const ops = safeGenerateSerie(palier, seed, size);
  return {
    famille,
    palierId: palier.id,
    serieSize: size,
    seed,
    // ops vide (palier cassé, cas théorique) : perOp vide → le rendu tombe
    // sur l'état "rangé" via le garde operation/current — dégradation calme.
    index: 0,
    opsFingerprint: fingerprintOps(ops),
    perOp: ops.map((op) => ({
      entries: emptyEntries(layoutOperation(op)),
      done: false,
    })),
  };
}
