import { createServerFn } from "@tanstack/react-start";
import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "~/server/db";
import { type DbDoudou, doudous } from "~/server/db/schema";
import { seedDoudousIfNeeded } from "~/server/doudous-store";

/**
 * Active doudous (deletedAt IS NULL), ordered, for the picker + parent page.
 * Seeds on first read. The picker is OPTIONAL, so an empty list simply means no
 * doudou step is offered — it never blanks the child flow.
 */
export const listDoudousFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<DbDoudou[]> => {
    await seedDoudousIfNeeded();
    return db
      .select()
      .from(doudous)
      .where(isNull(doudous.deletedAt))
      .orderBy(asc(doudous.sort), asc(doudous.createdAt));
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

export type DoudouMutationResult =
  | { success: true; doudou: DbDoudou }
  | { success: false; error: string };

export const createDoudouFn = createServerFn({ method: "POST" })
  .inputValidator(upsertSchema)
  .handler(async ({ data }): Promise<DoudouMutationResult> => {
    const [doudou] = await db
      .insert(doudous)
      .values({
        label: data.label,
        emoji: data.emoji || null,
        imagePath: data.imagePath || null,
        promptHint: data.promptHint,
        imageHint: data.imageHint,
        sort: data.sort ?? 999,
      })
      .returning();
    return { success: true, doudou };
  });

export const updateDoudouFn = createServerFn({ method: "POST" })
  .inputValidator(upsertSchema.extend({ id: z.string() }))
  .handler(async ({ data }): Promise<DoudouMutationResult> => {
    const [doudou] = await db
      .update(doudous)
      .set({
        label: data.label,
        emoji: data.emoji || null,
        imagePath: data.imagePath || null,
        promptHint: data.promptHint,
        imageHint: data.imageHint,
        ...(data.sort === undefined ? {} : { sort: data.sort }),
      })
      .where(and(eq(doudous.id, data.id), isNull(doudous.deletedAt)))
      .returning();
    if (!doudou) {
      return { success: false, error: "Doudou introuvable." };
    }
    return { success: true, doudou };
  });

/**
 * Soft delete — sets deletedAt, never removes the row, so any old story that
 * still references this id keeps resolving (and history reads the snapshot
 * anyway). No hard delete exists in the parent UI.
 */
export const deleteDoudouFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    await db
      .update(doudous)
      .set({
        deletedAt: new Date().toISOString().replace("T", " ").slice(0, 23),
      })
      .where(and(eq(doudous.id, data.id), isNull(doudous.deletedAt)))
      .run();
    return { success: true };
  });
