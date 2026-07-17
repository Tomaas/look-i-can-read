import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  type CellRef,
  ColumnGrid,
  emptyEntries,
  type GridEntries,
} from "~/components/calcul/column-grid";
import { SoftNumpad } from "~/components/calcul/soft-numpad";
import { Button } from "~/components/ui/button";
import {
  DEFAULT_SERIE_SIZE,
  enonceFor,
  generateSerie,
  layoutOperation,
  resolvePalier,
} from "~/lib/operations";
import { listDoudousFn } from "~/server/doudous-functions";
import { listHeroesFn } from "~/server/heroes-functions";
import { getMathSettingsFn, type MathSettings } from "~/server/math-functions";

/** 2A: a slow DB is treated like an unreachable one — short timeout, no error. */
function withTimeout<T>(promise: Promise<T>, fallback: T, ms = 3000): Promise<T> {
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
const SERIE_STATE_KEY = "calcul:serie";

interface SerieState {
  palierId: string;
  serieSize: number;
  seed: number;
  index: number;
  perOp: { entries: GridEntries; done: boolean }[];
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
function CalculWorkshopPage() {
  const { settings: dbSettings, heroName, doudouName } = Route.useLoaderData();
  const [settings, setSettings] = useState<MathSettings | null>(null);
  const [serie, setSerie] = useState<SerieState | null>(null);
  const [selected, setSelected] = useState<CellRef | null>(null);

  // Settings: DB when reachable (and cache it), else device cache, else defaults.
  useEffect(() => {
    if (dbSettings) {
      writeJson(SETTINGS_CACHE_KEY, dbSettings);
      setSettings(dbSettings);
      return;
    }
    setSettings(
      readJson<MathSettings>(SETTINGS_CACHE_KEY) ?? {
        palier: resolvePalier(null).id,
        serieSize: DEFAULT_SERIE_SIZE,
      },
    );
  }, [dbSettings]);

  // Série: resume the in-progress one if it matches the current settings,
  // else start fresh. Resuming is silent — nothing lost, nothing signaled.
  useEffect(() => {
    if (!settings) {
      return;
    }
    const saved = readJson<SerieState>(SERIE_STATE_KEY);
    if (
      saved &&
      saved.palierId === settings.palier &&
      saved.serieSize === settings.serieSize &&
      saved.index < saved.serieSize
    ) {
      setSerie(saved);
      return;
    }
    setSerie(freshSerie(settings));
  }, [settings]);

  useEffect(() => {
    if (serie) {
      writeJson(SERIE_STATE_KEY, serie);
    }
  }, [serie]);

  const palier = resolvePalier(serie?.palierId);
  const operations = useMemo(
    () =>
      serie
        ? generateSerie(palier.constraints, serie.seed, serie.serieSize)
        : [],
    [serie, palier],
  );

  if (!settings || !serie) {
    // First client render (hydration-safe): the calm background, nothing else.
    return <div className="min-h-[80vh]" />;
  }

  const finished = serie.index >= serie.serieSize;
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

  function writeDigit(digit: string) {
    if (!current || !layout || !selected) {
      return;
    }
    const entries: GridEntries = {
      result: [...current.entries.result],
      carries: [...current.entries.carries],
    };
    entries[selected.row === "result" ? "result" : "carries"][selected.col] =
      digit;
    updateCurrent({ entries });
    // Pencil flow: after a result digit, step to the next column leftwards.
    if (selected.row === "result" && selected.col > 0) {
      setSelected({ row: "result", col: selected.col - 1 });
    }
  }

  function erase() {
    if (!current || !selected) {
      return;
    }
    const entries: GridEntries = {
      result: [...current.entries.result],
      carries: [...current.entries.carries],
    };
    entries[selected.row === "result" ? "result" : "carries"][selected.col] =
      null;
    updateCurrent({ entries });
  }

  function nextTray() {
    setSelected(null);
    setSerie((prev) => (prev ? { ...prev, index: prev.index + 1 } : prev));
  }

  function openNewSerie() {
    if (!settings) {
      return;
    }
    setSelected(null);
    setSerie(freshSerie(settings));
  }

  if (finished || !(operation && layout && current)) {
    return (
      <WorkshopShell>
        <WorkshopTidied onNewSerie={openNewSerie} />
      </WorkshopShell>
    );
  }

  return (
    <WorkshopShell>
      {/* The trays of the series — plain, unnumbered, no progress meaning:
              just "which plateau is out", like activity trays on a shelf. */}
      <div aria-hidden="true" className="flex gap-3">
        {serie.perOp.map((op, i) => (
          <span
            className={`size-3 rounded-full ${trayTint(op.done, i === serie.index)}`}
            key={`tray-${serie.seed}-${i}`}
          />
        ))}
      </div>

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
    </WorkshopShell>
  );
}

/** Common frame: the calm page with just a back arrow to the shelf. */
function WorkshopShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[80vh] w-full max-w-3xl flex-col items-center gap-8 py-6">
      <div className="w-full">
        <Button
          className="gap-2 text-lg text-muted-foreground"
          nativeButton={false}
          render={<Link to="/" />}
          variant="ghost"
        >
          <ArrowLeft className="size-5" />
        </Button>
      </div>
      {children}
    </div>
  );
}

function trayTint(done: boolean, isCurrent: boolean): string {
  if (isCurrent) {
    return "bg-primary";
  }
  return done ? "bg-muted-foreground/40" : "bg-muted-foreground/15";
}

/** The gentle end state (T4-A): the workshop tidied itself, nothing pushes. */
function WorkshopTidied({ onNewSerie }: { onNewSerie: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-10 text-center">
      <p aria-hidden="true" className="text-6xl">
        🌿
      </p>
      <p className="text-2xl text-muted-foreground">L'atelier est rangé.</p>
      <div className="flex flex-col items-center gap-3">
        <Button
          className="gap-2 text-muted-foreground text-xl"
          nativeButton={false}
          render={<Link to="/" />}
          variant="ghost"
        >
          Retour à l'étagère
        </Button>
        <Button
          className="gap-2 text-muted-foreground text-xl"
          onClick={onNewSerie}
          variant="ghost"
        >
          Ouvrir une nouvelle série
        </Button>
      </div>
    </div>
  );
}

function freshSerie(settings: MathSettings): SerieState {
  const palier = resolvePalier(settings.palier);
  const seed = Date.now() % 2147483647;
  const size = settings.serieSize;
  return {
    palierId: palier.id,
    serieSize: size,
    seed,
    index: 0,
    perOp: Array.from({ length: size }, (_, i) => ({
      entries: emptyEntries(
        layoutOperation(generateSerie(palier.constraints, seed, size)[i]),
      ),
      done: false,
    })),
  };
}
