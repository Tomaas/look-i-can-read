import { inArray } from "drizzle-orm";
import { legacyElements } from "~/config/elements";
import { db } from "~/server/db";
import { dbElements } from "~/server/db/schema";

/**
 * Server-only element helpers that touch the DB but are NOT server functions.
 * Same client-bundle discipline as `doudous-store.ts`/`places-store.ts`: keep
 * the `~/server/db` import out of any module a route loader imports.
 */

/** An element resolved for creation: the frozen snapshot fields PLUS the id
 * (kept so the caller can mirror the FIRST element's id into the NOT NULL
 * `elementId` column — codex #2). Elements have no `imageHint` (no image role). */
export interface ResolvedElement {
  id: string;
  label: string;
  promptHint: string;
}

/**
 * Idempotently seed the immutable config elements into the DB, REUSING their
 * exact ids (codex #6). `onConflictDoNothing` keeps a parent's edits and never
 * resurrects a soft-deleted seed element. Reusing config ids keeps historical
 * `stories.elementId` references resolving to a live row.
 */
export async function seedElementsIfNeeded(): Promise<void> {
  await db
    .insert(dbElements)
    .values(
      legacyElements.map((e, i) => ({
        id: e.id,
        label: e.label,
        emoji: e.emoji,
        promptHint: e.promptHint,
        sort: i,
      })),
    )
    .onConflictDoNothing()
    .run();
}

/**
 * Resolve SEVERAL elements by id for creation-time snapshotting (multi-select).
 * Preserves pick ORDER, drops unresolved ids, de-duplicates. Returns [] for an
 * empty input. The caller HARD-FAILS on an empty result (codex #2).
 */
export async function resolveElementsForCreation(
  elementIds: string[],
): Promise<ResolvedElement[]> {
  const uniqueIds = [...new Set(elementIds)];
  if (uniqueIds.length === 0) {
    return [];
  }
  await seedElementsIfNeeded();
  const rows = await db
    .select()
    .from(dbElements)
    .where(inArray(dbElements.id, uniqueIds));
  const byId = new Map(rows.map((r) => [r.id, r]));
  const legacyById = new Map(legacyElements.map((e) => [e.id, e]));
  const resolved: ResolvedElement[] = [];
  for (const id of uniqueIds) {
    const row = byId.get(id);
    if (row) {
      resolved.push({
        id: row.id,
        label: row.label,
        promptHint: row.promptHint,
      });
      continue;
    }
    const legacy = legacyById.get(id);
    if (legacy) {
      resolved.push({
        id: legacy.id,
        label: legacy.label,
        promptHint: legacy.promptHint,
      });
    }
  }
  return resolved;
}
