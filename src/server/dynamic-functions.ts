import { createServerFn } from "@tanstack/react-start";
import { and, asc, eq, isNotNull, isNull, lt, ne } from "drizzle-orm";
import { z } from "zod";
import { appConfig } from "~/config/app";
import { resolveImageModel } from "~/config/image-models";
import { imageStyleSuffix } from "~/config/style";
import { serverEnv } from "~/env";
import { db } from "~/server/db";
import {
  type SegmentChoice,
  type Story,
  type StorySegment,
  stories,
  storySegments,
} from "~/server/db/schema";
import { resolveDoudousForCreation } from "~/server/doudous-store";
import { resolveElementsForCreation } from "~/server/elements-store";
import { resolveHeroesForCreation } from "~/server/heroes-store";
import { resolvePlaceForCreation } from "~/server/places-store";
import { nanoBananaImageProvider } from "~/server/providers/image/nanobanana";
import {
  blobStoreHost,
  readStoredMediaBytes,
} from "~/server/providers/media-store";
import { sanitizeCustomPrompt } from "~/server/providers/text/custom-prompt";
import { doudouImageLine } from "~/server/providers/text/doudou-prompt";
import {
  anthropicDynamicProvider,
  generateStoryArc,
} from "~/server/providers/text/dynamic";
import {
  heroesImageLine,
  outfitImageLine,
} from "~/server/providers/text/hero-prompt";
import {
  type BeatHistoryEntry,
  type DynamicBeat,
  IMAGE_FAILED_SENTINEL,
  type ImageResult,
  resolveStoredImagePath,
} from "~/server/providers/types";
import { getFrozenStoryPromptContext } from "~/server/story-context";

// Max choice points per story. After the 4th chosen choice, the next beat is
// forced to be final. Was 5 — the TOTAL reading volume of a full story still
// tired a beginning reader even with the landing decrescendo.
const MAX_CHOICES = 4;

// Calm-tool guardrails (codex #2/#6), mirrored from functions.ts.
const HERO_CAP = 2;
const ELEMENT_CAP = 2;

const langSchema = z.enum(["fr", "ru"]).default("fr");

const startSchema = z.object({
  // Heroes REQUIRED + multi-select (≥1, ≤ cap). heroIds[0] is the primary.
  heroIds: z.array(z.string()).min(1).max(HERO_CAP),
  placeId: z.string(),
  // Elements REQUIRED + multi-select (≥1, ≤ cap).
  elementIds: z.array(z.string()).min(1).max(ELEMENT_CAP),
  // Optional comforting companions (multi-select) — empty/absent = no doudou.
  doudouIds: z.array(z.string()).optional(),
  lang: langSchema.optional(),
  customPrompt: z.string().max(500).optional(),
});

export type DynamicStartResult =
  | { success: true; storyId: string; segment: StorySegment }
  | { success: false; error: string };

export type DynamicContinueResult =
  | { success: true; segment: StorySegment }
  | { success: false; error: string };

// Server assigns stable choice ids; the model only ever emits labels.
function toChoices(labels: [string, string]): SegmentChoice[] {
  return [
    { id: "a", label: labels[0] },
    { id: "b", label: labels[1] },
  ];
}

/** Build the compact, complete ordered history for conditioning the next beat. */
function toHistory(segments: StorySegment[]): BeatHistoryEntry[] {
  const history: BeatHistoryEntry[] = [];
  for (const seg of segments) {
    if (!(seg.choices && seg.chosenChoiceId)) {
      continue; // unchosen / final beats don't contribute a decision
    }
    const chosen = seg.choices.find((c) => c.id === seg.chosenChoiceId);
    history.push({
      paragraphs: seg.paragraphs,
      offered: [seg.choices[0].label, seg.choices[1].label],
      chosenLabel: chosen?.label ?? seg.choices[0].label,
      // The prior beats' scenes condition the next sceneHint (time-of-day/
      // light continuity). Null on older segments → omitted from the prompt.
      sceneHint: seg.sceneHint ?? undefined,
    });
  }
  return history;
}

