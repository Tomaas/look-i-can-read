import { createServerFn } from "@tanstack/react-start";
import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "~/server/db";
import { type DbHero, heroes } from "~/server/db/schema";
import { seedHeroesIfNeeded } from "~/server/heroes-store";

/**
 * Active heroes (deletedAt IS NULL), ordered, for the picker + parent page.
 * Seeds on first read. Heroes are REQUIRED (≥1 pick), but the picker falls back
 * to the config list if this ever returns empty, so a DB hiccup never blanks the
 * child flow.
 */
export const listHeroesFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<DbHero[]> => {
    await seedHeroesIfNeeded();
    return db
      .select()
      .from(heroes)
      .where(isNull(heroes.deletedAt))
      .orderBy(asc(heroes.sort), asc(heroes.createdAt));
  },
);

const upsertSchema = z.object({
  label: z.string().trim().min(1, "Un nom est nécessaire."),
  emoji: z.string().trim().max(8).optional(),
  imagePath: z.string().trim().optional(),
  promptHint: z.string().trim().min(1, "Une description est nécessaire."),
  imageHint: z
    .string()
    .trim()
    .min(1, "Une description pour l'image est nécessaire."),
  sort: z.number().int().optional(),
});

export type HeroMutationResult =
  | { success: true; hero: DbHero }
  | { success: false; error: string };

export const createHeroFn = createServerFn({ method: "POST" })
  .inputValidator(upsertSchema)
  .handler(async ({ data }): Promise<HeroMutationResult> => {
    const [hero] = await db
      .insert(heroes)
      .values({
        label: data.label,
        emoji: data.emoji || null,
        imagePath: data.imagePath || null,
        promptHint: data.promptHint,
        imageHint: data.imageHint,
        sort: data.sort ?? 999,
      })
      .returning();
    return { success: true, hero };
  });

export const updateHeroFn = createServerFn({ method: "POST" })
  .inputValidator(upsertSchema.extend({ id: z.string() }))
  .handler(async ({ data }): Promise<HeroMutationResult> => {
    const [hero] = await db
      .update(heroes)
      .set({
        label: data.label,
        emoji: data.emoji || null,
        imagePath: data.imagePath || null,
        promptHint: data.promptHint,
        imageHint: data.imageHint,
        ...(data.sort === undefined ? {} : { sort: data.sort }),
      })
      .where(and(eq(heroes.id, data.id), isNull(heroes.deletedAt)))
      .returning();
    if (!hero) {
      return { success: false, error: "Héros introuvable." };
    }
    return { success: true, hero };
  });

/**
 * Soft delete — sets deletedAt, never removes the row, so any old story that
 * still references this id keeps resolving (and history reads the snapshot
 * anyway). No hard delete exists in the parent UI.
 */
export const deleteHeroFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    await db
      .update(heroes)
      .set({
        deletedAt: new Date().toISOString().replace("T", " ").slice(0, 23),
      })
      .where(and(eq(heroes.id, data.id), isNull(heroes.deletedAt)))
      .run();
    return { success: true };
  });
