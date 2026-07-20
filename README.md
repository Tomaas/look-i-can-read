# Look, I Can Read! 📖

A tiny web app that invents calm, illustrated, read-aloud mini-stories in
**French** where **your child is the hero**. Built as a quiet parent-and-child
reading tool for beginning readers (fin CP / début CE1, ~6–7 years old) — not
a game. No score, no timer, no rewards.

Since v0.2 the home page is a small two-door shelf: the stories, plus a quiet
**"Poser des calculs"** workshop — column arithmetic the same calm way, with
the level always chosen by the parent, never by an algorithm.

The printed A5 booklet that comes out of the printer is often the real magic
moment.

> The app UI and the generated stories are in **French** — the reading aids
> (silent letters, liaisons) are specific to French phonics. Docs are in
> English so anyone can set it up.

## Features

- **Choose-your-own-adventure stories**: the child picks a hero, a place, a
  surprise element (and optionally a comfort toy — a "doudou"), then steers the
  story beat by beat. A hidden story arc keeps the whole thing coherent, and
  the story gently winds down at the end.
- **Calm by design**: soft theme, slow animations, no stakes, no pressure. A
  strict content guard-rail keeps every beat gentle (no scary or sad terms,
  hero always named, no cliffhanger questions).
- **Reading aids** for French beginning readers: faded silent letters
  ("lettres muettes") and liaison arcs, CP-textbook style — toggleable.
- **Optional cursive mode** using a French school cursive font (see
  `public/fonts/README.md` — the font is not bundled for license reasons).
- **Illustrations** (optional): consistent characters page-to-page via
  reference images, powered by Gemini image models.
- **Read-aloud** (optional): free Edge TTS French voices, or ElevenLabs.
- **Print**: one click → a clean A5 booklet, no headers, no tech noise.
- **Library**: every kept story is saved and re-readable.
- **"Poser des calculs" workshop** (`/calcul`): the child first takes a tray
  from a small shelf — one tray per operation family the parent has prepared
  (additions, subtractions, multiplications), each with its own little fixed
  scene, never a level number. Then a short series of column operations the
  child writes freely on a soft numpad (tap a key, or drag the digit straight
  onto a cell), then compares with the solved version — nothing is
  marked, nothing is scored. Word problems can feature the family's hero and
  doudou ("Arsène range 24 marrons…") — template-based, no AI call, works
  even offline once the page is open.
- **Parent-chosen level**: at `/parents/calcul` the adult decides which
  operation families are on the shelf and picks each family's own palier
  (7 steps in all, from carry-free additions to column multiplications),
  plus the series size — the app never evaluates the child and never
  auto-advances.
- **Printable operation sheets**: A5 sheets of posed operations to complete
  in pencil, in the same format as the story booklets — one sheet per
  operation family, matching that family's palier.

## Make it yours

Two files to personalize (plus in-app management at `/parents`):

- `src/config/app.ts` — the app's display name and booklet footer. Prefer
  setting `VITE_CHILD_NAME=Léa` (see `.env.example`) to derive both without
  touching the code; `VITE_APP_NAME` / `VITE_APP_DESCRIPTION` /
  `VITE_STORY_LABEL` override the full strings.
- `src/config/characters.ts` — the heroes: replace the sample kids with your
  child, siblings, friends. The default hero is pre-selected in the wizard.
  Places, surprise elements and doudous have the same kind of config files
  (`src/config/*.ts`) and can also be edited in the app at `/parents`.

## Getting started