function beatToSegmentValues(beat: DynamicBeat) {
  return {
    paragraphs: beat.paragraphs,
    choices: beat.choices ? toChoices(beat.choices) : null,
    sceneHint: beat.sceneHint ?? null,
    status: "complete" as const,
  };
}

/**
 * Start a dynamic story: generate the opening beat, persist the story
 * (mode="dynamic") + segment 0, return both. Soft-fails to "On réessaie ?".
 */
export const startDynamicStoryFn = createServerFn({ method: "POST" })
  .inputValidator(startSchema)
  .handler(async ({ data }): Promise<DynamicStartResult> => {
    const lang = data.lang ?? serverEnv.defaultLang;
    // Heroes + elements DB-backed + editable + multi-select: resolve all chosen.
    const [heroes, elements, place, doudous] = await Promise.all([
      resolveHeroesForCreation(data.heroIds),
      resolveElementsForCreation(data.elementIds),
      resolvePlaceForCreation(data.placeId),
      resolveDoudousForCreation(data.doudouIds ?? []),
    ]);
    // HARD-FAIL on an empty resolve (codex #2).
    if (heroes.length === 0 || elements.length === 0 || !place) {
      return { success: false, error: "Choix invalide." };
    }

    const customPrompt = sanitizeCustomPrompt(data.customPrompt);

    // Hidden fil rouge, generated ONCE here and frozen on the story row so
    // every beat (incl. continuation/crash-resume) advances along one thread.
    // Best-effort: null on failure → the story generates arc-less, as before.
    const arcStartedAt = Date.now();
    console.log("[stories] arc gen START", {
      lang,
      heroes: heroes.length,
      elements: elements.length,
      doudous: doudous.length,
    });
    const arcResult = await generateStoryArc({
      heroes,
      place: { label: place.label, promptHint: place.promptHint },
      elements,
      doudous,
      lang,
      customPrompt: customPrompt ?? undefined,
    });
    const storyArc = arcResult?.arc ?? null;
    console.log("[stories] arc gen DONE", {
      ms: Date.now() - arcStartedAt,
      hasArc: storyArc != null,
      visualWorld: arcResult?.visualWorld ?? null,
      outfit: arcResult?.outfit ?? null,
    });

    const beatStartedAt = Date.now();
    console.log("[stories] beat gen START", {
      storyId: null,
      idx: 0,
      lang,
      mustEnd: false,
    });
    let beat: DynamicBeat;
    try {
      beat = await anthropicDynamicProvider.generateBeat({
        heroes,
        place: {
          id: data.placeId,
          label: place.label,
          emoji: "",
          promptHint: place.promptHint,
        },
        elements,
        lang,
        doudous,
        history: [],
        mustEnd: false,
        storyArc: storyArc ?? undefined,
        customPrompt: customPrompt ?? undefined,
      });
    } catch {
      // The provider already logged the per-attempt problems.
      console.error("[stories] beat gen FAILED", {
        storyId: null,
        idx: 0,
        ms: Date.now() - beatStartedAt,
      });
      return { success: false, error: "On réessaie ?" };
    }
    console.log("[stories] beat gen DONE", {
      storyId: null,
      idx: 0,
      ms: Date.now() - beatStartedAt,
    });

    const [story] = await db
      .insert(stories)
      .values({
        mode: "dynamic",
        lang,
        // Mirror the FIRST hero/element id into the NOT NULL legacy columns
        // (codex #2).
        heroId: heroes[0].id,
        placeId: data.placeId,
        elementId: elements[0].id,
        title: beat.title?.trim() || appConfig.storyLabel,
        paragraphs: [],
        storyArc,
        // Frozen with the arc (same call): the story's default illustration
        // ambiance. Null when arc gen soft-failed → image prompts as before.
        visualWorld: arcResult?.visualWorld ?? null,
        // Frozen with the arc (same call): the heroes' fixed wardrobe for every
        // illustration. Null when arc soft-failed / the outfit tripped its own
        // safety scan → image prompts keep prior clothing behavior.
        outfit: arcResult?.outfit ?? null,
        // Freeze the place snapshot + custom prompt so EVERY later beat
        // (continuation / crash-resume) re-prompts from the same frozen state.
        placeLabel: place.label,
        placePromptHint: place.promptHint,
        // Freeze the hero + element snapshot ARRAYS so EVERY later beat
        // re-prompts from them (immune to hero/element edits/deletes).
        heroSnapshots: heroes.map((h) => ({
          label: h.label,
          promptHint: h.promptHint,
          imageHint: h.imageHint,
        })),
        elementSnapshots: elements.map((e) => ({
          label: e.label,
          promptHint: e.promptHint,
        })),
        // Freeze the doudou snapshot ARRAY (empty when none chosen) so EVERY
        // later beat (continuation / crash-resume) re-prompts from it. Mirror
        // the FIRST doudou into the singular columns for back-compat readers.
        doudouSnapshots: doudous,
        doudouLabel: doudous[0]?.label ?? null,
        doudouPromptHint: doudous[0]?.promptHint ?? null,
        doudouImageHint: doudous[0]?.imageHint ?? null,
        customPrompt,
      })
      .returning();

    const [segment] = await db
      .insert(storySegments)
      .values({ storyId: story.id, idx: 0, ...beatToSegmentValues(beat) })
      .returning();

    // The id only exists post-insert; ties the START/DONE lines above (which
    // logged storyId=null) to the created story for grep-ability.
    console.log("[stories] story created", {
      storyId: story.id,
      title: story.title,
      hasArc: storyArc != null,
    });
    return { success: true, storyId: story.id, segment };
  });

