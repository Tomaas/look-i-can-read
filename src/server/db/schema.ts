import { sql } from "drizzle-orm";
import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { generateId } from "~/lib/id-generator";

/**
 * Stories. Characters, places and elements are config files (see src/config/*),
 * not DB rows. A story stores the hero/place/element it was generated from by
 * id, plus the generated text and optional media paths.
 *
 * `mode` distinguishes a classic one-shot story ("classic", the title +
 * paragraphs + imagePath live on this row) from a choose-your-path story
 * ("dynamic", whose ordered beats live in `story_segments`). Existing rows
 * default to "classic" so they stay valid.
 */
export const stories = sqliteTable("stories", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => generateId("story")),
  mode: text("mode")
    .notNull()
    .default("classic")
    .$type<"classic" | "dynamic">(),
  lang: text("lang").notNull().default("fr"),
  heroId: text("hero_id").notNull(),
  placeId: text("place_id").notNull(),
  elementId: text("element_id").notNull(),
  // For classic stories, the title is set on generation. For dynamic stories
  // it is set from the opening beat.
  title: text("title").notNull(),
  // Classic: the full story text. Dynamic: empty array (text lives in segments).
  paragraphs: text("paragraphs", { mode: "json" }).notNull().$type<string[]>(),
  // Classic: the single illustration. Dynamic: per-segment (see story_segments).
  imagePath: text("image_path"),
  audioPath: text("audio_path"),
  // 1 = kept in the library, 0 = transient. Stories are auto-kept.
  kept: text("kept").notNull().default("1"),
  // Optional free-text "saveur" the child added at creation ("Tu veux ajouter
  // quelque chose ?"). Injected as subordinate flavour into EVERY generation for
  // this story (classic once, dynamic on every beat incl. continuation). Always
  // overridden by the calm/safety rules; null/empty = none.
  customPrompt: text("custom_prompt"),
  // Dynamic only: the hidden "fil rouge" generated once at creation (goal, 2-3
  // gentle milestones, ending image). NEVER shown to the child — injected into
  // every beat prompt so the story advances along one thread instead of
  // drifting episodically, and so the surprise element pays off before the end.
  // Null on older rows / when arc generation soft-failed → beats are generated
  // exactly as before (arc-less), no behavior break.
  storyArc: text("story_arc"),
  // Dynamic only: the story's "visual world" (time of day, season, weather,
  // light ambiance — one concrete sentence for the illustrator), generated in
  // the SAME call as the arc and frozen at creation. Injected into every
  // segment's IMAGE prompt as the story's DEFAULT ambiance (the beat's own
  // sceneHint still wins on location) so illustrations stop drifting from day
  // to night between pages. Null on older rows / arc soft-fail → image prompts
  // are built exactly as before.
  visualWorld: text("visual_world"),
  // Dynamic only: the heroes' outfit (the fixed wardrobe of every hero, one
  // concrete sentence), generated in the SAME call as the arc and frozen at
  // creation. Injected into every segment's IMAGE prompt as a DEFAULT the
  // reference image can override, so the characters stop changing clothes
  // between pages (esp. beat 0, which has no reference image yet). Scanned
  // independently of the arc — an unsafe wardrobe nulls only this field. Null
  // on older rows / arc soft-fail / safety drop → image prompts as before.
  outfit: text("outfit"),
  // ── History-safety snapshots (frozen at creation) ──────────────────────────
  // The place is the only EDITABLE entity, so its label + prompt hint are frozen
  // onto the row at creation. Every history re-prompt path (image regen, dynamic
  // continuation, segment image) reads these instead of the live DB place, so
  // editing/deleting a place never alters an already-created story.
  //
  // Hero + element are still resolved from their IMMUTABLE config files at
  // re-prompt time (they are not editable yet), so they need no snapshot today.
  // These columns are designed so hero/element snapshots can be added later when
  // those become editable — the frozen-context helper already centralises reads.
  // Null on pre-existing rows → the helper falls back to the IMMUTABLE legacy
  // config by id (never the editable DB row), keeping old stories identical.
  placeLabel: text("place_label"),
  placePromptHint: text("place_prompt_hint"),
  // ── Doudou snapshot (frozen at creation, all nullable) ──────────────────────
  // The optional comforting companion(s). Like the place, doudous are editable,
  // so their label + prompt/image hints are frozen onto the row at creation;
  // every history re-prompt path reads these, never the live editable doudou
  // row. Null = no doudou was chosen for this story → nothing injected.
  //
  // MULTI-DOUDOU: `doudouSnapshots` is the array of ALL chosen doudous and is
  // the source of truth for stories created from the multi-select picker. The
  // three singular columns are KEPT for back-compat: stories created during the
  // single-doudou period read them (null `doudouSnapshots`), and new rows also
  // mirror the FIRST doudou into them so any singular reader still resolves.
  // `getFrozenStoryPromptContext` prefers the array, falls back to the singular
  // columns, else no doudou — so old AND new rows render correctly.
  doudouLabel: text("doudou_label"),
  doudouPromptHint: text("doudou_prompt_hint"),
  doudouImageHint: text("doudou_image_hint"),
  doudouSnapshots: text("doudou_snapshots", { mode: "json" }).$type<
    Array<{ label: string; promptHint: string; imageHint: string }>
  >(),
  // ── Hero snapshot (frozen at creation, all nullable) ────────────────────────
  // Heroes became editable + MULTI-select. Like the doudou, each chosen hero's
  // label + prompt/image hints are frozen onto the row at creation; every history
  // re-prompt path reads `heroSnapshots`, never the live editable hero row.
  //
  // `heroSnapshots` is the array of ALL chosen heroes (hero[0] is the PRIMARY,
  // named-hard hero) and is the source of truth for stories created from the
  // multi-select picker. Null on rows created before this change → the frozen
  // helper falls back to the IMMUTABLE legacy config by `heroId`
  // (`src/config/characters.ts`) as a one-element array, so old stories render
  // identically. The existing NOT NULL `heroId` column still mirrors the FIRST
  // hero for back-compat readers + that config fallback.
  heroSnapshots: text("hero_snapshots", { mode: "json" }).$type<
    Array<{ label: string; promptHint: string; imageHint: string }>
  >(),
  // ── Element snapshot (frozen at creation, all nullable) ─────────────────────
  // Elements became editable + MULTI-select. Same shape as the hero snapshot
  // minus `imageHint` (elements never drive the illustration). Null on
  // pre-existing rows → config fallback by `elementId` (`src/config/elements.ts`)
  // as a one-element array. The NOT NULL `elementId` column mirrors the FIRST
  // element for that fallback.
  elementSnapshots: text("element_snapshots", { mode: "json" }).$type<
    Array<{ label: string; promptHint: string }>
  >(),
  createdAt: text("created_at").default(
    sql`(strftime('%Y-%m-%d %H:%M:%S.000+00', 'now'))`,
  ),
});

