# Review codex — branch `refactor/plan-architecture-0723` (2026-07-23 16:58)

## Exec summary

**Verdict: SAFE TO SHIP.** Two independent reviews (codex gpt-5, read-only,
full `git diff main...HEAD`; plus the babysitter's own line-for-line triage
pass) converge: the 6-candidate refactor is behavior-preserving. **0 CRITICAL,
0 MAJOR, 1 MINOR (confirmed), 0 NIT.** The one finding is a test-strength
weakness in a NEW golden assertion, not a behavior regression — fixable in a
follow-up, does not block merge/deploy.

Independent gate verification by the babysitter (not just lane claims):
`bun run test` exit 0 (incl. all new goldens), `bun run check-types` clean,
`bun run lint` 0 errors (12 warnings / 1 info, pre-existing). Codex modified
no files (verified: `git status` clean apart from untracked `_ai_sessions/`).

Codex artifacts: prompt `workdir/260723_1652_codex_review_prompt.md`, raw
answer `workdir/codex-answer-turn-1.md`, session/thread id
`019f8f77-1537-7540-aeef-567de73c3d10` (resumable).

## Findings

### MINOR — T2-A gate assertion pins token PRESENCE, not INVOCATION — CONFIRMED

- File: `src/lib/bureau/__tests__/routes.golden.ts:149` (the new T2-A check).
- The check filters `sources` with raw `s.contenu.includes("lireSessionOuverte")`
  (no comment stripping, no call-shape match). Both legitimate files carry the
  token in their IMPORT line as well as the call
  (`src/app/_bureau/route.tsx:10,47`, `src/app/index.tsx:6,34`), so a
  refactor that keeps the import but drops the actual call (e.g.
  `void lireSessionOuverte`) would silently pass the golden while the
  closed-session gate is disabled.
- Triage: CONFIRMED against the working tree. Severity stays MINOR: the
  assertion's stated purpose (gate lives at exactly TWO places, never
  `__root`) IS enforced non-vacuously — adding the token anywhere else,
  including `__root.tsx`, fails the set-equality; removing a whole gate file
  fails too. Only the "import kept, call removed" corner escapes. Note the
  failure mode is also fail-safe-ish in the other direction: a stray comment
  mentioning the token in a third `src/app` file makes the check over-trigger
  (false alarm), never under-trigger.
- Suggested fix (follow-up, one line): reuse the D17-A `sansCommentaires`
  helper and match an invocation regex `/\blireSessionOuverte\s*\(/` instead
  of `includes`, keeping the exact-location set comparison.

## Clean bills per scrutiny area (each independently re-verified)

1. **serie-session extraction** (`src/lib/operations/serie-session.ts` +
   `src/app/_bureau/calcul/index.tsx`) — CLEAN. Babysitter compared the port
   line-for-line against `main:src/app/_bureau/calcul/index.tsx`; codex did
   the same independently. Verified identical: legacy `calcul:serie` bridge
   (raw-read first so a corrupt key can be cleaned; never overwrites an
   occupied family key; legacy removed only after RE-READ of the target;
   quota-swallowed write keeps the legacy key for a next visit — early return
   still reaches settings normalization exactly like the old
   `return finishSettings()`), authoritative-only cache write AND orphan-key
   purge (both still gated on `dbSettings?.authoritative`, same order:
   cache write then purge), resume-vs-purge-on-mismatch
   (`isResumableSerie` then `removeItem`), fingerprint round-trip
   (`freshSerie` identical incl. seed born at tray-take; goldens pin
   (palier, seed) regeneration identity), silent storage degradation (every
   port access wrapped in try/catch; `browserSerieStorage` touches window
   only at call time — module-level const in the route is SSR-safe). Route
   wiring preserves every lifecycle moment: loadSession on mount effect keyed
   `[dbSettings]`, saveSerie on every serie state change, clearSerie in the
   tidied timeout, shelfTrays memo on (settings, phase), same drag guards
   (dragOpIndexRef, ghost-click flag), `writeCell` = old `setCell` logic
   verbatim (bounds + done-frozen + same-reference no-op). 47 new golden
   assertions in `serie-session.golden.ts`, substantive (quota-full bridge,
   corrupt JSON, offline-no-purge, fingerprint identity...).
