import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Toaster } from "~/components/ui/sonner";
import { appConfig } from "~/config/app";
import appCss from "./globals.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      { title: appConfig.name },
      {
        name: "description",
        content: appConfig.description,
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      { rel: "stylesheet", href: appCss },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Quicksand:wght@400..700&display=swap",
      },
    ],
  }),
  component: RootComponent,
  errorComponent: () => (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
      <p className="text-4xl">🌙</p>
      <h1 className="font-bold text-3xl">Oups, un petit souci</h1>
      <p className="text-muted-foreground text-xl">
        On range tout et on recommence dans un instant.
      </p>
      <a className="text-primary text-2xl underline" href="/">
        Revenir à l'accueil
      </a>
    </div>
  ),
  notFoundComponent: () => (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
      <p className="text-4xl">🐚</p>
      <h1 className="font-bold text-3xl">Cette page n'existe pas</h1>
      <a className="text-primary text-2xl underline" href="/">
        Revenir à l'accueil
      </a>
    </div>
  ),
});

export function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

export function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <div className="mx-auto min-h-screen max-w-5xl px-6 py-10">
          {children}
        </div>
        <Toaster />
        <Scripts />
      </body>
    </html>
  );
}