Requirements: [Bun](https://bun.sh), an [Anthropic API
key](https://console.anthropic.com/), and a free [Turso](https://turso.tech)
database (the app is cloud-DB only; network required, no offline mode).

### 1. Create the Turso database (once)

With the Turso CLI (`brew install tursodatabase/tap/turso`, then
`turso auth login`):

```
turso db create my-stories          # create the db
turso db show --url my-stories      # print the URL  (libsql://…turso.io)
turso db tokens create my-stories   # create an access token
```

### 2. Fill `.env.local`

Copy `.env.example` to `.env.local` and paste the values:

```
ANTHROPIC_API_KEY=your-anthropic-key
DATABASE_URL=libsql://<your-db>.turso.io
TURSO_AUTH_TOKEN=your-turso-token
```

Images and voice are **disabled** by default — the app works great text-only
(only the 3 values above are required).

### 3. Install + prepare the database

```
bun install
bun run db:migrate   # creates the tables in Turso
```

### 4. Run

```
bun run dev
```

Then open **http://localhost:3009**.

For a "clean" run (no dev console):

```
bun run build
bun run start
```

## Settings (`.env.local`)

| Setting | What it does |
| --- | --- |
| `ANTHROPIC_API_KEY` | **Required.** The key that writes the stories. |
| `DATABASE_URL` | **Required.** The Turso URL (`libsql://…turso.io`). |
| `TURSO_AUTH_TOKEN` | **Required.** The Turso access token. |
| `STORY_MODEL` | The model used (fine as-is). |
| `IMAGE_ENABLED` | `true` to add illustrations (otherwise a soft color block). |
| `GEMINI_API_KEY` | The Google key, needed IF images are enabled. |
| `TTS_ENABLED` | `true` to show the "Listen" button. |
| `TTS_PROVIDER` | `edge` (free, French voices) or `elevenlabs` (premium). |
| `ELEVENLABS_API_KEY` | The key, needed IF you pick `elevenlabs`. |

Restart `bun run dev` after changing a setting.

## Deploying (Docker)

The repo ships a `Dockerfile` (multi-stage: Bun build → `node:22-slim`
runtime) and a `compose.yml`. On the deploy machine:

1. Create `.env.production` at the repo root with the runtime settings
   (same names as the table above: `ANTHROPIC_API_KEY`, `DATABASE_URL`,
   `TURSO_AUTH_TOKEN`, plus any optional image/TTS settings).
2. The `VITE_*` branding vars are baked in at **build time** — put them in a
   root `.env` file (Docker Compose reads it for `${...}` substitution) or
   pass them as build args.
3. Run the migrations once from the checkout (`bun run db:migrate`), then:

```
bun run deploy   # = docker compose up -d --build
```

The app listens on **127.0.0.1:3009** (loopback only, on purpose) and
generated images/audio persist in the `app-data` volume. To customize the
setup for your machine, drop a `compose.override.yml` next to `compose.yml`
(gitignored) — Compose merges it automatically.

Production notes:

- **There is no authentication.** Anyone who can reach the port can generate
  stories, and each story costs real API money. Exposing the app beyond
  localhost (reverse proxy, VPN, LAN) is your deliberate choice — keep it
  private.
- Build from a working tree that contains `public/fonts/cursive.woff` if you
  use the cursive mode — the font is gitignored (license) and won't be in a
  fresh clone.
- On ephemeral filesystems (no volume), set `BLOB_READ_WRITE_TOKEN`
  (Vercel Blob) instead so generated media persists.

## How it works for the child

The home page offers two doors: the story, and the operations workshop.
For a story:

1. **Invent a story** → pick hero(es), a place, a surprise element (or hit
   "random 🎲").
2. The story writes itself (gentle animation, no progress bar).
3. Each beat ends with two big choices — the child steers the adventure.
4. At the end: **listen**, **print** (A5 booklet), or **invent another one**.
5. Every kept story lives in **My library**.

> **Printing a real booklet:** the "Print" button opens the print dialog. On
> macOS, pick "Save as PDF" (or your printer's booklet option) — the A5 layout
> is ready; the print dialog handles booklet pagination.

The **operations workshop** works the same quiet way: the child takes a tray
from a small shelf (one per operation family the parent has prepared), a
short series of posed operations begins; the child writes the digits,
compares with the solved version when ready, and the tray goes back on the
shelf at the end of the series. A series left mid-way resumes exactly where
it was — each tray remembers its own (kept on the device).

## Technical notes

- **Stack**: TanStack Start (React 19, file-based routes), Tailwind CSS v4,
  Drizzle ORM on Turso (libSQL), Vercel AI SDK (`generateObject` + Zod) with
  Anthropic for text, Gemini for images, Edge/ElevenLabs for TTS.
- **All keys and model calls live in server functions** — nothing sensitive
  ever reaches the browser.
- **Generated media** goes to local disk under `data/` (gitignored, a volume
  in Docker), served by a dedicated route — or to Vercel Blob when
  `BLOB_READ_WRITE_TOKEN` is set (for ephemeral filesystems).
- **Story safety**: a per-beat Zod schema plus validators — safety (hero
  named, narration never ends on a question, forbidden scary/sad and
  stakes-language scan) is fatal, structure (length/readability) is not —
  with up to 3 corrective retries, then a safe-text salvage; a soft "shall we
  try again?" failure otherwise.
- **The operations module** (`src/lib/operations`) is pure and deterministic:
  a seeded generator (an interrupted series regenerates identically), shared
  screen/print geometry, a descriptive palier ladder, and template word
  problems — no LLM involved. The parent's choices live in the
  `math_skills` table — one row per activated operation family, carrying
  that family's palier (and mirrored on-device so the workshop shrugs off a
  network hiccup).
- **Tests**: `bun run test` runs golden assertion scripts (prompt identity,
  coherence validators, media store, media data route, reading aids, posed
  operations) — plain Bun, no test runner needed.

## License

[MIT](LICENSE). The optional cursive font is **not** included (personal /
educational license) — see `public/fonts/README.md`.