2. **media-store choke-point** — CLEAN. `resolveStoredMediaForModel` is a
   faithful merge of the old `resolveReferenceImage` branches: https →
   `allowedStoredMediaUrl` (exact own-store host when rw token set, else
   `.public.blob.vercel-storage.com` suffix — same `endsWith` rule as before,
   loud console.warn on rejection preserved, URL-parse failure → null instead
   of throw, equivalent under the caller's try/catch), 10s
   `AbortSignal.timeout` bound kept, `/data/media/` → `readStoredMediaBytes`
   (media-dir escape rejection untouched). Errors still propagate to
   `resolveReferenceImage`'s best-effort try/catch → reference failure never
   fails the beat. Both legacy row shapes resolve; goldens now pin the
   allowlist incl. a suffix-lookalike host. **edge TTS**: `toStream` returns
   `stream.Readable` in the installed msedge-tts (verified in
   `node_modules/msedge-tts/dist/MsEdgeTTS.d.ts:102`) so `for await` is
   correct; mp3 OUTPUT_FORMAT unchanged; zero-byte throw mirrors the
   library's toFile failure; `saveMedia` handles mkdir (local) and returns
   web path or Blob https URL — the claimed Blob-mode audio bug fix is real
   and correctly implemented; env switching (`getTtsProvider`) is the exact
   old ternary.
3. **buildSegmentImagePrompt** — CLEAN. Extracted body is byte-identical to
   the old inline assembly (same strings, same array order, same
   `.filter(Boolean).join(" ")`); the only semantic mapping is
   `referenceImage` truthiness → `hasReferenceImage = referenceImage !==
   undefined`, equivalent because the old value was an object type
   (`Uint8Array | URL | undefined` — empty Uint8Array is truthy). Golden
   pins 4 FROZEN pre-refactor strings covering: reference/no-reference,
   sceneHint priority, place fallback, scene line fully omitted, visualWorld
   present/absent, outfit, multi-hero grouping, doudou sliced to first. No
   uncovered branch found by either reviewer (the assembly has no other
   conditionals).
4. **Interface deletion + getTtsProvider** — CLEAN. `generateBeat` /
   `generateImage` keep explicit param+return annotations (pure
   de-indentation, bodies unchanged); no orphan references to
   `anthropicDynamicProvider` / `nanoBananaImageProvider` /
   `DynamicTextProvider` / `ImageProvider` / `mediaFilePath` / `GridEntries`
   anywhere in `src/` (grep-verified); `TtsProvider` seam kept with both
   adapters; `TTS_ENABLED` gating at call sites untouched.
5. **fenetre.tsx reclampCommitted** — CLEAN. Drag-in-flight guard
   (`origineDragRef`) unchanged in the resize listener; dragEnd still commits
   a NEW position via `clampFenetrePosition` (not the re-clamp helper);
   dragCancel clears the ref then re-clamps; `reclampCommitted` reproduces
   null-passthrough + same-reference no-op verbatim; transform remains
   drag-transient only (commit in left/top — DragOverlay contract intact);
   position state still starts null (reopen centered); resize effect still
   gated on `estDesktop`.
6. **routes.golden.ts new assertions** — the D17-A ssr-scan is non-vacuous
   (comment-stripped regex `\bssr\s*:`, fails on zero scanned files, catches
   a real `ssr: false` while tolerating the contract prose that quotes it);
   T2-A is non-vacuous for its stated purpose but has the MINOR
   presence-vs-invocation gap above.

## Sweeps

- Calm constraint: NO violation in any added string (scanned the full added
  diff for score/bravo/gagné/perdu/timer/reward/streak/progress/quiz/
  évaluation wording — the only hits are code comments about key precedence
  and pre-existing English module prose).
- Zod schema key order: no schema reordered anywhere in the diff
  (`test:coherence` key-order pin also green).
- CLAUDE.md contracts: no regression (public URLs pinned green by
  `test:routes`; `_bureau` ssr contract now golden-pinned; `src/lib` modules
  stay env/DB/DOM-free at load — plain-bun goldens run them).
- `biome.jsonc` `_ai_sessions/` exclusion (55d7642): legitimate shared-gate
  fix, config-only, documented inline.

## What was NOT verified

- Codex ran no tests/builds (by instruction); the babysitter ran all three
  gates instead (green, see exec summary).
- No runtime/browser QA of /calcul or the window drag was performed in this
  review lane — the orchestrator may want a /qa pass before deploy, though
  nothing found suggests it would fail.
