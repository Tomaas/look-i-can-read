import type { PickerItem } from "~/components/picker-grid";

/** Minimal shape both a DB element and a config element satisfy. */
interface ElementLike {
  id: string;
  label: string;
  emoji?: string | null;
}

/**
 * Map elements (DB rows OR config entries) to picker items. A DB element's emoji
 * is optional, so fall back to a calm sparkle rather than an empty tile.
 */
export function toElementItems(elements: ElementLike[]): PickerItem[] {
  return elements.map((e) => ({
    id: e.id,
    label: e.label,
    emoji: e.emoji || "✨",
  }));
}

/**
 * "au hasard" for the multi-select element step: pick exactly ONE at random
 * (elements are required, so never zero). Returns the chosen id in an array.
 */
export function pickRandomElementIds(items: PickerItem[]): string[] {
  if (items.length === 0) {
    return [];
  }
  const item = items[Math.floor(Math.random() * items.length)];
  return [item.id];
}
