import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Home, Printer } from "lucide-react";
import { useEffect, useState } from "react";
import { PrintableOperationsSheet } from "~/components/printable-operations";
import { Button } from "~/components/ui/button";
import {
  clampSerieSize,
  type GeneratedOperation,
  generateSerie,
  MAX_SERIE_SIZE,
  MIN_SERIE_SIZE,
  newSerieSeed,
  PALIERS,
  resolvePalier,
} from "~/lib/operations";
import { listDoudousFn } from "~/server/doudous-functions";
import { listHeroesFn } from "~/server/heroes-functions";
import { getMathSettingsFn, saveMathSettingsFn } from "~/server/math-functions";

export const Route = createFileRoute("/parents/calcul")({
  loader: async () => {
    // Settings has server-side DEFAULTS — a DB hiccup shouldn't kill the
    // whole parent page any more than the heroes/doudous lists do.
    const [settings, heroes, doudous] = await Promise.all([
      getMathSettingsFn().catch(() => null),
      listHeroesFn().catch(() => []),
      listDoudousFn().catch(() => []),
    ]);
    return {
      settings,
      heroName: heroes[0]?.label ?? null,
      doudouName: doudous[0]?.label ?? null,
    };
  },
  component: ParentsCalculPage,
});

const FICHE_SIZE = 6;

/**
 * Parent-only page for the "poser des calculs" mini-app: pick the palier
 * (the ONLY progression mechanism — eng-review T2-A: the adult decides, like
 * the educator in a Montessori class; the app never evaluates the child),
 * set the series size, and print an A5 sheet of operations to complete in
 * pencil at the kitchen table.
 */
function ParentsCalculPage() {
  const router = useRouter();
  const { settings, heroName, doudouName } = Route.useLoaderData();
  const [palierId, setPalierId] = useState(resolvePalier(settings?.palier).id);
  const [serieSize, setSerieSize] = useState(
    clampSerieSize(settings?.serieSize),
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [ficheOperations, setFicheOperations] = useState<
    GeneratedOperation[] | null
  >(null);

  const dirty =
    palierId !== resolvePalier(settings?.palier).id ||
    serieSize !== clampSerieSize(settings?.serieSize);

  // Print AFTER the sheet is committed and painted (double rAF) — a bare
  // setTimeout can race the paint on slow devices and snapshot a blank fiche.
  useEffect(() => {
    if (!ficheOperations) {
      return;
    }
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => window.print());
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [ficheOperations]);

  async function save() {
    setSaving(true);
    setSaveError(null);
    try {
      const result = await saveMathSettingsFn({
        data: { palier: palierId, serieSize },
      });
      if (!result.success) {
        setSaveError(result.error);
        return;
      }
      await router.invalidate();
    } catch {
      // Réseau en panne : message calme côté parent, le formulaire reste dirty.
      setSaveError("Enregistrement impossible pour le moment — réessaie.");
    } finally {
      setSaving(false);
    }
  }

  function printFiche() {
    const palier = resolvePalier(palierId);
    const operations = generateSerie(
      palier.constraints,
      newSerieSeed(),
      FICHE_SIZE,
    );
    setFicheOperations(operations);
    // L'impression part de l'effet ci-dessus, après commit + paint.
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <div className="no-print">
        <Button
          className="gap-2 text-lg text-muted-foreground"
          nativeButton={false}
          render={<Link to="/parents" />}
          variant="ghost"
        >
          <Home className="size-5" />
          Espace parent
        </Button>
      </div>

      <div className="no-print space-y-2">
        <h1 className="font-bold text-3xl">Les calculs</h1>
        <p className="text-muted-foreground">
          Choisis le palier des opérations posées — comme l'éducatrice décide
          des présentations, c'est toi qui décides quand avancer. Rien de tout
          cela n'est montré à l'enfant.
        </p>
      </div>

      <ul className="no-print space-y-2">
        {PALIERS.map((palier) => (
          <li key={palier.id}>
            <label className="flex cursor-pointer items-center gap-4 rounded-2xl border bg-card p-4 transition-colors has-checked:border-primary">
              <input
                checked={palierId === palier.id}
                className="size-4 accent-primary"
                name="palier"
                onChange={() => setPalierId(palier.id)}
                type="radio"
              />
              <span className="text-lg">{palier.label}</span>
            </label>
          </li>
        ))}
      </ul>

      <div className="no-print flex items-center gap-4">
        <label className="text-lg" htmlFor="serie-size">
          Opérations par série
        </label>
        <select
          className="rounded-xl border bg-card px-3 py-2 text-lg"
          id="serie-size"
          onChange={(e) => setSerieSize(Number(e.target.value))}
          value={serieSize}
        >
          {Array.from(
            { length: MAX_SERIE_SIZE - MIN_SERIE_SIZE + 1 },
            (_, i) => MIN_SERIE_SIZE + i,
          ).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      <div className="no-print flex flex-wrap items-center gap-4">
        <Button disabled={!dirty || saving} onClick={save}>
          {saving ? "Enregistrement…" : "Enregistrer"}
        </Button>
        <Button className="gap-2" onClick={printFiche} variant="outline">
          <Printer className="size-5" />
          Imprimer une fiche
        </Button>
        {saveError ? (
          <p className="text-muted-foreground text-sm">{saveError}</p>
        ) : null}
      </div>

      {ficheOperations ? (
        <PrintableOperationsSheet
          entities={
            heroName
              ? { hero: heroName, doudou: doudouName ?? undefined }
              : undefined
          }
          operations={ficheOperations}
          title="Des calculs à poser"
        />
      ) : null}
    </div>
  );
}
