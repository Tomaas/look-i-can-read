import type { PickerItem } from "~/components/picker-grid";

/** Minimal shape both a DB doudou and a config doudou satisfy. */
interface DoudouLike {
  id: string;
  label: string;
  emoji?: string | null;
}

/**
 * Map doudous (DB rows OR config entries) to picker items. A DB doudou's emoji
 * is optional, so fall back to a calm teddy rather than an empty tile.
 */
export function toDoudouItems(doudous: DoudouLike[]): PickerItem[] {
  return doudous.map((d) => ({
    id: d.id,
    label: d.label,
    emoji: d.emoji || "🧸",
  }));
}

/**
 * "au hasard" for the multi-select doudou step: pick one or a couple at random
 * (never zero, never all of them — a gentle handful). Returns the chosen ids.
 */
export function pickRandomDoudouIds(items: PickerItem[]): string[] {
  if (items.length === 0) {
    return [];
  }
  // 1 doudou most of the time, sometimes 2 (when there are at least 2).
  const count = items.length > 1 && Math.random() < 0.4 ? 2 : 1;
  const shuffled = [...items].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((d) => d.id);
}
