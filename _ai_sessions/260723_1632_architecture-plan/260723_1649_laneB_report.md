# Lane B report — candidates 4 → 2 → 3 (providers / dynamic-functions)

## Exec summary

All three candidates implemented, gated and committed on
`refactor/plan-architecture-0723`. **One real bug fixed (candidate 2): edge
TTS — the DEFAULT provider — wrote audio straight to local disk and
hand-built the `/data/media/` path, bypassing `saveMedia`; in Blob mode
(ephemeral filesystem, `/data/$` never serves what Blob stores) audio was
silently broken. It now synthesizes to bytes and persists through the
media-store choke-point exactly like elevenlabs, so Blob deploys get working
audio.** All refactors are behavior-identical, proven by the existing goldens
plus new ones (media read-back branches; segment-image prompt byte-identity
verified against a pre-refactor capture). Gates green: `check-types`, `lint`,
full `bun run test`.

Bonus (shared-gate fix, committed first): the untracked `_ai_sessions/`
folder made `biome check .` fail for every lane — excluded in `biome.jsonc`
(commit 55d7642).

## Commits (in order)

| Commit | Candidate | Content |
|---|---|---|
| `55d7642` | — | chore: exclude `_ai_sessions/` from biome (shared lint gate was red at baseline) |
| `21977e7` | c4 | collapse hypothetical text & image seams; `getTtsProvider()` factory |
| `ab899f1` | c2 | media-store single choke-point + **Blob-mode audio bug fix** + extended `test:media` goldens |
| `286215b` | c3 | extract `buildSegmentImagePrompt` + byte-identity golden chained into `test:golden` |

## Candidate 4 — collapse the hypothetical seams

- Deleted `DynamicTextProvider` and `ImageProvider` from
  `src/server/providers/types.ts` (each had exactly ONE implementation,
  imported by concrete name, never injected; the text interface didn't even
  cover `generateStoryArc`). An "adapter census" note in types.ts documents
  the deliberate absence + when to re-introduce a seam.
- `src/server/providers/text/dynamic.ts` now exports a plain
  `generateBeat(input)` (was `anthropicDynamicProvider.generateBeat`);
  `src/server/providers/image/nanobanana.ts` exports a plain
  `generateImage(prompt, model?, referenceImage?)`. Bodies unchanged —
  annotation-only removal (deletion test: types + lint + all goldens pass
  untouched).
- KEPT the real TTS seam (`TtsProvider`, two live adapters) and gave it the
  missing factory: `src/server/providers/tts/index.ts` →
  `getTtsProvider()` (env-switched). `src/server/functions.ts` no longer
  inlines the ternary.
- Callers updated: `src/server/dynamic-functions.ts`, `src/server/functions.ts`.

## Candidate 2 — media-store as the single choke-point (BUG FIX)

- `src/server/providers/media-store.ts` gains the read-back:
  - `resolveStoredMediaForModel(stored)` — hides BOTH storage branches:
    `https://` → allowlist → bounded 10s fetch → bytes; `/data/media/…` →
    `readStoredMediaBytes` (media-dir escape rejected). Returns `undefined`
    on rejection; errors propagate (caller owns best-effort).
  - `allowedStoredMediaUrl(stored, storeHost)` — the https allowlist decision
    extracted PURE (env-free) so the goldens pin it: exact own-store host
    when the rw token is set, else the `*.public.blob.vercel-storage.com`
    suffix. Rejection stays LOUD (the case-mismatch prod bug precedent).
- `resolveReferenceImage` (dynamic-functions.ts) no longer re-implements the
  branch (its private `BLOB_HOST_SUFFIX` + allowlist compare + fetch deleted);
  it only picks WHICH row anchors the story, then calls the choke-point. Its
  return type narrowed `Uint8Array | URL | undefined` → `Uint8Array |
  undefined` (the URL arm was already dead — bytes were always downloaded).