/**
 * Continue from a chosen option. Idempotent against double-tap:
 *  - claim the current beat's choice with a CONDITIONAL update (only when
 *    chosen_choice_id IS NULL);
 *  - if the claim affects 0 rows (already chosen), return the already-generated
 *    next segment instead of generating again;
 *  - otherwise generate + persist the next beat, forcing the final beat once
 *    the 5th choice has been made.
 */
export const continueDynamicStoryFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ storyId: z.string(), choiceId: z.string() }))
  .handler(async ({ data }): Promise<DynamicContinueResult> => {
    const segments = await db
      .select()
      .from(storySegments)
      .where(eq(storySegments.storyId, data.storyId))
      .orderBy(asc(storySegments.idx));

    if (segments.length === 0) {
      return { success: false, error: "Histoire introuvable." };
    }

    // The "current" beat is the last COMPLETE segment that offers choices — the
    // one the child is choosing from. (A trailing `generating`/`error`
    // placeholder beyond it is the next beat being (re)generated — crash-resume.)
    const current = [...segments]
      .reverse()
      .find((s) => s.status === "complete" && s.choices);
    if (!current) {
      return { success: false, error: "Cette histoire est déjà terminée." };
    }
    if (!current.choices?.some((c) => c.id === data.choiceId)) {
      return { success: false, error: "Choix invalide." };
    }

    const nextIdx = current.idx + 1;

    // If the next beat already exists and is COMPLETE, this is a double-tap /
    // already-advanced call — return it, never regenerate. A `generating` or
    // `error` placeholder is NOT complete: fall through to (re)generate it
    // (crash-resume), reusing the choice already recorded — never re-ask.
    const findNext = async () => {
      const [next] = await db
        .select()
        .from(storySegments)
        .where(
          and(
            eq(storySegments.storyId, data.storyId),
            eq(storySegments.idx, nextIdx),
          ),
        );
      return next;
    };

    const preExisting = await findNext();
    if (preExisting && preExisting.status === "complete") {
      return { success: true, segment: preExisting };
    }

    // Conditional claim — only sets chosenChoiceId when it's still NULL, so a
    // double-tap that races past the check above can't claim twice.
    await db
      .update(storySegments)
      .set({ chosenChoiceId: data.choiceId })
      .where(
        and(
          eq(storySegments.id, current.id),
          isNull(storySegments.chosenChoiceId),
        ),
      )
      .run();

    const story = await db
      .select()
      .from(stories)
      .where(eq(stories.id, data.storyId))
      .then((r) => r[0]);
    if (!story) {
      return { success: false, error: "Histoire introuvable." };
    }
    // History path: hero/place/element FROZEN from the story's own snapshot (or
    // immutable config fallback) — never the live, editable DB rows. This
    // freezes them across ALL beats incl. crash-resume (codex #1, #4).
    const { heroes, place, elements, doudous } =
      getFrozenStoryPromptContext(story);
    if (heroes.length === 0 || elements.length === 0) {
      return { success: false, error: "Histoire introuvable." };
    }

    // Count persisted chosen choices (the claim above is now persisted). The
    // 5th choice ends the story: at 5 chosen choices the next beat must be final.
    const chosenCount = segments.filter(
      (s) => s.id === current.id || s.chosenChoiceId,
    ).length;
    const mustEnd = chosenCount >= MAX_CHOICES;

    // Reserve the next beat as `generating` with the pending choice, so a crash
    // mid-generation leaves a recoverable marker (status + pendingChoiceId).
    // Idempotent: UNIQUE(story_id, idx) means a racing caller can't double-insert
    // — on conflict we reuse the existing placeholder row.
    let placeholder = preExisting;
    if (placeholder) {
      await db
        .update(storySegments)
        .set({
          status: "generating",
          pendingChoiceId: data.choiceId,
          error: null,
        })
        .where(eq(storySegments.id, placeholder.id))
        .run();
    } else {
      const [created] = await db
        .insert(storySegments)
        .values({
          storyId: data.storyId,
          idx: nextIdx,
          paragraphs: [],
          choices: null,
          status: "generating",
          pendingChoiceId: data.choiceId,
        })
        .onConflictDoNothing()
        .returning();
      placeholder = created ?? (await findNext());
    }
    if (!placeholder) {
      return { success: false, error: "On réessaie ?" };
    }
    // Another caller already completed it between our checks.
    if (placeholder.status === "complete") {
      return { success: true, segment: placeholder };
    }

    // History reflects the just-made choice on `current`.
    const claimedSegments = segments.map((s) =>
      s.id === current.id ? { ...s, chosenChoiceId: data.choiceId } : s,
    );

    const beatStartedAt = Date.now();
    console.log("[stories] beat gen START", {
      storyId: data.storyId,
      idx: nextIdx,
      mustEnd,
      remainingChoices: Math.max(0, MAX_CHOICES - chosenCount),
    });
    let beat: DynamicBeat;
    try {
      beat = await anthropicDynamicProvider.generateBeat({
        heroes,
        place: {
          id: story.placeId,
          label: place.label,
          emoji: "",
          promptHint: place.promptHint,
        },
        elements,
        lang: story.lang as "fr" | "ru",
        // Frozen doudous, re-applied on every beat (continuation can't see the
        // original parcours choice — they come from the story's snapshot).
        doudous,
        history: toHistory(claimedSegments),
        mustEnd,
        // Frozen fil rouge (null on older stories → arc-less, as before).
        storyArc: story.storyArc ?? undefined,
        // Choices the child still has to make, COUNTING the one this new beat
        // offers (1 = this beat carries the last choice) — lets the prompt
        // prepare the landing instead of hitting the mustEnd wall.
        remainingChoices: Math.max(0, MAX_CHOICES - chosenCount),
        // Frozen saveur, re-applied on every beat (continuation can't see the
        // original parcours state — it must come from the persisted column).
        customPrompt: sanitizeCustomPrompt(story.customPrompt) ?? undefined,
      });
    } catch (err) {
      // The provider already logged the per-attempt problems.
      console.error("[stories] beat gen FAILED", {
        storyId: data.storyId,
        idx: nextIdx,
        ms: Date.now() - beatStartedAt,
      });
      // Mark the beat errored (recoverable) and soft-fail WITHOUT losing prior
      // segments — the UI retries this beat with the same choice.
      await db
        .update(storySegments)
        .set({
          status: "error",
          error: err instanceof Error ? err.message : "génération échouée",
        })
        .where(eq(storySegments.id, placeholder.id))
        .run();
      return { success: false, error: "On réessaie ?" };
    }

    const [segment] = await db
      .update(storySegments)
      .set({ ...beatToSegmentValues(beat), pendingChoiceId: null, error: null })
      .where(eq(storySegments.id, placeholder.id))
      .returning();
    console.log("[stories] beat gen DONE", {
      storyId: data.storyId,
      idx: nextIdx,
      ms: Date.now() - beatStartedAt,
      isFinal: beat.choices === null,
    });
    return { success: true, segment };
  });

