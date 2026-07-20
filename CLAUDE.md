# CLAUDE.md — look-i-can-read

Single-family web app, a two-door shelf: calm illustrated read-aloud stories
in French where the configured child hero stars, plus a "Poser des calculs"
mini-app (posed column arithmetic, no LLM). TanStack Start + React 19.
Deploys via Docker (Compose) and runs locally; either way REQUIRES network +
a Turso cloud database (no offline mode). No authentication — the compose
file binds to loopback only; exposing it further is the operator's problem.

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
  `test:reading-aids` pins the silent-letter/liaison annotator;
  `test:operations` pins the posed-operations module (seeded generator,
  layout geometry, palier ladder, énoncé templates, calm-wording scan).
- `bun run db:migrate` — apply migrations to the remote Turso db (run once on
  setup / after schema changes). `db:generate` creates a new migration from
  schema edits; `db:push` is also available for quick dev sync to remote —
  but it syncs SCHEMA only and never runs DATA migrations (e.g. 0010): any
  release whose migration rewrites rows must go through `db:migrate`.
- `bun run deploy` — `docker compose up -d --build` (see Nitro bullet; needs
  `.env.production` + optionally `.env` for build-time `VITE_*` args).
- Releases: 4-digit `VERSION` + `CHANGELOG.md` (French, Keep-a-Changelog
  style); deferred work lives in `TODOS.md`.

## Architecture

- **Framework**: TanStack Start (file routes in `src/app/`; index (two-door
  shelf) + aventure + calcul + bibliotheque + parents section, incl.
  /parents/calcul).
- **Nitro**: `node-server` preset → builds a standalone `.output/server/
  index.mjs` (traced deps included, native libsql binding too) that `bun run
  start` and the Docker image both run. Deploy = `Dockerfile` (multi-stage:
  `node:22-slim` build stage with the bun binary copied in from `oven/bun` —
  bun only installs deps and runs scripts; vite/rolldown MUST run under real
  node, because under bun `ws` resolves as a builtin and the bundle ships a
  bare `import "ws"` that crashes the node runtime — `SKIP_ENV_VALIDATION=1`
  + `VITE_*` build args → `node:22-slim` runtime, port 3009) + `compose.yml` (loopback-bound port,
  `app-data` volume on `/app/data`, secrets via `env_file: .env.production`).
  Machine-specific compose changes go in a gitignored `compose.override.yml`,
  never in `compose.yml`.
- **DB**: remote Turso cloud (libSQL) via `@libsql/client/node` + Drizzle.
  `db/index.ts` is just `createClient({ url: DATABASE_URL, authToken:
  TURSO_AUTH_TOKEN })`. Schema is applied to the remote db via drizzle
  migrations — run `bun run db:migrate` on setup. Persisted tables
  (`src/server/db/schema.ts`): `stories`, `story_segments`, `places`,
  `doudous`, `heroes`, `elements`, plus `math_skills` (migration 0009 ; the
  DATA migration 0010, guarded/idempotent, rekeyed it) — one row per
  ACTIVATED operation family (`calcul-pose:<famille>`, presence = activated),
  each carrying that family's parent-chosen palier + the global série size
  (copied on every row, read in canonical family order — settingsFromRows).
  The `src/config/*.ts` files seed/back those
  entity tables (editable via in-app CRUD at /parents). Coherence columns
  (nullable, older rows fall back to prior behavior): `stories.story_arc`
  (hidden "fil rouge" frozen at creation), `stories.visual_world` (story-level
  illustration ambiance — time of day, season, weather, light — generated in
  the SAME call as the arc) and `story_segments.scene_hint` (per-beat scene
  description for the illustrator).
