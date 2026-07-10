# CLAUDE.md — look-i-can-read

Single-family web app that generates calm illustrated read-aloud stories in
French where the configured child hero stars. TanStack Start + React 19.
Deploys to Vercel and runs locally; either way REQUIRES network + a Turso
cloud database (no offline mode). No authentication — protect public deploys
yourself.

## THE NON-NEGOTIABLE CONSTRAINT

This is a CALM TOOL for a young child, NOT a game. NEVER add: score, note,
timer, "bravo/gagné/perdu", gamification, unlock, reward, streak,
notification, progress bar, %, quiz, evaluation, or any sense of
stakes/performance. This overrides every generic "good app" instinct. The
design test for any feature: "does it add stakes, pressure, or dependence?" If
yes → don't.

## Commands

- `bun run dev` — dev server on port 3009
- `bun run build` / `bun run start` — clean local run (start uses PORT=3009)
- `bun run check-types` — tsc
- `bun run lint` / `bun run lint:fix` — Biome
- `bun run test` — golden assertion scripts (plain bun, no vitest):
  `test:golden` pins prompt identity; `test:coherence` pins the safety/structure
  validators, the anti-"doux" repetition guard, the landing decrescendo and the
  prompt builders; `test:media` pins the media-store path rules;
  `test:reading-aids` pins the silent-letter/liaison annotator.
- `bun run db:migrate` — apply migrations to the remote Turso db (run once on
  setup / after schema changes). `db:generate` creates a new migration from
  schema edits; `db:push` is also available for quick dev sync to remote.

## Architecture

- **Framework**: TanStack Start (file routes in `src/app/`; index + aventure +
  bibliotheque + parents section).
- **Nitro**: `vercel` preset → builds to `.vercel/output` (Build Output API),
  cloud-deployable on Vercel. `vercel.json` declares
  `framework: "tanstack-start"` + `outputDirectory: null` (without it Vercel
  defaults to the Vite preset and fails: "No Output Directory named dist").
- **DB**: remote Turso cloud (libSQL) via `@libsql/client/node` + Drizzle.
  `db/index.ts` is just `createClient({ url: DATABASE_URL, authToken:
  TURSO_AUTH_TOKEN })`. Schema is applied to the remote db via drizzle
  migrations — run `bun run db:migrate` on setup. Persisted tables
  (`src/server/db/schema.ts`): `stories`, `story_segments`, `places`,
  `doudous`, `heroes`, `elements`. The `src/config/*.ts` files seed/back those
  entity tables (editable via in-app CRUD at /parents). Coherence columns
  (nullable, older rows fall back to prior behavior): `stories.story_arc`
  (hidden "fil rouge" frozen at creation), `stories.visual_world` (story-level
  illustration ambiance — time of day, season, weather, light — generated in
  the SAME call as the arc) and `story_segments.scene_hint` (per-beat scene
  description for the illustrator).
- **Branding**: `src/config/app.ts` (display name, booklet footer/fallback
  title). Sample heroes in `src/config/characters.ts` — meant to be replaced
  by each family.
- **LLM**: Vercel AI SDK (`ai` + `@ai-sdk/anthropic`), `generateObject` + Zod
  `{title, paragraphs[]}`. Model from `STORY_MODEL`.
- **Adapters** in `src/server/providers/{text,image,tts}/` behind `types.ts`:
  - text: `anthropic` (required) — strict gentle story prompt; Zod shape PLUS
    content guard-rail (`validateStoryContent`: 5–8 sentences, hero named, no
    final question/injunction, forbidden scary/sad-term scan) → 1 corrective
    retry (errors fed back into the prompt) → typed soft-failure → "On réessaie ?".
  - text (dynamic beats): `dynamic.ts` — choose-your-own-adventure beats. A
    hidden story arc ("fil rouge": goal → milestones → ending image) PLUS the
    story's visual world (one-sentence illustration ambiance) are generated in
    ONE call at creation (15s bound, best-effort — null never blocks the
    first page); the arc is injected into EVERY beat prompt so the story
    advances along one thread and the surprise element pays off. Each beat also
    emits a `sceneHint` (where the action happens NOW) that the image prompt
    prefers over the frozen place hint; prior beats' sceneHints are rendered
    into the history block + a CONTINUITÉ system clause, so the new scene keeps
    the same time/light/setting unless the story explicitly moved.
    Structure guard adds an anti-"doux" repetition retry (>1
    "doux/douce/doucement" per beat → non-fatal corrective rewrite), and the
    last 2 beats get a `remainingChoices` countdown so the ending is prepared
    instead of hitting the mustEnd wall. The same countdown drives the landing
    DECRESCENDO (`isLanding`): the beats carrying the last 2 choices + the
    final beat are asked shorter (2 phrases, schema `paragraphs.max(2)`,
    non-fatal 4+-sentence nudge) — the story winds down because a beginning
    reader tires by the end; the opening beats keep their 2–3-sentence richness.
  - image: `nanobanana.ts` = Gemini image models, behind `IMAGE_ENABLED`.
    Consistency: beats after the first pass the story's EARLIEST illustration
    as an image input (reference) so characters/style stay stable page to page,
    and the prompt carries the story's frozen `visual_world` as the DEFAULT
    ambiance (the beat's own sceneHint keeps priority on location) so pages
    stop drifting from day to night.
    The reference is fetched server-side (10s bound); https refs are
    allowlisted to THIS app's own Blob store host when the rw token is set
    (else to `*.public.blob.vercel-storage.com` — SSRF defense-in-depth) and
    local refs must stay inside the media dir. Any failure degrades to plain
    text-to-image — never fails the beat's image. Gemini call aborts at 90s.
  - tts: `edge` (msedge-tts, default) / `elevenlabs`, behind `TTS_ENABLED`.
- **Secrets**: read only in `src/env.ts` (server). Vite exposes only `VITE_*`;
  all keys/LLM calls live in server functions (`src/server/functions.ts`).
- **Generated media** (`src/server/providers/media-store.ts`, single
  choke-point): dual backend gated on env. Cloud (Vercel) when
  `BLOB_READ_WRITE_TOKEN` is set → uploads to Vercel Blob, returns a public
  `https://` CDN URL. Local fallback when absent → writes `DATA_DIR/media/`
  (gitignored), returns a `/data/media/<file>` web path served by the `/data/$`
  route. The `/`-prefix (local) vs `https://` (blob) IS the back-compat
  boundary; old local rows keep working. Read-back (for the reference-image
  flow): `readStoredMediaBytes` returns local media bytes and rejects any path
  escaping the media dir; `blobStoreHost()` derives the exact allowlist host
  from the rw token.
- **Reading aids** (`src/lib/reading-aids/`): pure French-phonics annotator
  (silent letters + mandatory liaisons, CP-book style), golden-tested;
  decorative CSS only (`.story-silent`, `.story-liaison-*`) — copied text stays
  byte-identical.

## Print

`PrintableStory` + `@media print` A5 in `globals.css`. `window.print()` from the
story screen. No url/header/technical noise; the discreet footer comes from
`appConfig.storyLabel`.
