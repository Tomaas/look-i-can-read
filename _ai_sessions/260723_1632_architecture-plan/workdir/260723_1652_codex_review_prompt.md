# Codex review assignment — READ-ONLY code review

You are codex running in HEADLESS mode: never use stdin, never ask questions,
never use interactive features. Produce your full answer as your final message.

STRICT MODE: READ-ONLY. You must NOT create, modify, delete or move ANY file.
No git commands that mutate state (no add/commit/checkout/stash/reset). You may
run read-only commands: git diff, git log, git show, cat, grep, sed -n, ls.
Do not run the test suite or any build (the caller handles gates).

## Context

Repo: /home/user/Developer/look-i-can-read (you are cd'd there).
Branch under review: refactor/plan-architecture-0723.
Review the FULL diff: `git diff main...HEAD` (6 refactor commits + 1 lint chore).

This is a BEHAVIOR-PRESERVING architecture refactor of a calm French
read-aloud + posed-arithmetic app for one young child. Regressions are the
risk, not features. Before reviewing, read the repo /home/user/Developer/look-i-can-read/CLAUDE.md
FULLY — it states hard contracts (the calm non-negotiable constraint, zod
schema key order = JSON property order sent to the model, media back-compat
boundary, window drag contract, SSR contract of the _bureau layout, etc.).

The branch implements 6 candidates from an architecture plan:
- C1: extraction of the série lifecycle from the /calcul route into a pure
  module src/lib/operations/serie-session.ts behind a SerieStorage port
  (claims a LINE-FOR-LINE port of ~250 lines of glue).
- C2: media-store as the single choke-point: new resolveStoredMediaForModel +
  allowedStoredMediaUrl in src/server/providers/media-store.ts;
  src/server/dynamic-functions.ts resolveReferenceImage simplified;
  src/server/providers/tts/edge.ts changed from writing to disk directly to
  bytes -> saveMedia (claimed bug fix for Blob mode).
- C3: extraction of buildSegmentImagePrompt into
  src/server/providers/image/segment-prompt.ts (claims byte-identical prompts).
- C4: deletion of the DynamicTextProvider / ImageProvider interfaces in
  src/server/providers/types.ts; plain exported functions; new
  getTtsProvider() factory in src/server/providers/tts/index.ts.
- C5: reclampCommitted extraction in src/lib/bureau/clamp.ts used by
  src/components/bureau/fenetre.tsx.
- C6: new prose-contract assertions in src/lib/bureau/__tests__/routes.golden.ts.

## What to scrutinize HARDEST (in priority order)

1. serie-session extraction (src/lib/operations/serie-session.ts vs the OLD
   code in `git show main:src/app/_bureau/calcul/index.tsx`, plus the new
   route src/app/_bureau/calcul/index.tsx). Compare the port line by line:
   - legacy `calcul:serie` bridge: one-time semantics, remove-after-re-read,
     never overwrite an occupied per-family key, quota-failure keeps legacy key;
   - authoritative purge conditions (only on authoritative DB settings;
     deactivated families purged; cache write rules);
   - resume vs purge-on-mismatch (palier change -> purge + fresh);
   - fingerprint round-trip (interrupted série regenerates IDENTICALLY from
     (palier, seed));
   - silent degradation on any storage failure (no exception may escape);
   - the route's remaining wiring: does every call site pass the same values
     as before, at the same lifecycle moments (mount, tray take, cell write,
     série end)? Any ordering change (e.g. purge before/after read) is a bug.
   A mistake here can DELETE a child's in-progress série.
2. media-store choke-point:
   - SSRF/path-escape properties preserved: https allowlist (exact own-store
     host when BLOB_READ_WRITE_TOKEN set, else *.public.blob.vercel-storage.com
     suffix), local read-back rejects escaping the media dir;
   - BOTH legacy row shapes still resolve: `/data/media/...` local paths and
     `https://` Blob URLs;
   - edge TTS end-to-end: mp3 format preserved, correct bytes collection
     (stream end semantics), saveMedia returns web path (local) or https URL
     (Blob), zero-byte handling, error propagation vs old behavior;
   - 10s fetch bound still applied; error/undefined semantics at the single
     caller (best-effort: image reference failure must NEVER fail the beat).
3. buildSegmentImagePrompt extraction (segment-prompt.ts vs the old inline
   code in `git show main:src/server/providers/image/nanobanana.ts` or
   dynamic-functions.ts — find where it lived on main). Hunt for ANY input
   combination where the assembled prompt string differs: null/undefined
   sceneHint, missing visual_world, first beat vs later beats, hero
   description present/absent, place hint fallback ordering, whitespace/
   newline joins. The lane proved only 4 fixtures byte-identical — look for
   UNCOVERED branches.
4. types.ts interface deletion + getTtsProvider(): any call site that lost
   type safety (e.g. return types now inferred more loosely, argument types
   widened), env switching (TTS_PROVIDER / TTS_ENABLED) semantics unchanged.
5. fenetre.tsx reclampCommitted: drag-in-flight ref guard semantics unchanged;
   dragEnd (commits NEW position via clampFenetrePosition) vs resize/cancel
   (re-clamp) paths; confirm no persistent transform was introduced (would
   offset /calcul's DragOverlay); reopen-centered (position starts null).
6. routes.golden.ts new assertions: are they non-vacuous? Would they actually
   fail on a violation (e.g. ssr: false added, gate token added to __root)?
   Check the regexes and the comment-stripping.

Also sweep for:
- ANY calm-constraint violation in NEW strings (score, note, timer, bravo,
  gagné/perdu, reward, streak, progress, %, evaluation, pressure wording —
  French or English).
- Zod schema key-order changes anywhere in the diff (key order IS the JSON
  property order sent to the model).
- Anything contradicting the CLAUDE.md contracts (ssr:true inheritance,
  loopback/compose, print rules, localStorage shape guards).
- Dead code left behind, broken imports, circular imports, server-only env
  reads leaking into src/lib (must stay plain-bun runnable).

## Output format (your final message)

For EACH finding:
- Severity: CRITICAL / MAJOR / MINOR / NIT
- file:line (new-file line numbers)
- What the old behavior was vs what the new code does (cite both sides)
- Why it matters / concrete repro scenario
- Suggested fix (one or two sentences)

Then a short overall assessment. Be precise and evidence-based: cite exact
code, do not speculate. If you verified an area and found NOTHING, say so
explicitly per area (1-6) — a clean bill per area is valuable output.