/** A dynamic story plus its ordered segments (library replay, read-only). */
export const getDynamicStoryFn = createServerFn({ method: "GET" })
  .inputValidator(z.string())
  .handler(
    async ({
      data: storyId,
    }): Promise<{ story: Story; segments: StorySegment[] } | null> => {
      const [story] = await db
        .select()
        .from(stories)
        .where(eq(stories.id, storyId));
      if (!story) {
        return null;
      }
      const segments = await db
        .select()
        .from(storySegments)
        .where(eq(storySegments.storyId, storyId))
        .orderBy(asc(storySegments.idx));
      return { story, segments };
    },
  );

/**
 * Server-side single-flight: concurrent calls for the SAME `${storyId}:${idx}`
 * share ONE in-flight generation promise instead of each launching a billed
 * Gemini call. The DB `imagePath` check below only dedupes SEQUENTIAL calls
 * (the first write must have landed); concurrent calls all read `null` and would
 * each generate. The module singleton persists across requests in the dev single
 * process, closing that race. Cleared once the shared promise settles.
 */
const inFlightSegmentImages = new Map<string, Promise<ImageResult>>();

/**
 * Generate the illustration for ONE segment (only when IMAGE_ENABLED).
 * Idempotent: if this segment already has an image, no-op (prevents repeated
 * Gemini spend on route remounts). Fails soft — image is always optional.
 */
