import { createFileRoute, Link } from "@tanstack/react-router";
import { BookHeart, Grid3x3, Leaf } from "lucide-react";
import { Button } from "~/components/ui/button";
import { appConfig } from "~/config/app";

export const Route = createFileRoute("/")({
  component: HomePage,
});

/**
 * Accueil — l'étagère. Two doors, like two activity trays on a Montessori
 * shelf: stories and posed operations. Deliberately NOT a mini-app registry
 * or a navigation system (eng-review scope decision): two plain links, the
 * abstraction can appear if a third mini-app ever exists. No stats, no
 * "last time", no counters, no cross-app mechanics.
 */
function HomePage() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-12 text-center">
      <div className="space-y-3">
        <p aria-hidden="true" className="text-6xl">
          ✨
        </p>
        <h1 className="font-bold text-4xl leading-tight sm:text-5xl">
          {appConfig.name}
        </h1>
      </div>

      <div className="flex flex-col items-center gap-6 sm:flex-row">
        <Button
          className="h-auto gap-4 rounded-[2rem] px-10 py-8 text-2xl"
          nativeButton={false}
          render={<Link to="/aventure" />}
          size="lg"
        >
          <Leaf className="size-8" />
          Histoire où tu choisis
        </Button>
        <Button
          className="h-auto gap-4 rounded-[2rem] px-10 py-8 text-2xl"
          nativeButton={false}
          render={<Link to="/calcul" />}
          size="lg"
          variant="secondary"
        >
          <Grid3x3 className="size-8" />
          Poser des calculs
        </Button>
      </div>

      <Button
        className="gap-2 text-muted-foreground text-xl"
        nativeButton={false}
        render={<Link to="/bibliotheque" />}
        variant="ghost"
      >
        <BookHeart className="size-5" />
        Ma bibliothèque
      </Button>
    </div>
  );
}
