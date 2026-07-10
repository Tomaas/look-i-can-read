import { inArray } from "drizzle-orm";
import { legacyHeroes } from "~/config/characters";
import { db } from "~/server/db";
import { heroes } from "~/server/db/schema";

/**
 * Server-only hero helpers that touch the DB but are NOT server functions.
 *
 * These live in their OWN module (not alongside the `createServerFn` exports in
 * heroes-functions.ts) for the same reason as `doudous-store.ts`/`places-store.ts`:
 * a PLAIN exported function importing `~/server/db` would drag libSQL into the
 * client build if it shared a module with a server fn a route loader imports.
 * Keeping these here, imported only by other server code, keeps the bundle clean.
 */

/** A hero resolved for creation: the frozen snapshot fields PLUS the id (kept so
 * the caller can mirror the FIRST hero's id into the NOT NULL `heroId` column —
 * codex #2). */
export interface ResolvedHero {
  id: string;
  label: string;
  promptHint: string;
  imageHint: string;
}

/**
 * Idempotently seed the immutable config heroes into the DB, REUSING their exact
 * ids (codex #6: NOT seed-by-count). `onConflictDoNothing` on the primary key
 * means a parent's edits are never overwritten and a soft-deleted seed hero is
 * not resurrected. Reusing config ids keeps historical `stories.heroId`
 * references resolving to a live row. `imageHint` is required on the table; the
 * legacy map already supplies a gentle default for config heroes lacking one.
 */
export async function seedHeroesIfNeeded(): Promise<void> {
  await db
    .insert(heroes)
    .values(
      legacyHeroes.map((h, i) => ({
        id: h.id,
        label: h.label,
        emoji: h.emoji,
        promptHint: h.promptHint,
        imageHint: h.imageHint,
        sort: i,
      })),
    )
    .onConflictDoNothing()
    .run();
}

/**
 * Resolve SEVERAL heroes by id for creation-time snapshotting (multi-select).
 * Preserves the child's pick ORDER (hero[0] is the PRIMARY hero), drops any id
 * that resolves to neither a DB row nor a config entry, and de-duplicates.
 * Returns [] for an empty input. One round-trip for the DB rows; config covers a
 * pre-seed gap. The caller HARD-FAILS on an empty result (codex #2) — a
 * z.array().min(1) only proves ids were submitted, not that rows were found.
 */
export async function resolveHeroesForCreation(
  heroIds: string[],
): Promise<ResolvedHero[]> {
  const uniqueIds = [...new Set(heroIds)];
  if (uniqueIds.length === 0) {
    return [];
  }
  await seedHeroesIfNeeded();
  const rows = await db
    .select()
    .from(heroes)
    .where(inArray(heroes.id, uniqueIds));
  const byId = new Map(rows.map((r) => [r.id, r]));
  const legacyById = new Map(legacyHeroes.map((h) => [h.id, h]));
  const resolved: ResolvedHero[] = [];
  for (const id of uniqueIds) {
    const row = byId.get(id);
    if (row) {
      resolved.push({
        id: row.id,
        label: row.label,
        promptHint: row.promptHint,
        imageHint: row.imageHint,
      });
      continue;
    }
    const legacy = legacyById.get(id);
    if (legacy) {
      resolved.push({
        id: legacy.id,
        label: legacy.label,
        promptHint: legacy.promptHint,
        imageHint: legacy.imageHint,
      });
    }
  }
  return resolved;
}
