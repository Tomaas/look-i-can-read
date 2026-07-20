/**
 * Word-shape analysis shared by the liaison and silent-letter passes.
 * A raw token (whitespace-free) is decomposed into `lead / core / trail`
 * (surrounding punctuation vs the letters), plus normalized matching keys.
 * The original text is never mutated — every rule works on indices into
 * `core` so the renderer can re-emit the exact characters.
 */

export interface WordInfo {
  /** The word body: letters/digits plus internal apostrophes/hyphens. */
  core: string;
  hasDigit: boolean;
  /** Capitalized mid-sentence → proper noun (rules mostly skipped). */
  isProper: boolean;
  /** Last elision/hyphen segment of `norm` (l'histoire → histoire). */
  lastSeg: string;
  /** Start index of `lastSeg` within `core`/`norm`. */
  lastSegStart: number;
  /** Opening punctuation («, ", ( …). */
  lead: string;
  /** Matching key: core lowercased, typographic apostrophe → '. */
  norm: string;
  /** Original token text (no whitespace). */
  raw: string;
  /** Closing punctuation (.,!?…»). */
  trail: string;
}

const ALNUM = /[\p{L}\p{N}]/u;
const UPPER = /\p{Lu}/u;
const DIGIT = /\p{N}/u;
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
    start += 1;
  }
  if (start === raw.length) {
    // Punctuation-only token («, !, — …): no word body at all.
    return {
      core: "",
      hasDigit: false,
      isProper: false,
      lastSeg: "",
      lastSegStart: 0,
      lead: raw,
      norm: "",
      raw,
      trail: "",
    };
  }
  let end = raw.length - 1;
  while (!ALNUM.test(raw.charAt(end))) {
    end -= 1;
  }
  const core = raw.slice(start, end + 1);
  const norm = core.toLowerCase().replaceAll("’", "'");
  const { seg, start: segStart } = lastSegment(norm);
  return {
    core,
    hasDigit: DIGIT.test(core),
    isProper: UPPER.test(core.charAt(0)) && !sentenceStart,
    lastSeg: seg,
    lastSegStart: segStart,
    lead: raw.slice(0, start),
    norm,
    raw,
    trail: raw.slice(end + 1),
  };
}

/** True when this token closes a sentence (its punctuation includes .!?…). */
export function endsSentence(info: WordInfo): boolean {
  return SENTENCE_END.test(info.trail) || SENTENCE_END.test(info.lead);
}
