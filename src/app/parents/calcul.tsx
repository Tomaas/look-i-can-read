import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Home, Printer } from "lucide-react";
import { useEffect, useState } from "react";
import { PrintableOperationsSheet } from "~/components/printable-operations";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/cn";
import {
  clampSerieSize,
  FAMILLE_NOMS,
  FAMILLES,
  type FamilleSetting,
  type GeneratedOperation,
  generateSerie,
  MAX_SERIE_SIZE,
  MIN_SERIE_SIZE,
  newSerieSeed,
  type Operation,
  paliersByFamille,
  resolvePalierForFamille,
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

/** Libellés de cartes dérivés de l'unique mapping lib (maintainability). */
function familleLabel(op: Operation): string {
  const nom = FAMILLE_NOMS[op];
  return nom.charAt(0).toUpperCase() + nom.slice(1);
}

/** Réglage local d'une carte : activée + palier (toujours de la famille). */
type CardState = Record<Operation, { active: boolean; palier: string }>;

function cardStateFrom(familles: FamilleSetting[] | undefined): CardState {
  const state = {} as CardState;
  for (const op of FAMILLES) {
    const saved = familles?.find((f) => f.op === op);
    state[op] = {
      active: Boolean(saved),
      palier: resolvePalierForFamille(op, saved?.palier).id,
    };
  }
  return state;
}

/**
 * Parent-only page for the "poser des calculs" mini-app: prepare the child's
 * SHELF — one card per operation family (activated + palier), like the
 * educator prepares the classroom shelf (eng-review T2-A + premise 2: the
 * adult decides what is AVAILABLE, the child chooses their tray; the app
 * never evaluates the child). Series size stays global. Each active family
 * can print its own A5 sheet of operations to complete in pencil.
 */
function ParentsCalculPage() {
  const router = useRouter();
  const { settings, heroName, doudouName } = Route.useLoaderData();

  if (!settings) {
    // Red-team RT2 : un échec de chargement ne doit JAMAIS se présenter
    // comme un formulaire éditable (toutes familles décochées) — un parent
    // qui « répare » écraserait les vrais réglages avec des défauts.
    return <SettingsUnavailable />;
  }

  return (
    <ParentsCalculForm
      doudouName={doudouName}
      heroName={heroName}
      onSaved={() => router.invalidate()}
      settings={settings}
    />
  );
}

function SettingsUnavailable() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <Button
        className="gap-2 text-lg text-muted-foreground"
        nativeButton={false}
        render={<Link to="/parents" />}
        variant="ghost"
      >
        <Home className="size-5" />
        Espace parent
      </Button>
      <h1 className="font-bold text-3xl">Les calculs</h1>
      <p className="text-muted-foreground">
        Réglages indisponibles pour le moment — recharge la page dans un
        instant.
      </p>
    </div>
  );
}

