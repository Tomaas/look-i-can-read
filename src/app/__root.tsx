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
  component: RootComponent,
  errorComponent: () => (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
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
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
      <p className="text-4xl">🐚</p>
      <h1 className="font-bold text-3xl">Cette page n'existe pas</h1>
      <a className="text-2xl text-primary underline" href="/">
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
