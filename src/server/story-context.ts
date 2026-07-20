import { findLegacyHero } from "~/config/characters";
import { findLegacyElement } from "~/config/elements";
import { findPlace } from "~/config/places";
import type { Story } from "~/server/db/schema";
import type {
  DoudouContext,
  ElementContext,
  HeroContext,
} from "~/server/providers/types";

/**
 * The frozen prompt context for an ALREADY-CREATED story.
 *
 * Codex must-do #1 + #2: every history re-prompt path (classic image regen,
 * dynamic continuation text, dynamic segment image) MUST resolve hero/place/
 * element through THIS helper — never through `findPlace(story.placeId)` against
 * the editable DB. After this change, `grep` for a history path reading the live
 * places table must come up empty.
 *
 * Resolution rules:
 *  - PLACE (editable): prefer the row's frozen snapshot (`placeLabel` /
 *    `placePromptHint`). If null (a story created before the snapshot columns
 *    existed), fall back to the IMMUTABLE legacy config by id
 *    (`src/config/places.ts`) — NOT the editable DB row, NOT the active-only
 *    list. So editing or soft-deleting a place never alters an old story.
 *  - DOUDOU (editable, OPTIONAL, MULTI): resolved purely from the row's frozen
 *    snapshot, which is self-contained — so a doudou edit/delete never touches
 *    an old story. Prefer the `doudouSnapshots` ARRAY (all chosen doudous, the
 *    multi-select source of truth); if it is null (a story created during the
 *    single-doudou period) fall back to the singular columns (`doudouLabel` /
 *    `doudouPromptHint` / `doudouImageHint`) as a one-element array; if those
 *    are also null, no doudou was chosen → `doudous` is empty and nothing is
 *    injected. (No config-by-id fallback: the doudou feature postdates the
 *    snapshot columns, so no doudou story can predate them.)
 *  - HERO + ELEMENT (editable, MULTI): resolved like the place — prefer the row's
 *    frozen snapshot ARRAY (`heroSnapshots` / `elementSnapshots`, the multi-select
 *    source of truth); if it is null (a story created before heroes/elements
 *    became editable + multi), fall back to the IMMUTABLE legacy config BY ID
 *    (`heroId` / `elementId`) as a ONE-element array — NOT the editable DB table,
 *    NOT the active-only list. So editing/deleting a hero/element never alters an
 *    old story. (Unlike doudous, heroes/elements existed as config before the
 *    snapshot columns, so the config-by-id fallback IS needed — codex #3.)
 */
export interface FrozenStoryContext {
  // Resolved doudous, frozen — EMPTY when the child chose no doudou. Callers
  // inject the prompt/image hints for each. Prefers the multi-select array
  // snapshot; falls back to the singular columns for single-doudou-era stories.
  doudous: DoudouContext[];
  // Resolved surprise elements, frozen. Like heroes: snapshot array → config
  // fallback by id as a one-element array → empty.
  elements: ElementContext[];
  // Resolved heroes, frozen — heroes[0] is the PRIMARY (named-hard) hero. Never
  // empty for a well-formed story (creation hard-fails on an empty resolve);
  // callers still treat an empty array gracefully.
  heroes: HeroContext[];
  // The story's frozen outfit (heroes' wardrobe), or null. Not editable and not
  // snapshotted per-entity — it is a single story-level column (like the
  // visual world), so it needs no fallback: null on older rows / arc soft-fail
  // / safety drop, in which case callers omit the outfit line.
  outfit: string | null;
  // Resolved place fields, frozen. `promptHint` may be "" if neither snapshot
  // nor a legacy-config id resolves (a deleted custom place on a pre-snapshot
  // row) — callers already treat an empty hint as "omit the scene line".
  place: { label: string; promptHint: string };
}

export function getFrozenStoryPromptContext(story: Story): FrozenStoryContext {
  const legacy = findPlace(story.placeId);
  // Prefer the frozen snapshot; fall back to immutable legacy config by id.
  const label = story.placeLabel ?? legacy?.label ?? "";
  const promptHint = story.placePromptHint ?? legacy?.promptHint ?? "";

  // Doudous are self-contained in the snapshot (no id column, no config
  // fallback). Prefer the multi-select array; else the singular columns (a
  // single-doudou-era story) as a one-element array; else none.
  let doudous: DoudouContext[];
  if (story.doudouSnapshots && story.doudouSnapshots.length > 0) {
    doudous = story.doudouSnapshots.map((d) => ({
      imageHint: d.imageHint ?? "",
      label: d.label ?? "",
      promptHint: d.promptHint ?? "",
    }));
  } else if (story.doudouPromptHint) {
    doudous = [
      {
        imageHint: story.doudouImageHint ?? "",
        label: story.doudouLabel ?? "",
        promptHint: story.doudouPromptHint,
      },
    ];
  } else {
    doudous = [];
  }

  // Heroes: prefer the snapshot ARRAY; else the immutable legacy config by
  // `heroId` as a one-element array; else empty (codex #3). A legacy hero with
  // no own imageHint already carries the gentle DEFAULT_HERO_IMAGE_HINT.
  let heroes: HeroContext[];
  if (story.heroSnapshots && story.heroSnapshots.length > 0) {
    heroes = story.heroSnapshots.map((h) => ({
      imageHint: h.imageHint ?? "",
      label: h.label ?? "",
      promptHint: h.promptHint ?? "",
    }));
  } else {
    const legacy = findLegacyHero(story.heroId);
    heroes = legacy
      ? [
          {
            imageHint: legacy.imageHint,
            label: legacy.label,
            promptHint: legacy.promptHint,
          },
        ]
      : [];
  }

  // Elements: same shape, minus imageHint.
  let elements: ElementContext[];
  if (story.elementSnapshots && story.elementSnapshots.length > 0) {
    elements = story.elementSnapshots.map((e) => ({
      label: e.label ?? "",
      promptHint: e.promptHint ?? "",
    }));
  } else {
    const legacy = findLegacyElement(story.elementId);
    elements = legacy
      ? [{ label: legacy.label, promptHint: legacy.promptHint }]
      : [];
  }

  return {
    doudous,
    elements,
    heroes,
    outfit: story.outfit ?? null,
    place: { label, promptHint },
  };
}