/** One choice offered to the child: a stable id + a short friendly label. */
export interface SegmentChoice {
  id: string;
  label: string;
}

/** Lifecycle of a beat. `complete` = text is persisted and final for replay. */
export type SegmentStatus = "ready" | "generating" | "complete" | "error";

/**
 * Ordered beats of a dynamic ("choose-your-path") story. Each segment holds its
 * own text + illustration, the two choices it OFFERS (null on the final beat),
 * and which choice the child picked (`chosenChoiceId`, null until picked / null
 * on the final beat). The path is fixed once made — reopening replays it
 * read-only. Classic stories have no segments.
 *
 * `status`/`pendingChoiceId`/`error` make the state machine crash-recoverable:
 * `continueDynamicStory` claims a beat by setting `chosenChoiceId` only when it
 * is NULL (idempotent against double-tap), records the next beat as `generating`
 * with the `pendingChoiceId`, and on reopen of a half-finished story can retry
 * the current beat without re-asking the child to choose.
 */
export const storySegments = sqliteTable(
  "story_segments",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateId("seg")),
    storyId: text("story_id")
      .notNull()
      .references(() => stories.id),
    // 0-based position in the path.
    idx: integer("idx").notNull(),
    paragraphs: text("paragraphs", { mode: "json" })
      .notNull()
      .$type<string[]>(),
    imagePath: text("image_path"),
    // Short visual description of THIS beat's scene, emitted by the text model
    // alongside the beat (where the action happens right now). The image prompt
    // prefers it over the story's frozen place hint, so an illustration follows
    // the story into a secret garden instead of stamping "Aux États-Unis" (US
    // flags…) on every page. Null on older rows → place-hint fallback.
    sceneHint: text("scene_hint"),
    // The 2 choices this beat offers, or null on the final beat.
    choices: text("choices", { mode: "json" }).$type<SegmentChoice[] | null>(),
    // Which offered choice the child picked (null until picked / final beat).
    chosenChoiceId: text("chosen_choice_id"),
    // The choice that led to (or is generating) this beat — used to recover a
    // beat whose generation was interrupted, without re-asking the child.
    pendingChoiceId: text("pending_choice_id"),
    status: text("status").notNull().default("complete").$type<SegmentStatus>(),
    error: text("error"),
    createdAt: text("created_at").default(
      sql`(strftime('%Y-%m-%d %H:%M:%S.000+00', 'now'))`,
    ),
  },
  (table) => [
    uniqueIndex("story_segments_story_idx").on(table.storyId, table.idx),
  ],
);