function ParentsCalculForm({
  settings,
  heroName,
  doudouName,
  onSaved,
}: {
  settings: NonNullable<ReturnType<typeof Route.useLoaderData>["settings"]>;
  heroName: string | null;
  doudouName: string | null;
  onSaved: () => Promise<void>;
}) {
  const [cards, setCards] = useState<CardState>(() =>
    cardStateFrom(settings.familles),
  );
  const [serieSize, setSerieSize] = useState(
    clampSerieSize(settings.serieSize),
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [ficheOperations, setFicheOperations] = useState<
    GeneratedOperation[] | null
  >(null);

  const savedCards = cardStateFrom(settings.familles);
  // Le palier d'une famille DÉSACTIVÉE ne compte pas (adversarial #5) : il
  // ne part pas dans la sauvegarde, il ne peut pas rendre le formulaire sale.
  const dirty =
    serieSize !== clampSerieSize(settings.serieSize) ||
    FAMILLES.some(
      (op) =>
        cards[op].active !== savedCards[op].active ||
        (cards[op].active && cards[op].palier !== savedCards[op].palier),
    );

  const activeCount = FAMILLES.filter((op) => cards[op].active).length;

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

  function setCard(op: Operation, update: Partial<CardState[Operation]>) {
    setCards((prev) => ({ ...prev, [op]: { ...prev[op], ...update } }));
  }

  async function save() {
    setSaving(true);
    setSaveError(null);
    let saved = false;
    try {
      const result = await saveMathSettingsFn({
        data: {
          serieSize,
          familles: FAMILLES.filter((op) => cards[op].active).map((op) => ({
            op,
            palier: cards[op].palier,
          })),
        },
      });
      if (!result.success) {
        setSaveError(result.error);
        return;
      }
      saved = true;
      // Hors du try/catch d'enregistrement (adversarial #4) : un re-load qui
      // échoue APRÈS un save réussi ne doit pas prétendre que rien n'a été
      // enregistré.
      await onSaved();
    } catch {
      setSaveError(
        saved
          ? "Enregistré — le rechargement a échoué, recharge la page pour vérifier."
          : "Enregistrement impossible pour le moment — réessaie.",
      );
    } finally {
      setSaving(false);
    }
  }

  function printFiche(op: Operation) {
    const palier = resolvePalierForFamille(op, cards[op].palier);
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
          Prépare l'étagère — comme l'éducatrice décide des présentations, c'est
          toi qui choisis les familles d'opérations disponibles et leur palier.
          L'enfant choisit son plateau ; rien de tout cela ne lui est montré.
        </p>
      </div>

      <ul className="no-print space-y-4">
        {FAMILLES.map((op) => {
          const card = cards[op];
          const lastActive = card.active && activeCount === 1;
          return (
            <li className="space-y-3 rounded-2xl border bg-card p-4" key={op}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <label
                  className={cn(
                    // Toute la rangée est la cible (≥44px, design review) ;
                    // le curseur ne promet un clic que si le contrôle répond.
                    "flex min-h-11 items-center gap-3",
                    !lastActive && "cursor-pointer",
                  )}
                >
                  <input
                    checked={card.active}
                    className="size-4 accent-primary"
                    disabled={lastActive}
                    onChange={(e) => setCard(op, { active: e.target.checked })}
                    type="checkbox"
                  />
                  <span className="font-semibold text-lg">
                    {familleLabel(op)}
                  </span>
                </label>
                {card.active ? (
                  <Button
                    className="gap-2"
                    onClick={() => printFiche(op)}
                    size="sm"
                    variant="outline"
                  >
                    <Printer className="size-4" />
                    Imprimer une fiche
                  </Button>
                ) : null}
              </div>
              {lastActive ? (
                <p className="text-muted-foreground text-sm">
                  Au moins une famille reste sur l'étagère.
                </p>
              ) : null}
              {card.active ? (
                <div className="space-y-2">
                  <ul className="space-y-2">
                    {paliersByFamille(op).map((palier) => (
                      <li key={palier.id}>
                        <label className="flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors has-checked:border-primary">
                          <input
                            checked={card.palier === palier.id}
                            className="size-4 accent-primary"
                            name={`palier-${op}`}
                            onChange={() => setCard(op, { palier: palier.id })}
                            type="radio"
                          />
                          <span>{palier.label}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                  <p className="text-muted-foreground text-sm">
                    Changer le palier range la série en cours.
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  N'apparaît pas sur l'étagère. Désactiver oublie le palier
                  choisi.
                </p>
              )}
            </li>
          );
        })}
      </ul>

      <div className="no-print space-y-2">
        <div className="flex items-center gap-4">
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
        {/* Même transparence que pour le palier (adversarial #2) : la
            conséquence est dite AVANT le geste, pour toutes les familles. */}
        <p className="text-muted-foreground text-sm">
          Changer la taille range les séries en cours de toutes les familles.
        </p>
      </div>

      <div className="no-print flex flex-wrap items-center gap-4">
        <Button disabled={!dirty || saving} onClick={save}>
          {saving ? "Enregistrement…" : "Enregistrer"}
        </Button>
        {saveError ? (
          // Distinct des textes d'aide passifs (design review F11) : un échec
          // d'enregistrement doit se voir — calme, mais pas camouflé.
          <p className="font-medium text-foreground text-sm">{saveError}</p>
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