export const generateSegmentImageFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      storyId: z.string(),
      idx: z.number(),
      imageModel: z.string().optional(),
    }),
  )
  .handler(async ({ data }): Promise<ImageResult> => {
    const startedAt = Date.now();
    // Resolve the parent-picked model against the allowlist (loud fallback log
    // on an unknown id); the START log prints the RESOLVED model.
    const model = resolveImageModel(data.imageModel, serverEnv.imageModel);
    console.log("[stories] image gen START", {
      storyId: data.storyId,
      idx: data.idx,
      model,
      resolution: serverEnv.imageResolution,
    });
    if (!serverEnv.imageEnabled) {
      console.warn(
        "[stories] image gen SKIPPED — IMAGE_ENABLED is false (set IMAGE_ENABLED=true to enable)",
      );
      return { imagePath: null, imageStatus: "skipped" };
    }

    // Server-side single-flight: collapse concurrent calls for this segment onto
    // ONE generation promise so two requests racing past the DB `imagePath` check
    // (which only dedupes sequential calls) can't both bill Gemini.
    const key = `${data.storyId}:${data.idx}`;
    const existing = inFlightSegmentImages.get(key);
    if (existing) {
      console.warn("[stories] image gen deduped (already in-flight, server)", {
        key,
      });
      return existing;
    }
    const run = generateSegmentImage(data.storyId, data.idx, startedAt, model);
    inFlightSegmentImages.set(key, run);
    return run.finally(() => inFlightSegmentImages.delete(key));
  });

