import { useId, useState } from "react";
import { Button } from "~/components/ui/button";
import { IMAGE_MODELS } from "~/config/image-models";
import { generateTestImageFn, type TestImageResult } from "~/server/functions";

/**
 * Parent-only test playground (lives under the /parents/image-model chooser):
 * type a prompt, pick a model, "Générer", and stack the results so the parent
 * can eyeball 2.5 vs 3.1 vs pro side by side. This INTENTIONALLY generates
 * images (real $) — user-driven by the button. No persistence: the result list
 * is in-session only; the generated files live under data/media via the
 * provider's saveMedia.
 *
 * Calm-tool note: the CHILD flow is untouched. Showing the prompt / result /
 * errors to the PARENT is fine; we keep the aesthetic calm (no scores).
 */

// A representative Ghibli-style French scene, mirroring what stories produce
// (incl. the style suffix). The parent edits it freely; it is sent AS-IS — we
// never auto-append the suffix, so the parent has full control.
const DEFAULT_PROMPT =
  "Un petit garçon nommé Jules joue dans un jardin ensoleillé avec un " +
  "doudou lapin. Ambiance douce et calme. Style studio Ghibli.";

// Each generate appends one entry (most recent first). `key` keeps React happy
// across an unbounded, non-persisted list.
interface ResultEntry extends TestImageResult {
  key: number;
}

/** One result card: the preview + a caption (model · ms · resolution), or a
 * calm inline message on a skip/failure. Parent-facing, so plain wording. */
function ResultCard({ entry }: { entry: ResultEntry }) {
  return (
    <li className="overflow-hidden rounded-2xl border bg-card">
      {entry.imageStatus === "ready" && entry.imagePath ? (
        <img
          alt="Aperçu généré"
          className="aspect-[4/3] w-full object-cover"
          src={entry.imagePath}
        />
      ) : (
        <div className="flex aspect-[4/3] w-full items-center justify-center px-6 text-center">
          <p className="text-muted-foreground">
            {entry.imageStatus === "skipped"
              ? "Les images sont désactivées (IMAGE_ENABLED). Active-les pour tester."
              : "Le dessin n'a pas pu être généré."}
          </p>
        </div>
      )}
      <p className="px-4 py-3 text-muted-foreground text-sm">
        {entry.model}
        {entry.imageStatus === "ready" ? ` · ${entry.ms} ms` : ""}
      </p>
    </li>
  );
}

export function ImageTestPlayground({
  initialModel,
}: {
  /** The currently-persisted default model — seeds the test selector only. */
  initialModel: string;
}) {
  const promptId = useId();
  const modelId = useId();
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  // INDEPENDENT from the saved default: picking here never calls setModel.
  const [testModel, setTestModel] = useState(initialModel);
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<ResultEntry[]>([]);

  const canGenerate = prompt.trim().length > 0 && !generating;

  async function generate() {
    if (!canGenerate) {
      return;
    }
    setGenerating(true);
    try {
      const result = await generateTestImageFn({
        data: { prompt, imageModel: testModel },
      });
      // Prepend so the newest sits on top; prior outputs stay for comparison.
      setResults((prev) => [{ ...result, key: Date.now() }, ...prev]);
    } catch (err) {
      console.error("[stories] test image request failed:", err);
      setResults((prev) => [
        {
          imagePath: null,
          imageStatus: "failed",
          model: testModel,
          ms: 0,
          key: Date.now(),
        },
        ...prev,
      ]);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <section className="space-y-5 border-t pt-8">
      <div className="space-y-2">
        <h2 className="font-bold text-2xl">Tester un prompt</h2>
        <p className="text-muted-foreground">
          Génère une image d'essai pour comparer les modèles. Chaque essai
          s'ajoute à la liste — tu peux les regarder côte à côte.
        </p>
      </div>

      <div className="space-y-2">
        <label className="font-medium text-sm" htmlFor={promptId}>
          Prompt
        </label>
        <textarea
          className="min-h-32 w-full rounded-2xl border bg-card p-4 text-base leading-relaxed"
          id={promptId}
          onChange={(e) => setPrompt(e.target.value)}
          value={prompt}
        />
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <label className="font-medium text-sm" htmlFor={modelId}>
            Modèle
          </label>
          <select
            className="block rounded-2xl border bg-card p-3 text-base"
            id={modelId}
            onChange={(e) => setTestModel(e.target.value)}
            value={testModel}
          >
            {IMAGE_MODELS.map((option) => (
              <option key={option.id} value={option.id}>
                {`${option.label} — ${option.id}`}
              </option>
            ))}
          </select>
        </div>

        <Button
          className="h-12 rounded-2xl px-6 text-lg"
          disabled={!canGenerate}
          onClick={generate}
          type="button"
        >
          {generating ? "Je dessine…" : "Générer"}
        </Button>
      </div>

      {results.length > 0 ? (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {results.map((entry) => (
            <ResultCard entry={entry} key={entry.key} />
          ))}
        </ul>
      ) : null}
    </section>
  );
}
