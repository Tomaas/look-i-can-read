# Decisions log — architecture-plan session (2026-07-23)

Only the REAL tradeoffs; the full rationale is in the lane reports.

1. **Storage-port shape (serie-session)**: verbs take `storage` as an
   explicit first param — no factory/closure — to keep functions pure and
   match the repo's plain-function style. The route holds one module-level
   `browserSerieStorage()`; it touches `window` only at call time, so
   module-level creation stays SSR-safe. (Lane A)
2. **Log-line context loss (media read-back)**:
   `resolveStoredMediaForModel` logs its own allowlist rejection (loud — the
   prod-bug precedent) but as `[media-store] …` without storyId/idx; the
   caller's best-effort catch keeps story context for real errors only.
   Accepted: one log line lost caller context, the rule gained a single home.
   (Lane B)
3. **Structural types for the prompt builder**: importing the drizzle schema
   into `segment-prompt.ts` would have dragged env/DB into a pure plain-bun
   golden — structural `SegmentImagePrompt*` input types instead. (Lane B)
4. **dragEnd stays on `clampFenetrePosition`**, not `reclampCommitted`: it
   commits a freshly computed position (origin+delta) where the
   prev-null/no-op semantics don't apply. Intentional asymmetry. (Lane C)
5. **T2-A pins call sites per FILE, not per call**: a second gate call inside
   one of the two blessed files would still pass — matches the contract as
   written ("lives at exactly TWO places"). After the codex review, the
   assertion matches an INVOCATION regex on comment-stripped source, not raw
   token presence (`08fe481`). (Lane C + review)
6. **edge TTS bytes path**: `toStream` → `for await` collect; verified in the
   installed msedge-tts source that the stream ends via `push(null)` on
   `turn.end`, so the collected bytes equal what the library's own `toFile`
   wrote — not a re-implementation risk. Zero-byte result throws. (Lane B)
7. **Version 0.4.2.0 (MINOR)**: precedent 0.3.1.0 — internal cleanup +
   pinned contracts with no behavior change bumped MINOR; this release adds a
   real fix on top, so MINOR, not MICRO. (Packaging)