/**
 * Parent/child-triggered RETRY of a single beat's illustration after it landed
 * on the calm "no drawing today" (`__failed__`) state. Unlike the normal fetch
 * this is EXPLICIT and intentional: it clears ONLY the failure sentinel and
 * re-runs the exact same prompt-building + nanobanana gen + persist path, so the
 * one image can be re-attempted on demand. A real, already-stored image is never
 * overwritten (force is sentinel-only). Still gated behind IMAGE_ENABLED (the
 * single cost gate) and deduped through the same in-flight map as the normal
 * fetch, so a double-tap (or a racing background fetch) shares one billed call.
 */
export const retrySegmentImageFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      storyId: z.string(),
      idx: z.number(),
      imageModel: z.string().optional(),
    }),
  )
  .handler(async ({ data }): Promise<ImageResult> => {
    const startedAt = Date.now();
    const model = resolveImageModel(data.imageModel, serverEnv.imageModel);
    console.log("[stories] image RETRY START", {
      storyId: data.storyId,
      idx: data.idx,
      model,
      resolution: serverEnv.imageResolution,
    });
    if (!serverEnv.imageEnabled) {
      console.warn(
        "[stories] image retry SKIPPED — IMAGE_ENABLED is false (set IMAGE_ENABLED=true to enable)",
      );
      return { imagePath: null, imageStatus: "skipped" };
    }

    // Share the same single-flight slot as the normal fetch so a double-click —
    // or a retry racing a background fetch for this beat — collapses onto ONE
    // billed Gemini call rather than two.
    const key = `${data.storyId}:${data.idx}`;
    const existing = inFlightSegmentImages.get(key);
    if (existing) {
      console.warn(
        "[stories] image retry deduped (already in-flight, server)",
        {
          key,
        },
      );
      return existing;
    }
    const run = generateSegmentImage(
      data.storyId,
      data.idx,
      startedAt,
      model,
      true,
    );
    inFlightSegmentImages.set(key, run);
    return run.finally(() => inFlightSegmentImages.delete(key));
  });

/**
 * Resolve a prior illustration of the SAME story to use as the consistency
 * reference for the next one. Picks the EARLIEST renderable image (usually beat
 * 0) as the canonical character/style anchor — chaining each image off the
 * previous one would compound drift instead of preventing it.
 *
 * Returns a URL for blob-hosted media (the AI SDK fetches it), raw bytes for
 * local-disk media, or undefined (beat 0 / nothing renderable yet / read
 * failure) — in which case the caller falls back to plain text-to-image.
 *
 * The https branch is ALLOWLISTED to THIS app's Vercel Blob store host (exact
 * hostname when the token is configured, else the public-blob suffix) — a
 * stored path pointing anywhere else (a tampered row, a future write path) is
 * ignored rather than fetched server-side (SSRF defense-in-depth). Local paths
 * go through `readStoredMediaBytes`, which rejects anything escaping the
 * media dir.
 *
 * The blob bytes are DOWNLOADED HERE, inside the best-effort try/catch, with a
 * bounded timeout — never handed to the AI SDK as a URL. A deleted/unreachable
 * anchor blob must degrade to plain text-to-image for that beat, NOT throw
 * inside generateImage and persist the TERMINAL failure sentinel (which, since
 * every beat anchors on the same earliest image, would kill every later
 * illustration of the story with no working retry).
 */
const BLOB_HOST_SUFFIX = ".public.blob.vercel-storage.com";
const REFERENCE_FETCH_TIMEOUT_MS = 10_000;

