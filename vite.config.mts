import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// Only VITE_ vars reach the client. API keys live under un-prefixed names so
// they stay server-only — never exposed to the browser.
export default defineConfig(({ mode }) => {
  // Machine-specific dev hostnames (reverse proxy / tunnel) stay out of the
  // public repo: set DEV_ALLOWED_HOSTS in the gitignored .env,
  // comma-separated, e.g. DEV_ALLOWED_HOSTS=app.my-domain.example
  const allowedHosts = (
    loadEnv(mode, process.cwd(), "").DEV_ALLOWED_HOSTS ?? ""
  )
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean);

  return {
    envPrefix: ["VITE_"],
    // Dedupe React so the SSR/lambda bundle resolves a single copy. A duplicated
    // react/react-dom is a classic prod-only SSR throw.
    resolve: {
      dedupe: ["react", "react-dom"],
    },
    server: {
      port: 3009,
      ...(allowedHosts.length > 0 ? { allowedHosts } : {}),
    },
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
      // Self-hosted deploy: the `node-server` preset emits a standalone
      // `.output/server/index.mjs` (what `bun run start` runs, also the Docker
      // image entrypoint). Generated media persists under DATA_DIR (volume in
      // Docker); on ephemeral filesystems set BLOB_READ_WRITE_TOKEN instead
      // (see media-store.ts).
      nitro({ preset: "node-server" }),
      viteReact(),
    ],
  };
});
