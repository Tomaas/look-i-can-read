import { createServerFn } from "@tanstack/react-start";
import { and, like, notInArray } from "drizzle-orm";
import { z } from "zod";
import type { FamilySettings, Operation } from "~/lib/operations";
import {
  FAMILLES,
  MAX_SERIE_SIZE,
  MIN_SERIE_SIZE,
  paliersByFamille,
  SKILL_KEY_PREFIX,
  settingsFromRows,
  skillKeyOf,
} from "~/lib/operations";
import { db } from "~/server/db";
import { mathSkills } from "~/server/db/schema";

/**
 * Settings of the "poser des calculs" mini-app — one row per ACTIVATED
 * operation family, keyed `calcul-pose:<famille>` (eng-review 1B): row
 * present = family activated (a tray on the child's shelf), row absent = the
 * family does not exist on screen (premise 3 — never a greyed tray). The
 * legacy single `calcul-pose` row is rewritten by data migration 0010.
 *
 * The palier is a MANUAL parent choice per family (eng-review T2-A) — these
 * functions only read/write it, they never evaluate the child or move the
 * palier on their own. The child-facing route additionally caches the last
 * known settings in localStorage (decision 2A) so a network outage never
 * shows an error to the child; that read-through happens client-side.
 *
 * All rows→settings logic lives in the PURE, golden-tested settingsFromRows
 * (decision 3A) — this file is a query plus a call.
 */

/**
 * House timestamp format — same idiom as the sibling *-functions.ts files
 * (space-separated, 23 chars). Note: the column DEFAULT (strftime, schema.ts)
 * additionally carries "+00" — both shapes coexist app-wide by convention.
 */
function nowSqlTimestamp(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 23);
}

export type MathSettings = FamilySettings;

export const getMathSettingsFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<MathSettings> => {
    const rows = await db
      .select()
      .from(mathSkills)
      .where(like(mathSkills.skill, `${SKILL_KEY_PREFIX}%`));
    // settingsFromRows carries every edge case (empty table → default
    // addition, dirty palier repaired within its family, serieSize clamped).
    return settingsFromRows(rows);
  },
);

const familleValues = FAMILLES as readonly [Operation, ...Operation[]];

const saveSchema = z.object({
  serieSize: z.number().int().min(MIN_SERIE_SIZE).max(MAX_SERIE_SIZE),
  familles: z
    .array(
      z
        .object({
          op: z.enum(familleValues),
          palier: z.string(),
        })
        // Validation croisée palier↔famille (eng-review T7) : une ligne
        // incohérente écrite « proprement » serait réparée en silence à la
        // lecture — un palier qui change dans le dos du parent. On refuse.
        .refine(
          (f) => paliersByFamille(f.op).some((p) => p.id === f.palier),
          "Palier hors de sa famille.",
        ),
    )
    // Garde-fou « impossible de tout désactiver » : l'UI bloque le dernier
    // interrupteur, le serveur refuse quand même (message côté parent
    // uniquement — l'enfant n'en voit jamais rien).
    .min(1, "Au moins une famille reste sur l'étagère.")
    .refine(
      (familles) => new Set(familles.map((f) => f.op)).size === familles.length,
      "Famille en double.",
    ),
});

export type MathSettingsMutationResult =
  | { success: true; settings: MathSettings }
  | { success: false; error: string };

export const saveMathSettingsFn = createServerFn({ method: "POST" })
  .inputValidator(saveSchema)
  .handler(async ({ data }): Promise<MathSettingsMutationResult> => {
    const keptKeys = data.familles.map((f) => skillKeyOf(f.op));
    try {
      // Un seul batch libSQL — atomique (eng-review, voix extérieure #5) :
      // jamais d'état transitoire où une famille a disparu sans sa
      // remplaçante. Upsert par famille activée + suppression des
      // désactivées (désactiver = supprimer la ligne, prémisse 5).
      await db.batch([
        db
          .delete(mathSkills)
          .where(
            and(
              like(mathSkills.skill, `${SKILL_KEY_PREFIX}%`),
              notInArray(mathSkills.skill, keptKeys),
            ),
          ),
        ...data.familles.map((famille) =>
          db
            .insert(mathSkills)
            .values({
              skill: skillKeyOf(famille.op),
              palier: famille.palier,
              serieSize: data.serieSize,
            })
            .onConflictDoUpdate({
              target: mathSkills.skill,
              set: {
                palier: famille.palier,
                serieSize: data.serieSize,
                updatedAt: nowSqlTimestamp(),
              },
            }),
        ),
      ]);
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Enregistrement impossible.",
      };
    }
    return {
      success: true,
      settings: {
        serieSize: data.serieSize,
        // Ré-émis dans l'ordre canonique, comme settingsFromRows le lirait.
        familles: FAMILLES.flatMap((op) => {
          const famille = data.familles.find((f) => f.op === op);
          return famille ? [{ op, palier: famille.palier }] : [];
        }),
      },
    };
  });