async function resolveReferenceImage(
  storyId: string,
  idx: number,
): Promise<Uint8Array | URL | undefined> {
  if (idx <= 0) {
    return undefined;
  }
  try {
    // Earliest renderable prior image, filtered in SQL: one row, one column.
    const [anchor] = await db
      .select({ imagePath: storySegments.imagePath })
      .from(storySegments)
      .where(
        and(
          eq(storySegments.storyId, storyId),
          lt(storySegments.idx, idx),
          isNotNull(storySegments.imagePath),
          ne(storySegments.imagePath, IMAGE_FAILED_SENTINEL),
        ),
      )
      .orderBy(asc(storySegments.idx))
      .limit(1);
    const path = anchor?.imagePath;
    if (!path) {
      return undefined;
    }
    if (path.startsWith("https://")) {
      const url = new URL(path);
      const storeHost = blobStoreHost();
      const allowed = storeHost
        ? url.hostname === storeHost
        : url.hostname.endsWith(BLOB_HOST_SUFFIX);
      if (!allowed) {
        // Loud on purpose: a silent rejection here hid a prod bug (a
        // case-mismatched store host rejected the app's OWN blob URLs, disabling
        // every reference image). If this fires for our own host, it is a bug.
        console.warn(
          `[stories] reference image REJECTED by host allowlist for story ${storyId} idx=${idx}:` +
            ` ${url.hostname} not allowed (expected ${storeHost ?? `*${BLOB_HOST_SUFFIX}`}).`,
        );
        return undefined;
      }
      const res = await fetch(url, {
        signal: AbortSignal.timeout(REFERENCE_FETCH_TIMEOUT_MS),
      });
      if (!res.ok) {
        return undefined;
      }
      return new Uint8Array(await res.arrayBuffer());
    }
    return (await readStoredMediaBytes(path)) ?? undefined;
  } catch (error) {
    // Best-effort only: a missing local file / DB hiccup must never fail the
    // image itself — generate without a reference instead.
    console.warn(
      `[stories] reference image unavailable for story ${storyId} idx=${idx}:`,
      error instanceof Error ? error.message : String(error),
    );
    return undefined;
  }
}

/**
 * The actual segment-image generation, deduped by `generateSegmentImageFn` /
 * `retrySegmentImageFn`. `force` (retry only) clears a prior `__failed__`
 * sentinel so a settled failure can be re-attempted; a real stored image is
 * still treated as a no-op (never overwritten / re-billed).
 */
