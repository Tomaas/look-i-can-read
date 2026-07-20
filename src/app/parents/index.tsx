import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Home } from "lucide-react";
import { Button } from "~/components/ui/button";

export const Route = createFileRoute("/parents/")({
  component: ParentsIndexPage,
});

// The parent-facing sub-pages. URL-only section (not linked from the child
// flow); this index is the one landing that gathers them. Each card mirrors the
// emoji + one-line description style of the lists inside each sub-page.
const SECTIONS = [
  {
    description:
      "Les personnages proposés à l'enfant. Ajoute, modifie ou retire un héros.",
    emoji: "🧒",
    title: "Les héros",
    to: "/parents/heroes",
  },
  {
    description: "Les endroits où l'histoire peut se passer.",
    emoji: "📍",
    title: "Les lieux",
    to: "/parents/lieux",
  },
  {
    description: "Les éléments surprise qui pimentent l'histoire.",
    emoji: "✨",
    title: "Les éléments",
    to: "/parents/elements",
  },
  {
    description: "Les compagnons rassurants, toujours facultatifs.",
    emoji: "🧸",
    title: "Les doudous",
    to: "/parents/doudous",
  },
  {
    description:
      "Le palier des opérations posées, la taille des séries et les fiches à imprimer.",
    emoji: "🔢",
    title: "Les calculs",
    to: "/parents/calcul",
  },
  {
    description:
      "Choisis le modèle Google qui dessine les illustrations (qualité / prix / vitesse).",
    emoji: "🎨",
    title: "Le modèle d'image",
    to: "/parents/image-model",
  },
] as const;

/**
 * Parent-only landing (URL-only, NOT linked from the child flow) that gathers
 * the four management sub-pages. Calm, utilitarian, same soft/rounded look as
 * the rest of the app — one card per section with its emoji + a one-line hint.
 */
function ParentsIndexPage() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <div>
        <Button
          className="gap-2 text-lg text-muted-foreground"
          nativeButton={false}
          render={<Link to="/" />}
          variant="ghost"
        >
          <Home className="size-5" />
          Accueil
        </Button>
      </div>

      <div className="space-y-2">
        <h1 className="font-bold text-3xl">Espace parent</h1>
        <p className="text-muted-foreground">
          Gère ce que l'enfant peut choisir : héros, lieux, éléments et doudous.
          Les histoires déjà créées ne changent jamais.
        </p>
      </div>

      <ul className="space-y-3">
        {SECTIONS.map((section) => (
          <li key={section.to}>
            <Link
              className="flex items-center gap-4 rounded-2xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/50"
              to={section.to}
            >
              <span aria-hidden="true" className="text-4xl leading-none">
                {section.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-xl">{section.title}</p>
                <p className="text-muted-foreground text-sm">
                  {section.description}
                </p>
              </div>
              <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
