import type { PickerItem } from "~/components/picker-grid";

/** Minimal shape both a DB hero and a config hero (mapped) satisfy. */
interface HeroLike {
  id: string;
  label: string;
  emoji?: string | null;
}

/**
 * Map heroes (DB rows OR config entries) to picker items. A DB hero's emoji is
 * optional, so fall back to a calm child face rather than an empty tile.
 */
export function toHeroItems(heroes: HeroLike[]): PickerItem[] {
  return heroes.map((h) => ({
    id: h.id,
    label: h.label,
    emoji: h.emoji || "🧒",
  }));
}

/**
 * "au hasard" for the multi-select hero step: pick exactly ONE at random
 * (heroes are required, so never zero). Returns the chosen id in an array so it
 * slots straight into the `heroIds` state.
 */
export function pickRandomHeroIds(items: PickerItem[]): string[] {
  if (items.length === 0) {
    return [];
  }
  const item = items[Math.floor(Math.random() * items.length)];
  return [item.id];
}
