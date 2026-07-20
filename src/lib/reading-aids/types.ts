/**
 * Reading-aid annotation types (lettres muettes + liaisons), the shared
 * contract between the pure rules pipeline (`annotateParagraph`) and the two
 * renderers (screen `HighlightableText`, print `PrintableDynamicStory`).
 *
 * Invariant: concatenating every token's `text` (and, inside a word, every
 * run's `text`) reproduces the original paragraph byte for byte — the aids
 * are pure styling metadata, never a text transformation.
 */

/** A run of consecutive characters sharing one silent/pronounced state. */
export interface LetterRun {
  silent: boolean;
  text: string;
}

export interface WordToken {
  kind: "word";
  /** Mandatory liaison to the NEXT word (arc over the following gap). */
  liaisonToNext: boolean;
  runs: LetterRun[];
  /** Original token text incl. punctuation — runs concatenate back to it. */
  text: string;
}

export interface GapToken {
  kind: "gap";
  /** True when this gap sits inside a liaison (carries the arc). */
  liaison: boolean;
  /** The literal whitespace between two words. */
  text: string;
}

export type AnnotatedToken = WordToken | GapToken;