/**
 * Editable places (the "où se passe l'histoire ?" choices). Seeded idempotently
 * from the 6 immutable config places (`src/config/places.ts`), REUSING their
 * exact ids, so historical `stories.placeId` references keep resolving. A parent
 * manages these at `/parents/lieux`: add / edit / soft-delete (never hard
 * delete — `deletedAt` set, row kept so any old story id still resolves).
 *
 * Pickers read ACTIVE places (`deletedAt IS NULL`) live from here. History
 * re-prompt paths NEVER read this table — they use the story's frozen snapshot
 * (or the immutable config fallback) — so edits/deletes can't change old
 * stories. `src/config/places.ts` stays as the immutable legacy fallback.
 */
export const places = sqliteTable("places", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => generateId("place")),
  label: text("label").notNull(),
  emoji: text("emoji"),
  // Optional manual image path (no upload widget yet). Picker falls back to emoji.
  imagePath: text("image_path"),
  // Injected into the story prompt when this place is chosen at creation.
  promptHint: text("prompt_hint").notNull(),
  sort: integer("sort").notNull().default(0),
  // Soft delete — NULL = active. Never hard-deleted so old ids still resolve.
  deletedAt: text("deleted_at"),
  createdAt: text("created_at").default(
    sql`(strftime('%Y-%m-%d %H:%M:%S.000+00', 'now'))`,
  ),
});

/**
 * Editable doudous (the optional "avec quel doudou ?" companion choices). A
 * near-clone of `places`: seeded idempotently from the immutable config doudous
 * (`src/config/doudous.ts`), REUSING their exact ids so historical references
 * keep resolving. A parent manages these at `/parents/doudous`: add / edit /
 * soft-delete (never hard delete — `deletedAt` set, row kept).
 *
 * The picker reads ACTIVE doudous (`deletedAt IS NULL`) live from here, but the
 * doudou is OPTIONAL — the child can skip it. History re-prompt paths NEVER read
 * this table — they use the story's frozen snapshot (or the immutable config
 * fallback) — so edits/deletes can't change old stories.
 */
export const doudous = sqliteTable("doudous", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => generateId("doudou")),
  label: text("label").notNull(),
  emoji: text("emoji"),
  // Optional manual image path (no upload widget yet). Picker falls back to emoji.
  imagePath: text("image_path"),
  // Injected into the story TEXT prompt when this doudou is chosen at creation.
  promptHint: text("prompt_hint").notNull(),
  // Injected into the IMAGE prompt so the doudou appears beside the hero.
  imageHint: text("image_hint").notNull(),
  sort: integer("sort").notNull().default(0),
  // Soft delete — NULL = active. Never hard-deleted so old ids still resolve.
  deletedAt: text("deleted_at"),
  createdAt: text("created_at").default(
    sql`(strftime('%Y-%m-%d %H:%M:%S.000+00', 'now'))`,
  ),
});

/**
 * Editable heroes (the "qui est le héros ?" choices). A near-clone of `doudous`
 * (it has the same image-hint role: the hero appears in the illustration),
 * seeded idempotently from the immutable config characters
 * (`src/config/characters.ts`), REUSING their exact ids so historical
 * `stories.heroId` references keep resolving. A parent manages these at
 * `/parents/heroes`: add / edit / soft-delete (never hard delete).
 *
 * NAMING: the config calls these fields `name`/`description`; the DB table uses
 * `label`/`promptHint` to stay structurally identical to doudous/places (one
 * mental model, one form). The seed maps name→label, description→promptHint.
 * `imageHint` is required here (NOT NULL) even though the config makes it
 * optional — the seed supplies a gentle default for config heroes lacking one.
 *
 * The picker reads ACTIVE heroes (`deletedAt IS NULL`) live from here; heroes
 * are REQUIRED (≥1 pick). History re-prompt paths NEVER read this table — they
 * use the story's frozen snapshot (or the immutable config fallback) — so
 * edits/deletes can't change old stories.
 */
