# Exec summary — architecture-plan session (2026-07-23, branch `refactor/plan-architecture-0723`)

## What shipped

All 6 candidates of the architecture review (plan:
`260723_1632_plan-source.html`) implemented by 3 parallel lanes, reviewed,
packaged as **v0.4.2.0**. User-visible behavior is UNCHANGED except one fix.

1. **serie-session module** (c1, lane A) — the ~250 untested lines of série
   glue in the /calcul route (legacy bridge, authoritative purge,
   resume-or-fresh, settings cache) now live in pure, golden-tested
   `src/lib/operations/serie-session.ts` behind a 3-method `SerieStorage`
   port. Route: 711 → ~490 lines, rendering + DnD only.
2. **media-store single choke-point** (c2, lane B) —
   `resolveStoredMediaForModel` hides both storage branches (Blob allowlist /
   local media-dir escape); nothing builds media paths by hand anymore.
3. **Segment-image prompt builder** (c3, lane B) — extracted pure
   `buildSegmentImagePrompt` (`image/segment-prompt.ts`), byte-identity
   proven against a pre-refactor capture and pinned by a golden.
4. **Interface cleanup** (c4, lane B) — hypothetical `DynamicTextProvider` /
   `ImageProvider` seams deleted (one impl each); TTS keeps its real seam +
   gains `getTtsProvider()`.
5. **reclampCommitted** (c5, lane C) — the 4 committed-position re-clamp
   sites in `fenetre.tsx` concentrated into one pure helper in `clamp.ts`.
6. **Pinned prose contracts** (c6, lane C) — routes.golden now pins "no
   `ssr:` under `_bureau/`" and "gate CALLED in exactly two files, never
   `__root`".

## The bug fix (the one behavior change)

Edge TTS (the DEFAULT voice) wrote audio straight to local disk and
hand-built its `/data/media/` path, bypassing `saveMedia` — in Blob-storage
mode audio was silently broken. It now persists through the media-store
choke-point like everything else. The current family deploy (local disk) was
unaffected.

## Review verdict

Codex review (`260723_1658_review_codex.md`): **SAFE TO SHIP** — 0 critical,
0 major, 1 minor (a golden pinned token presence instead of invocation),
fixed on-branch in `08fe481`. Final gate re-run by the packager:
`check-types` + `lint` + full `bun run test` all green.

## Commits (oldest first)

Note: the branch history was rewritten post-packaging (commit messages
translated to English; trees byte-identical) — lane reports and the codex
review cite the PRE-rewrite shas (acc7288, 55d7642, 62cef9c, 21977e7,
ca6fc25, ea072fd, ab899f1, 286215b, 08fe481, 1c6d930, in that order).

- `04647f0` refactor: concentrate the committed-position re-clamp in clamp.ts (c5)
- `16e7a0a` chore: exclude `_ai_sessions/` from biome (shared gate fix)
- `4d6251d` test: pin the bureau's two prose contracts in routes.golden (c6)
- `abb514a` refactor: collapse the hypothetical text & image provider seams (c4)
- `f18f0aa` refactor(operations): serie-session module (c1)
- `5035b36` refactor(calcul): the route keeps only rendering and dnd wiring (c1)
- `f9cf2bf` fix: restore media-store as the single media choke-point (c2, bug fix)
- `cf25a61` refactor: extract the segment-image prompt builder (c3)
- `6dad532` test: the T2-A contract pins the gate's CALL (review fix)
- `27d7c5c` packaging commit: VERSION 0.4.2.0, CHANGELOG, CLAUDE.md, TODOS.md, session docs

## Where the detail lives

- Lane reports (root of this folder): `260723_1641_laneC_report.md` (incl.
  addendum), `260723_1646_laneA_report.md`, `260723_1649_laneB_report.md`.
- Review: `260723_1658_review_codex.md`; codex raw artifacts in `workdir/`.
- Decisions log: `260723_1704_decisions-log.md` (same folder).

## Before deploying

No migration in this release. Standard `bun run deploy` + health check.
