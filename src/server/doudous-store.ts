import { inArray } from "drizzle-orm";
import { doudous as legacyDoudous } from "~/config/doudous";
import { db } from "~/server/db";
import { doudous } from "~/server/db/schema";

/**
 * Server-only doudou helpers that touch the DB but are NOT server functions.
 *
 * These live in their OWN module (not alongside the `createServerFn` exports in
 * doudous-functions.ts) for the exact same reason as `places-store.ts`: a PLAIN
 * exported function importing `~/server/db` would drag libSQL into the client
 * build if it shared a module with a server fn a route loader imports. Keeping
 * these here, imported only by other server code, keeps the client bundle clean.
 */

/**
 * Idempotently seed the immutable config doudous into the DB, REUSING their
 * exact ids (same discipline as `seedPlacesIfNeeded`: NOT seed-by-count).
 * `onConflictDoNothing` on the primary key means a parent's edits are never
 * overwritten and a soft-deleted seed doudou is not resurrected. Reusing config
 * ids keeps historical references resolving to a live row.
 */
export async function seedDoudousIfNeeded(): Promise<void> {
  await db
    .insert(doudous)
    .values(
      legacyDoudous.map((d, i) => ({
        id: d.id,
        label: d.label,
        emoji: d.emoji,
        promptHint: d.promptHint,
        imageHint: d.imageHint,
        sort: i,
      })),
    )
    .onConflictDoNothing()
    .run();
}

/**
 * Resolve SEVERAL doudous by id for creation-time snapshotting (multi-select).
 * Preserves the child's pick ORDER, drops any id that resolves to neither a DB
 * row nor a config entry, and de-duplicates. Returns [] for an empty input
 * (the child brought no doudou). One round-trip for the DB rows; config covers
 * a pre-seed gap. The resolved labels + hints are frozen onto the story row.
 */
export async function resolveDoudousForCreation(
  doudouIds: string[],
): Promise<Array<{ label: string; promptHint: string; imageHint: string }>> {
  const uniqueIds = [...new Set(doudouIds)];
  if (uniqueIds.length === 0) {
    return [];
  }
  await seedDoudousIfNeeded();
  const rows = await db
    .select()
    .from(doudous)
    .where(inArray(doudous.id, uniqueIds));
  const byId = new Map(rows.map((r) => [r.id, r]));
  const legacyById = new Map(legacyDoudous.map((d) => [d.id, d]));
  const resolved: Array<{
    label: string;
    promptHint: string;
    imageHint: string;
  }> = [];
  for (const id of uniqueIds) {
    const row = byId.get(id);
    if (row) {
      resolved.push({
        label: row.label,
        promptHint: row.promptHint,
        imageHint: row.imageHint,
      });
      continue;
    }
    const legacy = legacyById.get(id);
    if (legacy) {
      resolved.push({
        label: legacy.label,
        promptHint: legacy.promptHint,
        imageHint: legacy.imageHint,
      });
    }
  }
  return resolved;
}
