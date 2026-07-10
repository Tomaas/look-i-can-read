import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// Only VITE_ vars reach the client. API keys live under un-prefixed names so
// they stay server-only — never exposed to the browser.
export default defineConfig({
  envPrefix: ["VITE_"],
  // Dedupe React so the SSR/lambda bundle resolves a single copy. A duplicated
  // react/react-dom is a classic prod-only SSR throw.
  resolve: {
    dedupe: ["react", "react-dom"],
  },
  server: { port: 3009 },
  plugins: [
    tailwindcss(),
    tsconfigPaths(),
    tanstackStart({
      srcDirectory: "src",
      router: {
        routesDirectory: "app",
        routeFileIgnorePattern: "^(client|ssr)\\.tsx$",
      },
    }),
    // Vercel deploy: the `vercel` preset emits a Vercel-compatible build
    // output. Generated images are persisted to Vercel Blob (see media-store.ts)
    // since Vercel's filesystem is ephemeral. Local dev still works (Vite dev
    // server + local-disk media fallback when BLOB_READ_WRITE_TOKEN is unset).
    nitro({ preset: "vercel" }),
    viteReact(),
  ],
});