async function generateSegmentImage(
  storyId: string,
  idx: number,
  startedAt: number,
  model: string,
  force = false,
): Promise<ImageResult> {
  const [segment] = await db
    .select()
    .from(storySegments)
    .where(and(eq(storySegments.storyId, storyId), eq(storySegments.idx, idx)));
  if (!segment) {
    return { imagePath: null, imageStatus: "skipped" };
  }
  // A forced retry re-attempts ONLY a prior failure sentinel — a real stored
  // path is always a no-op (don't overwrite / re-bill an existing illustration).
  if (segment.imagePath && segment.imagePath !== IMAGE_FAILED_SENTINEL) {
    return resolveStoredImagePath(segment.imagePath);
  }
  if (segment.imagePath === IMAGE_FAILED_SENTINEL && !force) {
    // Idempotent no-op: the terminal failure sentinel → "failed" (a prior
    // attempt already failed — do NOT re-bill Gemini, do NOT re-hang the child;
    // the calm "no drawing" state is final for this beat unless explicitly
    // retried via `retrySegmentImageFn`).
    return resolveStoredImagePath(segment.imagePath);
  }

  const [story] = await db
    .select()
    .from(stories)
    .where(eq(stories.id, storyId));
  if (!story) {
    return { imagePath: null, imageStatus: "skipped" };
  }
  // History path: frozen snapshot, never the live editable rows.
  const { heroes, place, doudous, outfit } = getFrozenStoryPromptContext(story);

  // A prior illustration of THIS story, sent as an image input so characters/
  // style stay consistent across beats (best-effort — null on beat 0 / no
  // prior image / fetch failure → plain text-to-image, as before).
  const referenceImage = await resolveReferenceImage(storyId, idx);

  // The beat's OWN scene (emitted by the text model) wins over the story's
  // frozen starting place: once the story walks through the magic door, the
  // illustration must follow it — not stamp "aux États-Unis" on every page.
  let sceneLine = "";
  if (segment.sceneHint) {
    sceneLine = `La scène : ${segment.sceneHint}`;
  } else if (place.promptHint) {
    sceneLine = `La scène se passe ${place.promptHint}.`;
  }

  // Story-level visual world (time of day, season, weather, light), frozen at
  // creation. A DEFAULT ambiance, not an absolute order: the beat's own scene
  // keeps priority (a story that walks through a magic door into space must be
  // allowed to change its sky). Null on older stories → line omitted.
  const ambianceLine = story.visualWorld
    ? `Ambiance générale de l'histoire (sauf indication contraire de la scène) : ${story.visualWorld}.`
    : "";

  // Story-level frozen outfit (the heroes' wardrobe), a DEFAULT the reference
  // image overrides. Mainly anchors beat 0 (no reference yet) and non-default
  // heroes (no clothing in their imageHint). "" on older stories / safety drop
  // → line omitted, image built exactly as before.
  const outfitLine = outfitImageLine(outfit);

  // Feed the WHOLE beat's text (now 1–3 short sentences) so the page's image
  // reflects that full page, not just its first ~8-word sentence.
  const prompt = [
    // The reference anchors CHARACTER IDENTITY + STYLE only — never the decor.
    // The earlier "dans une NOUVELLE scène" wording let the model clone page
    // 1's backdrop on every page, so the illustrations never moved even when
    // the story did.
    referenceImage
      ? "Reprends EXACTEMENT les personnages de l'image fournie (visages, coiffures, vêtements, proportions) et son style — mais PAS son décor ni son cadrage. Dessine le lieu où l'histoire se trouve MAINTENANT (voir « La scène » ci-dessous), même s'il ne ressemble plus à celui de l'image fournie :"
      : "Illustration pour un bout d'une histoire d'enfant, tendre et rassurante.",
    segment.paragraphs.join(" "),
    sceneLine,
    ambianceLine,
    outfitLine,
    // Single hero → identical to the old `hero.imageHint`; multi → grouped.
    heroesImageLine(heroes),
    // Only the FIRST doudou appears in illustrations — 6 peluches per page
    // crowded every composition; the text still mentions them all.
    doudouImageLine(doudous.slice(0, 1)),
    imageStyleSuffix,
  ]
    .filter(Boolean)
    .join(" ");

  try {
    const imagePath = await nanoBananaImageProvider.generateImage(
      prompt,
      model,
      referenceImage,
    );
    await db
      .update(storySegments)
      .set({ imagePath })
      .where(eq(storySegments.id, segment.id));
    console.log("[stories] image gen DONE", {
      storyId,
      idx,
      ms: Date.now() - startedAt,
      imagePath,
    });
    return { imagePath, imageStatus: "ready" };
  } catch (error) {
    // Non-silent: log the real reason (model + story/segment + cause) so the
    // operator sees a Gemini billing/quota denial; the child gets a calm
    // "no drawing this time" state, never a hang.
    console.error(
      `[stories] segment image generation FAILED for story ${storyId} ` +
        `segment idx=${idx} (model=${model}, ` +
        `ms=${Date.now() - startedAt}): ` +
        (error instanceof Error ? error.message : String(error)),
    );
    // Persist the TERMINAL failure sentinel so this beat's image is settled:
    // future remounts / HMR reloads / reopens read it back as "failed" and never
    // re-attempt generation or re-hang on the waiting screen. Best-effort — a DB
    // write error here must not mask the original failure (still return failed).
    try {
      await db
        .update(storySegments)
        .set({ imagePath: IMAGE_FAILED_SENTINEL })
        .where(eq(storySegments.id, segment.id));
    } catch (markError) {
      console.error(
        `[stories] could not persist image-failed sentinel for story ${storyId} segment idx=${idx}:`,
        markError,
      );
    }
    return { imagePath: null, imageStatus: "failed" };
  }
}