export const heroes = sqliteTable("heroes", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => generateId("hero")),
  // The NAME shown to the child (config `name`).
  label: text("label").notNull(),
  emoji: text("emoji"),
  // Optional manual image path (no upload widget yet). Picker falls back to emoji.
  imagePath: text("image_path"),
  // The GUIDING DESCRIPTION injected into the story TEXT prompt (config `description`).
  promptHint: text("prompt_hint").notNull(),
  // Injected into the IMAGE prompt so the hero looks consistent (config `imageHint`).
  imageHint: text("image_hint").notNull(),
  sort: integer("sort").notNull().default(0),
  // Soft delete — NULL = active. Never hard-deleted so old ids still resolve.
  deletedAt: text("deleted_at"),
  createdAt: text("created_at").default(
    sql`(strftime('%Y-%m-%d %H:%M:%S.000+00', 'now'))`,
  ),
});

/**
 * Editable elements (the "et avec quoi ?" surprise-element choices). A clone of
 * `places` (no image-hint — elements never drive the illustration), seeded
 * idempotently from the immutable config elements (`src/config/elements.ts`),
 * REUSING their exact ids so historical `stories.elementId` references keep
 * resolving. A parent manages these at `/parents/elements`: add / edit /
 * soft-delete (never hard delete).
 *
 * Named `dbElements` (table name "elements") to avoid colliding with the config
 * `elements` array imported elsewhere. The picker reads ACTIVE elements live
 * from here; elements are REQUIRED (≥1 pick). History re-prompt paths NEVER read
 * this table — they use the story's frozen snapshot (or config fallback).
 */
export const dbElements = sqliteTable("elements", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => generateId("element")),
  label: text("label").notNull(),
  emoji: text("emoji"),
  // Optional manual image path (no upload widget yet). Picker falls back to emoji.
  imagePath: text("image_path"),
  // The GUIDING DESCRIPTION injected into the story TEXT prompt (config `promptHint`).
  promptHint: text("prompt_hint").notNull(),
  sort: integer("sort").notNull().default(0),
  // Soft delete — NULL = active. Never hard-deleted so old ids still resolve.
  deletedAt: text("deleted_at"),
  createdAt: text("created_at").default(
    sql`(strftime('%Y-%m-%d %H:%M:%S.000+00', 'now'))`,
  ),
});

/**
 * Settings of the "poser des calculs" mini-app, one row per skill key
 * (today a single key, "calcul-pose"). The palier is chosen MANUALLY by the
 * parent at /parents/calcul (eng-review decision T2-A: no automatic
 * progression, no comfort score, no evaluation of the child — the adult
 * decides the presentation, like the educator does in a Montessori class).
 * `palier` stores a palier id from src/lib/operations/progression.ts; an
 * unknown/stale id resolves to the first palier (resolvePalier), never errors.
 * `serieSize` is the length of the "série qui se range" (decision T4-A).
 */
export const mathSkills = sqliteTable(
  "math_skills",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => generateId("mathskill")),
    skill: text("skill").notNull(),
    palier: text("palier").notNull(),
    serieSize: integer("serie_size").notNull().default(3),
    updatedAt: text("updated_at").default(
      sql`(strftime('%Y-%m-%d %H:%M:%S.000+00', 'now'))`,
    ),
  },
  (table) => [uniqueIndex("math_skills_skill_idx").on(table.skill)],
);

export type Story = typeof stories.$inferSelect;
export type NewStory = typeof stories.$inferInsert;
export type StorySegment = typeof storySegments.$inferSelect;
export type NewStorySegment = typeof storySegments.$inferInsert;
// DB place row. Named `DbPlace` to avoid colliding with the config `Place`
// interface (src/config/places.ts), which stays the immutable legacy source.
export type DbPlace = typeof places.$inferSelect;
export type NewDbPlace = typeof places.$inferInsert;
// DB doudou row. Named `DbDoudou` to avoid colliding with the config `Doudou`
// interface (src/config/doudous.ts), which stays the immutable legacy source.
export type DbDoudou = typeof doudous.$inferSelect;
export type NewDbDoudou = typeof doudous.$inferInsert;
// DB hero row. Named `DbHero` to avoid colliding with the config `Character`
// interface (src/config/characters.ts), which stays the immutable legacy source.
export type DbHero = typeof heroes.$inferSelect;
export type NewDbHero = typeof heroes.$inferInsert;
// DB element row. Named `DbElement` to avoid colliding with the config
// `StoryElement` interface (src/config/elements.ts), the immutable legacy source.
export type DbElement = typeof dbElements.$inferSelect;
export type NewDbElement = typeof dbElements.$inferInsert;
