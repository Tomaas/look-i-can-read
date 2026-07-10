# Look, I Can Read! 📖

A tiny web app that invents calm, illustrated, read-aloud mini-stories in
**French** where **your child is the hero**. Built as a quiet parent-and-child
reading tool for beginning readers (fin CP / début CE1, ~6–7 years old) — not
a game. No score, no timer, no rewards.

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

## Make it yours

Two files to personalize (plus in-app management at `/parents`):

- `src/config/app.ts` — the app's display name and booklet footer.
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

## Deploying (Vercel)

The build uses Nitro's `vercel` preset, so the repo deploys to Vercel as-is
(`vercel.json` is included). Two production notes:

- Set `BLOB_READ_WRITE_TOKEN` (Vercel Blob) so generated images/audio persist —
  the serverless filesystem is ephemeral.
- **There is no authentication.** A deployed instance is public, and each
  story costs real API money. Put it behind Vercel's deployment protection, a
  proxy with auth, or keep it on your own network.

## How it works for the child

1. **Invent a story** → pick hero(es), a place, a surprise element (or hit
   "random 🎲").
2. The story writes itself (gentle animation, no progress bar).
3. Each beat ends with two big choices — the child steers the adventure.
4. At the end: **listen**, **print** (A5 booklet), or **invent another one**.
5. Every kept story lives in **My library**.

> **Printing a real booklet:** the "Print" button opens the print dialog. On
> macOS, pick "Save as PDF" (or your printer's booklet option) — the A5 layout
> is ready; the print dialog handles booklet pagination.

## Technical notes

- **Stack**: TanStack Start (React 19, file-based routes), Tailwind CSS v4,
  Drizzle ORM on Turso (libSQL), Vercel AI SDK (`generateObject` + Zod) with
  Anthropic for text, Gemini for images, Edge/ElevenLabs for TTS.
- **All keys and model calls live in server functions** — nothing sensitive
  ever reaches the browser.
- **Generated media** goes to Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set,
  else to local disk under `data/` (gitignored), served by a dedicated route.
- **Story safety**: a Zod schema plus a content validator (sentence count
  bounds, hero named, no final question/injunction, forbidden-term scan) with
  one corrective retry; a soft "shall we try again?" failure otherwise.
- **Tests**: `bun run test` runs golden assertion scripts (prompt identity,
  coherence validators, media store, reading aids) — plain Bun, no test
  runner needed.

## License

[MIT](LICENSE). The optional cursive font is **not** included (personal /
educational license) — see `public/fonts/README.md`.
