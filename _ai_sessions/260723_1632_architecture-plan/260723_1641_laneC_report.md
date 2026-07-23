# Lane C report — candidates 5 & 6 (window re-clamp + prose-only bureau contracts)

## Exec summary

Both candidates implemented, golden-tested, committed in two scoped chunks.
Full `bun run test` is GREEN. `check-types` and `lint` are green FOR MY
FILES; the remaining failures at whole-repo level are Lane A/B in-flight
edits (details below) — nothing of mine.

- `acc7288` refactor: concentre le re-bornage committé dans clamp.ts
  (reclampCommitted) — candidate 5.
- `62cef9c` test: épingle les deux contrats prose du bureau dans
  routes.golden (D17-A, T2-A) — candidate 6.

## Candidate 5 — reclampCommitted

- `src/lib/bureau/clamp.ts`: new pure helper
  `reclampCommitted(prev: Position | null, fenetre: Taille, viewport: Taille,
  titleBarHeight: number): Position | null` — null-passthrough (window still
  CSS-centred) + same-reference no-op (so `setPosition(prev => prev)` never
  re-renders on resize events far from the edges) + delegates the title-bar
  invariant to `clampFenetrePosition` (unchanged).
- `src/components/bureau/fenetre.tsx`: the 4 committed-position sites now
  only do event wiring:
  - resize effect + reclamp-on-attach → `setPosition(prev =>
    reclampCommitted(prev, rect, viewportActuel(), FENETRE_TITLE_BAR_HEIGHT))`
    (drag-in-flight guard kept, unchanged semantics);
  - `handleDragCancel` → same one-liner (duplicated no-op block deleted);
  - `handleDragEnd` → still `clampFenetrePosition` (it commits a NEW
    position, not a re-clamp) but shares the new tiny `viewportActuel()`
    module helper and passes the DOMRect directly (structural `Taille`).
- Contracts verified intact: commit in left/top, transform only DURING drag
  (never persistent — /calcul DragOverlay), title bar fully visible, reopen
  centred (position state still starts null), <lg fullscreen without drag
  (effect still gated on `estDesktop`). Behavior is byte-for-byte the same
  logic, just concentrated.
- Golden (`test:bureau`, `bureau.golden.ts`) extended with 5 assertions:
  null passthrough, no-op same REFERENCE far from edges, same reference when
  exactly on the bound, out-of-bounds → new reference with
  clampFenetrePosition values, viewport-shrink re-clamp (D11-A).

## Candidate 6 — prose contracts pinned in routes.golden.ts

Tokens verified against the working tree before pinning:

- (D17-A) no `ssr:` route option anywhere under `src/app/_bureau/**`. The
  scan strips comments first — `src/app/_bureau/route.tsx`'s doc comment
  itself quotes `ssr: false` in order to forbid it, so a naive scan would
  always fail. Regex `\bssr\s*:` on comment-stripped content; the check also
  fails if zero files are scanned (no vacuous pass). Mutation-checked: a real
  `{ ssr: false, ... }` or `ssr : true` is caught; the current comment-only
  file is not.
- (T2-A) the closed-session gate token `lireSessionOuverte` appears in
  EXACTLY `src/app/_bureau/route.tsx` + `src/app/index.tsx` (set equality,
  code-unit sort — locale-independent), which by construction also pins
  "never `__root`". Definition (`src/lib/bureau/session.ts`) and the bureau
  golden are outside the scanned `src/app` tree, so they don't pollute.
- Both written in the file's existing text-scan style (`check(...)`,
  French labels, top-level regexes per Biome `useTopLevelRegex`).
- Robust to Lane A's parallel edit of `src/app/_bureau/calcul/index.tsx`:
  the assertions only look for the ssr/gate tokens, which that file must not
  contain anyway.

## Gates (as of 16:41)

- `bun run test` — GREEN (all 8 golden scripts, incl. the extended
  test:bureau and test:routes).
- `bun run check-types` — fails ONLY in `src/server/providers/*` +
  `src/server/*functions.ts` (Lane B's uncommitted work-in-progress:
  `ImageProvider`, `anthropicDynamicProvider`, `nanoBananaImageProvider`
  exports mid-move). Zero errors in my files (my earlier run before Lane B's
  edits landed was fully green including my changes).
- `bun run lint` — fails ONLY in `src/app/_bureau/calcul/index.tsx`,
  `src/components/calcul/column-grid.tsx`, `src/components/printable-*.tsx`
  (Lane A in-flight) + the pre-existing biome.jsonc schema-version info
  (2.5.1 schema vs 2.5.3 CLI — pre-dates this session, visible on main).
  `bunx biome check src/lib/bureau src/components/bureau` is clean.
- Shared-gate incident, already resolved: the orchestrator's
  `plan-source.html` under `_ai_sessions/` broke `bun run lint` for every
  lane (19 errors); commit `55d7642` (another lane) excluded `_ai_sessions/`
  from Biome while I was mid-lane. Nothing left to do.

## CLAUDE.md prose that became stale (do NOT edit — for the packager)

1. `test:bureau` bullet: could add that the clamp coverage now includes the
   committed-position re-clamp helper (`reclampCommitted`: null passthrough +
   same-reference no-op). Optional — current wording ("window clamp incl.
   resize re-clamp") is not wrong.
2. `test:routes` bullet: now ALSO pins (a) no `ssr:` override under
   `src/app/_bureau/**` and (b) the gate-in-exactly-two-places contract —
   worth appending, the bullet currently only mentions URL integrity.
3. Pre-existing nit (not caused by me): CLAUDE.md says "the layout keeps
   `ssr: true`" but the layout sets NO ssr option at all (it keeps the
   DEFAULT); the new golden pins the accurate form ("no ssr option under
   _bureau"). Suggest rewording to "the layout never sets `ssr`".

## Risks / notes

- `handleDragEnd` intentionally still calls `clampFenetrePosition`, not
  `reclampCommitted` — it clamps a freshly computed position (origin+delta),
  where prev-null/no-op semantics don't apply. This matches the plan
  ("fenetre.tsx keeps only event wiring (drag vs resize)").
- The T2-A assertion counts token occurrences per FILE, not call sites; a
  second call added inside one of the two blessed files would still pass.
  That matches the contract as written ("lives at exactly TWO places").
- Biome auto-formatted both goldens (line wraps only); included in the
  commits.

## Addendum (16:45) — codex review fix

`08fe481` — the T2-A assertion now pins the CALL, not token presence:
`/\blireSessionOuverte\s*\(/` on comment-stripped source (reuses the D17-A
`sansCommentaires` helper). Raw `includes(GATE_TOKEN)` was satisfied by the
import line alone. Mutation-checked: import-only file → no match; call
removed from route.tsx (import kept) → assertion fails; call added to
__root → fails; call quoted in a comment → no match. Gates re-run after the
fix: full `bun run test` GREEN, `check-types` GREEN (Lane B's in-flight
errors have cleared), `bun run lint` GREEN repo-wide.
