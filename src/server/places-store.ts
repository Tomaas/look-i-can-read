import { eq } from "drizzle-orm";
import { places as legacyPlaces } from "~/config/places";
import { db } from "~/server/db";
import { places } from "~/server/db/schema";

/**
 * Server-only place helpers that touch the DB but are NOT server functions.
 *
 * These live in their OWN module (not alongside the `createServerFn` exports in
 * places-functions.ts) on purpose: TanStack strips server-FN bodies from the
 * client bundle, but a PLAIN exported function that imports `~/server/db` would
 * drag libSQL into the client build if it shared a module with a server fn that
 * a route loader imports. Keeping these here, imported only by other server
 * code, keeps the client bundle clean.
 */

/**
 * Idempotently seed the 6 immutable config places into the DB, REUSING their
 * exact ids (codex #6: NOT seed-by-count). `onConflictDoNothing` on the primary
 * key means:
 *  - first run populates the table;
 *  - every later run is a no-op for existing ids → a parent's edits are NEVER
 *    overwritten, and a soft-deleted seed place is NOT resurrected.
 * Reusing the config ids keeps historical `stories.placeId` references resolving
 * to a live row for stories created before the snapshot columns existed.
 */
export async function seedPlacesIfNeeded(): Promise<void> {
  await db
    .insert(places)
    .values(
      legacyPlaces.map((p, i) => ({
        id: p.id,
        label: p.label,
        emoji: p.emoji,
        promptHint: p.promptHint,
        sort: i,
      })),
    )
    .onConflictDoNothing()
    .run();
}

/**
 * Resolve a place by id for CREATION-TIME snapshotting. Prefers the live DB row
 * (active OR soft-deleted — a story can be created from a place that exists),
 * falling back to the immutable config so a fresh DB before the first seed still
 * resolves. The resolved label + promptHint are frozen onto the new story row;
 * after that, history never reads the table.
 */
export async function resolvePlaceForCreation(
  placeId: string,
): Promise<{ label: string; promptHint: string } | null> {
  await seedPlacesIfNeeded();
  const [row] = await db.select().from(places).where(eq(places.id, placeId));
  if (row) {
    return { label: row.label, promptHint: row.promptHint };
  }
  const legacy = legacyPlaces.find((p) => p.id === placeId);
  return legacy ? { label: legacy.label, promptHint: legacy.promptHint } : null;
}
