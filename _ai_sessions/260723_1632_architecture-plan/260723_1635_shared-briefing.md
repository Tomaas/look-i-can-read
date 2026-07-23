# Shared briefing — architecture-plan session (2026-07-23)

Orchestrated session implementing the 6-candidate architecture review in
`260723_1632_plan-source.html` (same folder). You are a worker in one lane.

## Mandatory reads before working
1. `~/.claude/skills/orchestrator-and-worker/SKILL.md` — FULL read.
2. This file.
3. Your candidate sections in `_ai_sessions/260723_1632_architecture-plan/260723_1632_plan-source.html`.
4. The repo `CLAUDE.md` — especially THE NON-NEGOTIABLE CONSTRAINT (calm tool,
   no gamification/score/pressure — applies to every string you write) and the
   test conventions (plain-bun golden scripts, no vitest).

## Branch & commit policy
- Branch: `refactor/plan-architecture-0723` (already checked out; shared
  working tree, NO worktrees). Never switch branches.
- STRICT FILE SCOPE per lane (listed in your spawn prompt). Other lanes work
  in parallel in the same tree — touching a file outside your scope corrupts
  their work.
- Commit your own work: `git add <only your files>` + descriptive commit
  message following repo style (English conventional prefix, French detail is
  fine). If `git commit` hits an index.lock race, wait 2s and retry (other
  lanes commit too). Commit in coherent chunks (per candidate).
- NEVER touch: `VERSION`, `CHANGELOG.md`, `CLAUDE.md`, `TODOS.md`,
  `compose.yml`, anything under `.env*`. If your change makes CLAUDE.md prose
  stale, LIST the needed edit in your report instead — a packaging agent
  applies them all at the end.
- `package.json`: minimal edits only (adding a test script line if truly
  needed); prefer folding new goldens into the existing `test:*` script your
  area already uses.

## Behavior invariants (the refactor must not change behavior)
- An interrupted série regenerates IDENTICALLY from (palier, seed); the legacy
  `calcul:serie` bridge still migrates once; storage failure degrades silently.
- `/`-prefix (local) vs `https://` (Blob) media rows BOTH keep working; local
  read-back still rejects paths escaping the media dir; the Blob allowlist
  host rule is unchanged.
- Public URLs unchanged (test:routes must stay green).
- Zod schema KEY ORDER is the JSON property order sent to the model — never
  reorder keys.
- Prompt IDENTITY: unless your candidate explicitly changes where a prompt is
  built, the assembled prompt strings stay byte-identical (goldens pin this).

## Definition of done for your lane (write proof in your report)
1. `bun run check-types` green.
2. `bun run lint` green (Biome/ultracite; deliberate opt-outs live in
   biome.jsonc — don't add new suppressions without a stated reason).
3. `bun run test` green — INCLUDING your new goldens, which must cover the
   branches the plan calls "untested".
4. Work committed on the branch in scoped chunks.

## Reporting (context economy)
- Full report → `_ai_sessions/260723_1632_architecture-plan/260723_HHmm_lane<X>_report.md`
  (exec summary first, then details: decisions, tradeoffs, CLAUDE.md edits
  needed, anything the reviewer/packager must know).
- Your FINAL MESSAGE back to the orchestrator: a DIGEST ≤300 words — status,
  commits made, gates run + results, CLAUDE.md edits needed, open risks. No
  code dumps.
- If you hit something that could block OTHER lanes (e.g. a broken shared
  gate on main), say it in your digest immediately/return early.