- **edge TTS fix** (`src/server/providers/tts/edge.ts`): synthesizes via
  `toStream` → collects bytes (`push(null)` on turn.end ends iteration, same
  data path as the library's own `toFile`) → `saveMedia`. Throws on zero
  bytes (mirrors the library's "No audio data received"). Audio now honors
  the active backend: local web path OR Blob CDN URL.
- `mediaFilePath()` deleted — it was the path-builder that enabled the
  bypass; its only consumer was old edge.ts. `/data/$` route untouched
  (uses `readStoredMediaBytes`/`contentTypeFor`).
- Security properties preserved and now PINNED at the new interface
  (`test:media`, 15 checks): lowercased host derivation, exact-host accept,
  foreign-store reject, suffix fallback accept/reject, suffix-LOOKALIKE
  host reject, non-https/malformed reject, local bytes round-trip,
  traversal escape reject, foreign path-shape reject, https reject →
  `undefined` without fetch. The golden sandboxes DATA_DIR in a temp dir
  (dynamic import after env setup).
- Back-compat: both stored row kinds (`/`-prefix and `https://`) keep
  working — the boundary just lives in one place now.

## Candidate 3 — extract the segment-image prompt builder

- New pure module `src/server/providers/image/segment-prompt.ts`:
  `buildSegmentImagePrompt(story, segment, hasReferenceImage, frozen)` —
  scene · ambiance · outfit · heroes · doudou · style all inside, with the
  original inline comments (sceneHint priority over the frozen place,
  visual_world as DEFAULT ambiance, reference-anchors-identity-not-decor,
  doudou sliced to the first). Structural input types
  (`SegmentImagePromptStory/Segment/Context`) so `FrozenStoryContext` and
  DB rows satisfy them without importing schema/env — the golden stays pure.
- `generateSegmentImage` in dynamic-functions.ts keeps only DB read /
  reference resolve / persist / sentinel.
- **Byte-identity proven**: the VERBATIM pre-refactor assembly was run over a
  4-fixture set BEFORE the refactor
  (`workdir/laneB/260723_capture-image-prompts.ts` →
  `260723_image-prompts-before.json`), the extracted builder over the same
  fixtures AFTER (`…-after.json`); programmatic compare: all 4 identical.
  Fixtures cover: sceneHint-priority-over-place, place-hint fallback,
  visual_world default, reference vs beat-0 clause, outfit line, multi-hero
  grouping, doudou slice, scene-line omission.
- Pinned forever by
  `src/server/providers/image/__tests__/segment-image-prompt.golden.ts`
  (expected strings = the frozen BEFORE bytes), chained into `test:golden`
  (package.json — the one minimal edit).

## Gate results (final, after all 3 commits)

- `bun run check-types` — green.
- `bun run lint` — green (12 pre-existing warnings / 1 info, exit 0).
- `bun run test` — ALL green: golden (incl. new segment-image golden),
  coherence (44), media (15, both branches), data-route, reading-aids,
  operations + serie-session (lane A's), bureau, routes.

## CLAUDE.md edits needed (NOT applied — for the packaging agent)

1. **Architecture › Adapters bullet** — `- **Adapters** in
   src/server/providers/{text,image,tts}/ behind types.ts:` is stale. Suggested:
   "**Providers** in `src/server/providers/{text,image,tts}/`: text and image
   are plain modules called by concrete name (`generateBeat`/`generateStoryArc`
   in `text/dynamic.ts`; `generateImage` in `image/nanobanana.ts`) — no
   interface seam (one implementation each, see the adapter-census note in
   `types.ts`); only TTS keeps a real seam (`TtsProvider` in `types.ts`, two
   adapters, env-switched via `getTtsProvider()` in `tts/index.ts`)."
2. **Same section, tts sub-bullet** — append "selected via `getTtsProvider()`"
   to `tts: edge (msedge-tts, default) / elevenlabs, behind TTS_ENABLED`.
3. **Generated media bullet** — replace the read-back sentence
   ("Read-back (for the reference-image flow): `readStoredMediaBytes` returns
   local media bytes … `blobStoreHost()` derives …") with: "Read-back:
   `resolveStoredMediaForModel` hides both branches (https allowlisted to the
   app's own Blob host — rw-token-derived, else
   `*.public.blob.vercel-storage.com`; local paths rejected if they escape the
   media dir). BOTH TTS adapters and the image provider persist through
   `saveMedia` — nothing writes media paths by hand."
4. **Commands › test:golden** — now "pins prompt identity (text fragments +
   the segment-image prompt builder, byte-identical)".
5. **Commands › test:media** — now "pins the media-store rules: blob-host
   derivation and the read-back choke-point (allowlist both modes, media-dir
   escape, bytes round-trip)".
6. Optional, image sub-bullet: mention the illustration prompt is assembled by
   `buildSegmentImagePrompt` (`image/segment-prompt.ts`).

## Decisions / learnings

- `resolveStoredMediaForModel` LOGS its allowlist rejection itself (loud —
  the prod-bug precedent) but without storyId/idx; the caller's best-effort
  catch keeps the story context for real errors. Trade-off accepted: one log
  line lost caller context, the rule gained a single home.
- msedge-tts's stream ends via `push(null)` on `turn.end` (verified in the
  installed package source), so `for await` collects exactly what `toFile`
  wrote — the bytes path is not a re-implementation risk.
- The extracted prompt builder uses STRUCTURAL types on purpose: importing
  the drizzle schema would have dragged env/DB into a pure golden.

## Risks / notes for the reviewer

- Behavior deltas are exactly two, both intended: (1) Blob-mode audio now
  works (was broken); (2) the allowlist-rejection log line moved/changed
  prefix (`[media-store] …` instead of `[stories] … for story X idx=Y`).
- `mediaFilePath` export removed — grep confirms no remaining consumer; any
  out-of-tree script using it would break (none known).
- test:media now creates/removes a temp dir under the OS tmpdir; it no longer
  depends on the repo's `./data`.
- Shared tree churn: lane A was editing calcul/operations concurrently;
  final gate run includes their `serie-session` golden — green at my last run.
