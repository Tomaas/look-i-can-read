import { imageStyleSuffix } from "~/config/style";
import { doudouImageLine } from "~/server/providers/text/doudou-prompt";
import {
  heroesImageLine,
  outfitImageLine,
} from "~/server/providers/text/hero-prompt";
import type { DoudouContext, HeroContext } from "~/server/providers/types";

/**
 * The SEGMENT-IMAGE prompt builder — the image side's `buildPrompt`: every
 * piece of "what an illustration prompt contains" (scene · ambiance · outfit ·
 * heroes · doudou · style) lives HERE, in one pure golden-testable module
 * (test:golden pins its byte-identity), instead of being hand-assembled inline
 * in dynamic-functions. The caller keeps only DB read / persist / sentinel.
 */

/** The story-level fields the prompt reads (a `stories` row satisfies this). */
export interface SegmentImagePromptStory {
  // Story-level frozen illustration ambiance (time of day, season, weather,
  // light), generated with the arc. Null on older stories → line omitted.
  visualWorld: string | null;
}

/** The beat-level fields the prompt reads (a `story_segments` row satisfies
 * this). */
export interface SegmentImagePromptSegment {
  paragraphs: string[];
  // The beat's OWN scene (emitted by the text model). Null on older segments
  // → the frozen place hint is the fallback.
  sceneHint: string | null;
}

/** The frozen story context the prompt reads — `FrozenStoryContext` satisfies
 * this (structural subset: `elements` never drive the illustration). */
export interface SegmentImagePromptContext {
  doudous: DoudouContext[];
  heroes: HeroContext[];
  outfit: string | null;
  place: { label: string; promptHint: string };
}

/**
 * Assemble the illustration prompt for ONE segment. Pure string logic — no
 * env, no DB, no provider call. `hasReferenceImage` switches the opening
 * clause: with a reference, the model is told to reuse the characters/style
 * but NEVER the decor; without one (beat 0), it gets the plain tender-story
 * framing.
 */
export function buildSegmentImagePrompt(
  story: SegmentImagePromptStory,
  segment: SegmentImagePromptSegment,
  hasReferenceImage: boolean,
  frozen: SegmentImagePromptContext
): string {
  const { heroes, place, doudous, outfit } = frozen;

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
  return [
    // The reference anchors CHARACTER IDENTITY + STYLE only — never the decor.
    // The earlier "dans une NOUVELLE scène" wording let the model clone page
    // 1's backdrop on every page, so the illustrations never moved even when
    // the story did.
    hasReferenceImage
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
}