- **Branding**: `src/config/app.ts` (display name, booklet footer/fallback
  title) — set `VITE_CHILD_NAME` (build-time Vite var) to derive both
  ("L'atelier de Léa" / "Une histoire de Léa", with French d'-elision);
  `VITE_APP_NAME`, `VITE_APP_DESCRIPTION`, `VITE_STORY_LABEL` override the
  full strings. Sample
  heroes in `src/config/characters.ts` — meant to be replaced by each family
  (they only seed empty tables; an already-populated db wins).
- **LLM**: Vercel AI SDK (`ai` + `@ai-sdk/anthropic`), `generateObject` + the
  Zod beat schema (see text adapter). Model from `STORY_MODEL`.
- **Adapters** in `src/server/providers/{text,image,tts}/` behind `types.ts`:
  - text: `dynamic.ts` (`anthropicDynamicProvider`, the SOLE text provider;
    required) — choose-your-own-adventure beats. Per-beat Zod schema (`title`
    meaningful on the opening beat only, 1–3 short paragraphs — capped at 2 on
    landing beats, exactly 2 choice labels or null on the final beat,
    `sceneHint`) PLUS content guard-rail: `safetyProblems` (fatal — hero
    named, narration never ends on a question, `forbidden-terms.ts`
    scary/sad-term + stakes/evaluation-language scan, `sceneHint` included
    since it drives the illustration) and
    `structureProblems` (non-fatal — length/readability) → up to 3 corrective
    attempts with problems fed back into the prompt (only a SAFETY failure
    drops the child's saveur on the next attempt) → if the text is safe but
    structure still off, `coerceBeat` salvages a valid beat → else typed
    soft-failure → "On réessaie ?".
  - text coherence (same file): a hidden
    story arc ("fil rouge": goal → milestones → ending image) PLUS the
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
  all keys/LLM calls live in server functions (`src/server/*-functions.ts`,
  story generation in `dynamic-functions.ts`).
- **Generated media** (`src/server/providers/media-store.ts`, single
  choke-point): dual backend gated on env. Local (default, Docker volume) when
  `BLOB_READ_WRITE_TOKEN` is absent → writes `DATA_DIR/media/` (gitignored),
  returns a `/data/media/<file>` web path served by the `/data/$` route.
  Vercel Blob when the token is set (ephemeral filesystems) → uploads and
  returns a public `https://` CDN URL. The `/`-prefix (local) vs `https://`
  (blob) IS the back-compat boundary; old rows of either kind keep working. Read-back (for the reference-image
  flow): `readStoredMediaBytes` returns local media bytes and rejects any path
  escaping the media dir; `blobStoreHost()` derives the exact allowlist host
  from the rw token.
- **Reading aids** (`src/lib/reading-aids/`): pure French-phonics annotator
  (silent letters + mandatory liaisons, CP-book style), golden-tested;
  decorative CSS only (`.story-silent`, `.story-liaison-*`) — copied text stays
  byte-identical.
- **Operations mini-app** (`src/lib/operations/`, pure module, golden-tested
  via `test:operations`): seeded deterministic generator (mulberry32 — an
  interrupted série regenerates IDENTICALLY from (palier, seed)), shared
  screen/print layout geometry, template énoncés (hero/doudou word problems,
  NO LLM call), and the palier ladder (`progression.ts`, 7 paliers grouped in
  3 canonical families — addition/soustraction/multiplication) which is
  purely DESCRIPTIVE: the parent prepares the SHELF at /parents/calcul (one
  card per family: activated + that family's palier; the last active family
  cannot be deactivated) — NO automatic progression, no comfort score, no
  evaluation of the child (the calm constraint applies in full). `/calcul`
  opens on the TRAY SHELF (`src/components/calcul/tray-shelf.tsx`): one tray
  per activated family — fixed scene (frozen object counts, no numbers,
  in-palette SVGs), sign medallion, phrase — the child picks a tray, never
  sees a level; a non-activated family does NOT exist on screen (no greyed
  tray). Then the "série qui se range" runs unchanged: free writing on a soft
  numpad — tap into the selected cell or drag the digit tile straight onto a
  grid cell (`@dnd-kit/core`: draggable keys, droppable cells, DragOverlay
  ghost, forgiving drop for small fingers; everything inks like pencil, never
  red), self-comparison with the solved operation. The série resumes PER
  FAMILY (localStorage key per family, shape-guarded; the "sorti" tray state
  uses the full resumable predicate, never key-existence; a one-time bridge
  migrates the pre-shelf `calcul:serie` key; storage failure degrades
  silently — the child never sees an error). Back arrow is two-level:
  série → "Reposer le plateau" (shelf) → "Retour à l'accueil"; the end of a
  série is a 🌿 transition back to the shelf, never a destination. Server
  functions in `src/server/math-functions.ts` read/write `math_skills` (one
  atomic `db.batch` save; zod cross-checks palier↔family); dirty ids are
  repaired (`resolvePalierForFamille`, `settingsFromRows`) and série size
  always clamped — a hand-edited row or cache never errors. A5 sheets per
  family via `PrintableOperationsSheet`
  (`src/components/printable-operations.tsx`).

## Print

`PrintableStory` + `@media print` A5 in `globals.css`. `window.print()` from the
story screen. No url/header/technical noise; the discreet footer comes from
`appConfig.storyLabel`. `PrintableOperationsSheet` reuses the same A5 print
setup for the posed-operation sheets (triggered from /parents/calcul).

## Deploy Configuration (configured by /setup-deploy)
- Platform: self-hosted Docker Compose (this machine)
- Production URL: http://localhost:3009 (loopback; remote family access via a
  private gitignored overlay — see compose.override.yml, never committed)
- Deploy workflow: none (no CI) — deploy is manual via `bun run deploy`
- Deploy status command: `docker compose ps --format '{{.Name}} {{.Status}}'`
- Merge method: merge commit (matches PR #1-#6 history)
- Project type: web app (SSR, TanStack Start)
- Post-deploy health check: `curl -sf http://localhost:3009/` (expect 200 +
  page content; run `bun run db:migrate` first if the release adds migrations)

### Custom deploy hooks
- Pre-merge: `bun run check-types && bun run lint && bun run test`
- Deploy trigger: `bun run deploy` (docker compose up -d --build; brief
  downtime while the app container restarts)
- Deploy status: `docker compose ps` (app + sidecar "Up")
- Health check: poll http://localhost:3009/ until 200 (build takes ~2-4 min)

## gstack (REQUIRED — global install)

**Before doing ANY work, verify gstack is installed:**

```bash
test -d ~/.claude/skills/gstack/bin && echo "GSTACK_OK" || echo "GSTACK_MISSING"
```

If GSTACK_MISSING: STOP. Do not proceed. Tell the user:

> gstack is required for all AI-assisted work in this repo.
> Install it:
> ```bash
> git clone --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
> cd ~/.claude/skills/gstack && ./setup --team
> ```
> Then restart your AI coding tool.

Do not skip skills, ignore gstack errors, or work around missing gstack.

Using gstack skills: After install, skills like /qa, /ship, /review, /investigate,
and /browse are available. Use /browse for all web browsing.
Use ~/.claude/skills/gstack/... for gstack file paths (the global path).

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
- Author a backlog-ready spec/issue → invoke /spec
