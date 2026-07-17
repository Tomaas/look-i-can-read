import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  DEFAULT_PALIER_ID,
  DEFAULT_SERIE_SIZE,
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
  serieSize: z.number().int().min(1).max(6),
});

export type MathSettingsMutationResult =
  | { success: true; settings: MathSettings }
  | { success: false; error: string };

export const saveMathSettingsFn = createServerFn({ method: "POST" })
  .inputValidator(saveSchema)
  .handler(async ({ data }): Promise<MathSettingsMutationResult> => {
    const [existing] = await db
      .select()
      .from(mathSkills)
      .where(eq(mathSkills.skill, SKILL_KEY))
      .limit(1);
    if (existing) {
      await db
        .update(mathSkills)
        .set({
          palier: data.palier,
          serieSize: data.serieSize,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(mathSkills.id, existing.id));
    } else {
      await db.insert(mathSkills).values({
        skill: SKILL_KEY,
        palier: data.palier,
        serieSize: data.serieSize,
      });
    }
    return {
      success: true,
      settings: { palier: data.palier, serieSize: data.serieSize },
    };
  });
