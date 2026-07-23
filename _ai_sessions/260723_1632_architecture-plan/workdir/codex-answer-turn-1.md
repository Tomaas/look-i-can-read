Severity: MINOR  
[src/lib/bureau/__tests__/routes.golden.ts:149](/home/user/Developer/look-i-can-read/src/lib/bureau/__tests__/routes.golden.ts:149)

- Old behavior: `main` actually invokes `lireSessionOuverte()` in both `_bureau/route.tsx:47` and `index.tsx:34`.
- New behavior: the assertion uses raw `contenu.includes(GATE_TOKEN)`, so an import, comment, or unused reference counts as a functioning gate.
- Why it matters: replacing the actual call with `void lireSessionOuverte` would disable the session check while this golden still passes and still reports exactly two gate locations.
- Suggested fix: strip comments and match an invocation such as `/\blireSessionOuverte\s*\(/`, then retain the exact-location comparison.

Area verification:

1. Série lifecycle: no additional findings. Legacy migration ordering, occupied-key handling, quota preservation, authoritative-only purge/cache, mismatch purge, fingerprint regeneration, storage-failure degradation, and route lifecycle call sites match `main`.

2. Media store: no findings. Both stored path shapes remain supported; Blob allowlisting, local path containment, 10-second fetch bound, best-effort caller semantics, MP3 format, stream completion, zero-byte rejection, and `saveMedia` backend selection are preserved.

3. Segment prompt: no findings. The extracted builder is byte-identical across all branches of the old inline assembly, including falsy `sceneHint`/`visualWorld`, place fallback, reference selection, outfit, heroes, doudou slicing, ordering, and whitespace.

4. Provider interfaces/factory: no findings. Function signatures remain explicit, and `TTS_ENABLED`/`TTS_PROVIDER` behavior is unchanged.

5. Window clamp: no findings. Drag-end still commits the new clamped position; resize/cancel re-clamp the prior committed position; the in-flight guard, null-centered reopen state, SSR behavior, and transient-only transform remain intact.

6. Route assertions: one minor finding above. The SSR assertion is non-vacuous and catches `ssr: false`; the gate-location assertion catches an added token in `__root`, but does not prove the token is called.

No calm-language violations, Zod key-order changes, server-environment leakage into pure modules, stale provider imports, or other CLAUDE.md contract regressions found. Overall, the architecture refactor appears behavior-preserving apart from the route-test coverage weakness. No tests or builds were run, and no files were modified.