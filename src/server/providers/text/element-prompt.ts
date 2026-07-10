import type { ElementContext } from "~/server/providers/types";

/**
 * Surprise-element prompt fragment, shared by the classic + dynamic text
 * providers so the framing is identical. Elements are MULTI-select (cap 2) and
 * never drive the illustration (no image line).
 *
 * SINGLE-ELEMENT IDENTITY (codex #4): for exactly one element, the builder emits
 * BYTE-IDENTICAL output to the pre-multi single-element line, so an old
 * single-element story reads exactly as before. The golden test pins this.
 */

/**
 * The user-prompt line for the surprise element(s).
 * - 1 element → exactly `Élément surprise : ${promptHint}.` (identical to old).
 * - ≥2 → `Éléments surprise : …` joining each guiding description.
 */
export function elementsUserBlock(elements: ElementContext[]): string {
  const hints = elements.map((e) => e.promptHint).filter(Boolean);
  if (hints.length === 0) {
    return "";
  }
  if (hints.length === 1) {
    return `Élément surprise : ${hints[0]}.`;
  }
  const joined = `${hints.slice(0, -1).join(" ; ")} ; et ${hints.at(-1)}`;
  return `Éléments surprise : ${joined}.`;
}
