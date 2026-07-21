import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
  useRouterState,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Toaster } from "~/components/ui/sonner";
import { appConfig } from "~/config/app";
import appCss from "./globals.css?url";

/**
 * Écrans d'erreur/404 AUTO-CONTENUS (eng-review D24-A) : le shell est
 * route-aware (plein-bleed pour la couche bureau) — ces écrans apportent donc
 * leur propre conteneur centré, pour rendre cohérents dans les deux modes
 * (jamais un plein-bleed cassé après un crash dans la fenêtre).
 */
const CALM_SCREEN_CLASS =
  "mx-auto flex min-h-[80vh] w-full max-w-5xl flex-col items-center justify-center gap-6 px-6 py-10 text-center";

export const Route = createRootRoute({
  component: RootComponent,
  errorComponent: () => (
    <div className={CALM_SCREEN_CLASS}>
      <p className="text-4xl">🌙</p>
      <h1 className="font-bold text-3xl">Oups, un petit souci</h1>
      <p className="text-muted-foreground text-xl">
        On range tout et on recommence dans un instant.
      </p>
      <a className="text-2xl text-primary underline" href="/">
        Revenir à l'accueil
      </a>
    </div>
  ),
  head: () => ({
    links: [
      { href: "https://fonts.googleapis.com", rel: "preconnect" },
      {
        crossOrigin: "anonymous",
        href: "https://fonts.gstatic.com",
        rel: "preconnect",
      },
      { href: appCss, rel: "stylesheet" },
      {
        href: "https://fonts.googleapis.com/css2?family=Quicksand:wght@400..700&display=swap",
        rel: "stylesheet",
      },
    ],
    meta: [
      { charSet: "utf-8" },
      {
        content: "width=device-width, initial-scale=1",
        name: "viewport",
      },
      { title: appConfig.name },
      {
        content: appConfig.description,
        name: "description",
      },
    ],
  }),
  notFoundComponent: () => (
    <div className={CALM_SCREEN_CLASS}>
      <p className="text-4xl">🐚</p>
      <h1 className="font-bold text-3xl">Cette page n'existe pas</h1>
      <a className="text-2xl text-primary underline" href="/">
        Revenir à l'accueil
      </a>
    </div>
  ),
});

export function RootComponent() {
  // Shell route-aware (voix extérieure T5) : la couche bureau (portrait,
  // bureau, fenêtre) a besoin du plein-bleed ; /parents — hors de l'OS —
  // garde le conteneur d'origine. Fonctionne au SSR (l'état du router est
  // disponible côté serveur), donc aucun flash de shell.
  const estParents = useRouterState({
    select: (s) => s.location.pathname.startsWith("/parents"),
  });
  return (
    <RootDocument conteneur={estParents}>
      <Outlet />
    </RootDocument>
  );
}

export function RootDocument({
  children,
  conteneur,
}: Readonly<{ children: ReactNode; conteneur: boolean }>) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {conteneur ? (
          <div className="mx-auto min-h-screen max-w-5xl px-6 py-10">
            {children}
          </div>
        ) : (
          children
        )}
        <Toaster />
        <Scripts />
      </body>
    </html>
  );
}
