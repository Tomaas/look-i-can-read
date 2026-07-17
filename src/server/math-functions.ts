import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  DEFAULT_PALIER_ID,
  DEFAULT_SERIE_SIZE,
  MAX_SERIE_SIZE,
  MIN_SERIE_SIZE,
  PALIERS,
} from "~/lib/operations";
import { db } from "~/server/db";
import { mathSkills } from "~/server/db/schema";

/**
 * Settings of the "poser des calculs" mini-app. One skill key today.
 *
 * The palier is a MANUAL parent choice (eng-review T2-A) — these functions
 * only read/write it, they never evaluate the child or move the palier on
 * their own. The child-facing route additionally caches the last known
 * settings in localStorage (decision 2A) so a network outage never shows an
 * error to the child; that read-through happens client-side, not here.
 */
const SKILL_KEY = "calcul-pose";

/** House timestamp format — matches the strftime column default (schema.ts). */
function nowSqlTimestamp(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 23);
}

export interface MathSettings {
  palier: string;
  serieSize: number;
}

const DEFAULTS: MathSettings = {
  palier: DEFAULT_PALIER_ID,
  serieSize: DEFAULT_SERIE_SIZE,
};

export const getMathSettingsFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<MathSettings> => {
    const [row] = await db
      .select()
      .from(mathSkills)
      .where(eq(mathSkills.skill, SKILL_KEY))
      .limit(1);
    if (!row) {
      return DEFAULTS;
    }
    return { palier: row.palier, serieSize: row.serieSize };
  },
);

const saveSchema = z.object({
  palier: z
    .string()
    .refine((id) => PALIERS.some((p) => p.id === id), "Palier inconnu."),
  serieSize: z.number().int().min(MIN_SERIE_SIZE).max(MAX_SERIE_SIZE),
});

export type MathSettingsMutationResult =
  | { success: true; settings: MathSettings }
  | { success: false; error: string };

export const saveMathSettingsFn = createServerFn({ method: "POST" })
  .inputValidator(saveSchema)
  .handler(async ({ data }): Promise<MathSettingsMutationResult> => {
    try {
      // Single-statement upsert on the unique skill key: atomic (no
      // select-then-insert race) and one Turso roundtrip instead of two.
      await db
        .insert(mathSkills)
        .values({
          skill: SKILL_KEY,
          palier: data.palier,
          serieSize: data.serieSize,
        })
        .onConflictDoUpdate({
          target: mathSkills.skill,
          set: {
            palier: data.palier,
            serieSize: data.serieSize,
            updatedAt: nowSqlTimestamp(),
          },
        });
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Enregistrement impossible.",
      };
    }
    return {
      success: true,
      settings: { palier: data.palier, serieSize: data.serieSize },
    };
  });
