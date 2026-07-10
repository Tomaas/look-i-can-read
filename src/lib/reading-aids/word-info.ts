/**
 * Word-shape analysis shared by the liaison and silent-letter passes.
 * A raw token (whitespace-free) is decomposed into `lead / core / trail`
 * (surrounding punctuation vs the letters), plus normalized matching keys.
 * The original text is never mutated — every rule works on indices into
 * `core` so the renderer can re-emit the exact characters.
 */

export interface WordInfo {
  /** Original token text (no whitespace). */
  raw: string;
  /** Opening punctuation («, ", ( …). */
  lead: string;
  /** The word body: letters/digits plus internal apostrophes/hyphens. */
  core: string;
  /** Closing punctuation (.,!?…»). */
  trail: string;
  /** Matching key: core lowercased, typographic apostrophe → '. */
  norm: string;
  /** Last elision/hyphen segment of `norm` (l'histoire → histoire). */
  lastSeg: string;
  /** Start index of `lastSeg` within `core`/`norm`. */
  lastSegStart: number;
  hasDigit: boolean;
  /** Capitalized mid-sentence → proper noun (rules mostly skipped). */
  isProper: boolean;
}

const ALNUM = /[\p{L}\p{N}]/u;
const UPPER = /\p{Lu}/u;
const SENTENCE_END = /[.!?…]/;

function lastSegment(norm: string): { seg: string; start: number } {
  // Elision first (l'histoire → histoire), then hyphen (peut-être → être):
  // final-letter and initial-h rules only ever apply to the last piece.
  const apos = norm.lastIndexOf("'");
  const hyphen = norm.lastIndexOf("-");
  const start = Math.max(apos, hyphen) + 1;
  return { seg: norm.slice(start), start };
}

export function parseWord(raw: string, sentenceStart: boolean): WordInfo {
  let start = 0;
  while (start < raw.length && !ALNUM.test(raw.charAt(start))) {
    start++;
  }
  if (start === raw.length) {
    // Punctuation-only token («, !, — …): no word body at all.
    return {
      raw,
      lead: raw,
      core: "",
      trail: "",
      norm: "",
      lastSeg: "",
      lastSegStart: 0,
      hasDigit: false,
      isProper: false,
    };
  }
  let end = raw.length - 1;
  while (!ALNUM.test(raw.charAt(end))) {
    end--;
  }
  const core = raw.slice(start, end + 1);
  const norm = core.toLowerCase().replaceAll("’", "'");
  const { seg, start: segStart } = lastSegment(norm);
  return {
    raw,
    lead: raw.slice(0, start),
    core,
    trail: raw.slice(end + 1),
    norm,
    lastSeg: seg,
    lastSegStart: segStart,
    hasDigit: /\p{N}/u.test(core),
    isProper: UPPER.test(core.charAt(0)) && !sentenceStart,
  };
}

/** True when this token closes a sentence (its punctuation includes .!?…). */
export function endsSentence(info: WordInfo): boolean {
  return SENTENCE_END.test(info.trail) || SENTENCE_END.test(info.lead);
}
